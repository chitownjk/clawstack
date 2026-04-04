import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { simpleParser } from 'mailparser';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { encrypt } from '@/lib/crypto';

// Force dynamic rendering (don't pre-render at build time)
export const dynamic = 'force-dynamic'

// Rate limiter: 10 requests per minute per IP
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
});

const TIKER_DOMAIN = 'tiker.com';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Verify Cloudflare webhook signature
 */
function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

/**
 * Extract the local part (before @) of an email address.
 */
function localPart(address: string): string {
  return address.split('@')[0].toLowerCase();
}

/**
 * Inbound Email Webhook
 *
 * Receives emails from the Cloudflare Email Worker.
 * Handles two recipient patterns:
 *
 *   task-{uuid}@tiker.com  → threads the email as a comment on an existing task
 *   {username}@tiker.com   → creates a new task in the account's inbox
 *
 * Authenticated via HMAC-SHA256 webhook signature.
 * Rate limited per IP.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting (skip for localhost)
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const isLocalhost = ip === '127.0.0.1' || ip === 'localhost' || ip.startsWith('127.');

    if (!isLocalhost) {
      const { success: rateLimitSuccess } = await ratelimit.limit(ip);
      if (!rateLimitSuccess) {
        console.warn('[inbound-email] Rate limit exceeded:', ip);
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
      }
    }

    // 2. Webhook signature verification + replay protection
    const signature = req.headers.get('X-Webhook-Signature');
    const timestamp = req.headers.get('X-Webhook-Timestamp');
    const body = await req.text();
    const webhookSecret = process.env.CLOUDFLARE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('[inbound-email] CLOUDFLARE_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (timestamp) {
      const ts = parseInt(timestamp, 10);
      const age = Math.abs(Date.now() - ts);
      if (isNaN(ts) || age > 5 * 60 * 1000) {
        console.warn('[inbound-email] Stale webhook timestamp:', { ip, age });
        return NextResponse.json({ error: 'Request expired' }, { status: 401 });
      }
    }

    if (!verifyWebhookSignature(body, signature, webhookSecret)) {
      console.warn('[inbound-email] Invalid webhook signature:', ip);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Parse body
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { from, subject, rawEmail, to, taskId } = payload as {
      from?: string;
      subject?: string;
      rawEmail?: string;
      to?: string;      // recipient address, e.g. username@tiker.com or task-uuid@tiker.com
      taskId?: string;  // legacy: explicit task UUID (omit `to` when using this)
    };

    if (!from || !rawEmail) {
      return NextResponse.json({ error: 'Missing required fields: from, rawEmail' }, { status: 400 });
    }

    if (!EMAIL_REGEX.test(from)) {
      return NextResponse.json({ error: 'Invalid sender email format' }, { status: 400 });
    }

    if (rawEmail.length > 500_000) {
      return NextResponse.json({ error: 'Email too large (max 500KB)' }, { status: 413 });
    }

    // 4. Determine routing mode
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    if (!serviceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);

    // Parse the raw email once — we'll use fields from this below
    const parsed = await simpleParser(rawEmail);
    let emailBody = '';
    if (parsed.text) {
      emailBody = cleanEmailBody(parsed.text.trim());
    } else if (parsed.html) {
      emailBody = cleanEmailBody(parsed.html.replace(/<[^>]*>/g, '').trim());
    }
    if (!emailBody) emailBody = '(No content)';

    const senderEmail = extractEmail(from);
    const senderName = parsed.from?.text || from;

    // Resolve the effective recipient from `to` or legacy `taskId`
    const recipient = (to ?? '').toLowerCase();
    const recipientLocal = localPart(recipient);

    // ------------------------------------------------------------------
    // Path A: task-{uuid}@tiker.com — thread the email on an existing task
    // ------------------------------------------------------------------
    const taskIdFromRecipient = recipientLocal.startsWith('task-')
      ? recipientLocal.slice('task-'.length)
      : null;

    const effectiveTaskId =
      (taskIdFromRecipient && UUID_REGEX.test(taskIdFromRecipient) ? taskIdFromRecipient : null)
      ?? (taskId && UUID_REGEX.test(taskId as string) ? (taskId as string) : null);

    if (effectiveTaskId) {
      console.log('[inbound-email] Threading email on task:', effectiveTaskId);

      const { data: task, error: taskError } = await supabase
        .from('mc_tasks')
        .select('id, account_id')
        .eq('id', effectiveTaskId)
        .single();

      if (taskError || !task) {
        console.error('[inbound-email] Task not found:', effectiveTaskId);
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }

      const { data: comment, error: commentError } = await supabase
        .from('mc_comments')
        .insert({
          account_id: task.account_id,
          task_id: effectiveTaskId,
          agent_id: null,
          content: emailBody,
          external_author_email: senderEmail,
          external_author_name: senderName,
        })
        .select()
        .single();

      if (commentError) {
        console.error('[inbound-email] Failed to create comment:', commentError);
        return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
      }

      console.log('[inbound-email] Comment created:', comment.id);
      return NextResponse.json({ success: true, mode: 'task_thread', commentId: comment.id, taskId: effectiveTaskId, from: senderEmail });
    }

    // ------------------------------------------------------------------
    // Path B: {username}@tiker.com — create a new task in personal inbox
    // ------------------------------------------------------------------
    const isPersonalInbox =
      recipient.endsWith(`@${TIKER_DOMAIN}`) &&
      recipientLocal.length > 0 &&
      !recipientLocal.startsWith('task-');

    if (!isPersonalInbox) {
      console.warn('[inbound-email] Could not determine routing for recipient:', recipient);
      return NextResponse.json({ error: 'Cannot route email: unrecognized recipient format' }, { status: 422 });
    }

    const tikerUsername = recipientLocal;
    console.log('[inbound-email] Creating task for username:', tikerUsername);

    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id')
      .eq('tiker_username', tikerUsername)
      .single();

    if (accountError || !account) {
      console.warn('[inbound-email] No account for tiker_username:', tikerUsername);
      // Return 200 so Cloudflare does not retry — the inbox simply doesn't exist yet
      return NextResponse.json({ success: false, reason: 'unknown_recipient' }, { status: 200 });
    }

    const taskTitle = (typeof subject === 'string' && subject.trim())
      ? subject.trim().slice(0, 200)
      : `Email from ${senderEmail}`;

    const { data: newTask, error: taskCreateError } = await supabase
      .from('mc_tasks')
      .insert({
        account_id: account.id,
        title: encrypt(taskTitle),
        description: encrypt(
          `From: ${senderEmail}\n\n${emailBody}`
        ),
        status: 'inbox',
        priority: 'medium',
        tags: ['email'],
        source: 'email',
        source_email: senderEmail,
      })
      .select('id')
      .single();

    if (taskCreateError || !newTask) {
      console.error('[inbound-email] Failed to create task:', taskCreateError);
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }

    console.log('[inbound-email] Task created from personal inbox email:', newTask.id);
    return NextResponse.json({
      success: true,
      mode: 'personal_inbox',
      taskId: newTask.id,
      from: senderEmail,
    });
  } catch (error) {
    console.error('[inbound-email] Error processing email:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractEmail(fromField: string): string {
  const match = fromField.match(/<(.+?)>/);
  return match ? match[1] : fromField;
}

function cleanEmailBody(body: string): string {
  const lines = body.split('\n');
  const cleanLines: string[] = [];
  let inQuotedSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (
      trimmed.startsWith('>') ||
      (trimmed.startsWith('On ') && trimmed.includes(' wrote:')) ||
      trimmed.match(/^-{3,}/) ||
      trimmed.match(/^_{3,}/)
    ) {
      inQuotedSection = true;
      continue;
    }

    if (
      trimmed === '--' ||
      trimmed.startsWith('Sent from') ||
      trimmed.startsWith('Get Outlook') ||
      trimmed.match(/^-{2,}\s*$/)
    ) {
      break;
    }

    if (inQuotedSection) continue;
    cleanLines.push(line);
  }

  return cleanLines.join('\n').trim();
}

import crypto from 'crypto';
