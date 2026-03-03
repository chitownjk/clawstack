import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { simpleParser } from 'mailparser';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Force dynamic rendering (don't pre-render at build time)
export const dynamic = 'force-dynamic'

// Rate limiter: 10 requests per minute per IP
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
});

/**
 * Verify Cloudflare webhook signature
 */
function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;
  
  // Cloudflare uses HMAC-SHA256
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Inbound Email Webhook
 * 
 * Receives emails from Cloudflare Email Worker
 * Authenticated via webhook signature
 * Rate limited per IP
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
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429 }
        );
      }
    }

    // 2. Webhook signature verification
    const signature = req.headers.get('X-Webhook-Signature');
    const body = await req.text();
    const webhookSecret = process.env.CLOUDFLARE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('[inbound-email] CLOUDFLARE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    if (!verifyWebhookSignature(body, signature, webhookSecret)) {
      console.warn('[inbound-email] Invalid webhook signature:', ip);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 3. Parse and validate body
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { taskId, from, subject, rawEmail } = payload;

    // 4. Input validation
    if (!taskId || !from || !rawEmail) {
      console.error('[inbound-email] Missing required fields:', { taskId, from, subject });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID format' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(from)) {
      return NextResponse.json(
        { error: 'Invalid sender email format' },
        { status: 400 }
      );
    }

    // 5. Size limits
    if (rawEmail.length > 500000) { // 500KB max
      return NextResponse.json(
        { error: 'Email too large (max 500KB)' },
        { status: 413 }
      );
    }

    console.log('[inbound-email] Processing email:', { taskId, from, subject });

    // 6. Create Supabase client
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    
    if (!serviceRoleKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY');
    }
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );

    // 7. Look up task (verifies it exists and gets account_id for RLS)
    const { data: task, error: taskError } = await supabase
      .from('mc_tasks')
      .select('id, account_id, title')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      console.error('[inbound-email] Task not found:', taskId, taskError);
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // 8. Parse email
    const parsed = await simpleParser(rawEmail);
    
    // 9. Extract and clean body
    let emailBody = '';
    if (parsed.text) {
      emailBody = parsed.text.trim();
    } else if (parsed.html) {
      // Strip HTML tags for basic conversion
      emailBody = parsed.html.replace(/<[^>]*>/g, '').trim();
    }

    emailBody = cleanEmailBody(emailBody);

    if (!emailBody) {
      console.warn('[inbound-email] Empty email body after parsing');
      emailBody = '(No content)';
    }

    // 10. Extract sender info
    const senderName = parsed.from?.text || from;
    const senderEmail = extractEmail(from);

    console.log('[inbound-email] Parsed email:', {
      senderEmail,
      senderName,
      bodyLength: emailBody.length,
    });

    // 11. Create comment
    const { data: comment, error: commentError } = await supabase
      .from('mc_comments')
      .insert({
        account_id: task.account_id,
        task_id: taskId,
        agent_id: null,
        content: emailBody,
        external_author_email: senderEmail,
        external_author_name: senderName,
      })
      .select()
      .single();

    if (commentError) {
      console.error('[inbound-email] Failed to create comment:', commentError);
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      );
    }

    console.log('[inbound-email] Comment created:', comment.id);

    return NextResponse.json({
      success: true,
      commentId: comment.id,
      taskId,
      from: senderEmail,
    });
  } catch (error) {
    console.error('[inbound-email] Error processing email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Extract email address from various formats
 */
function extractEmail(fromField: string): string {
  const match = fromField.match(/<(.+?)>/);
  return match ? match[1] : fromField;
}

/**
 * Clean email body by removing signatures and quoted text
 */
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

    if (inQuotedSection) {
      continue;
    }

    cleanLines.push(line);
  }

  return cleanLines.join('\n').trim();
}

// Import crypto for HMAC
import crypto from 'crypto';
