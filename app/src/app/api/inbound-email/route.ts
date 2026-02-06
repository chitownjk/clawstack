import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { simpleParser } from 'mailparser';

/**
 * Inbound Email Webhook
 * 
 * Receives emails from Cloudflare Email Worker
 * Parses email content and creates comment on task
 * Tracks external participants
 */
export async function POST(req: NextRequest) {
  try {
    // Create Supabase client (must be inside function, not at module level)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Parse webhook payload from Cloudflare
    const body = await req.json();
    const { taskId, from, subject, rawEmail } = body;

    if (!taskId || !from || !rawEmail) {
      console.error('[inbound-email] Missing required fields:', { taskId, from, subject });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('[inbound-email] Processing email:', { taskId, from, subject });

    // Look up task
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

    // Parse email to extract body text
    const parsed = await simpleParser(rawEmail);
    
    // Extract plain text or HTML (prefer plain text)
    let emailBody = '';
    if (parsed.text) {
      emailBody = parsed.text.trim();
    } else if (parsed.html) {
      // Strip HTML tags for basic conversion
      emailBody = parsed.html.replace(/<[^>]*>/g, '').trim();
    }

    // Clean up email body
    // Remove common email signatures and quoted text
    emailBody = cleanEmailBody(emailBody);

    if (!emailBody) {
      console.warn('[inbound-email] Empty email body after parsing');
      emailBody = '(No content)';
    }

    // Extract sender name from email address
    const senderName = parsed.from?.text || from;
    const senderEmail = extractEmail(from);

    console.log('[inbound-email] Parsed email:', {
      senderEmail,
      senderName,
      bodyLength: emailBody.length,
    });

    // Create comment on task
    const { data: comment, error: commentError } = await supabase
      .from('mc_comments')
      .insert({
        account_id: task.account_id,
        task_id: taskId,
        agent_id: null, // External user, not an agent
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

    // Return success
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
 * "John Doe <john@example.com>" -> "john@example.com"
 * "john@example.com" -> "john@example.com"
 */
function extractEmail(fromField: string): string {
  const match = fromField.match(/<(.+?)>/);
  return match ? match[1] : fromField;
}

/**
 * Clean email body by removing signatures and quoted text
 */
function cleanEmailBody(body: string): string {
  // Split into lines
  const lines = body.split('\n');
  const cleanLines: string[] = [];
  let inQuotedSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect quoted sections (common patterns)
    if (
      trimmed.startsWith('>') ||
      trimmed.startsWith('On ') && trimmed.includes(' wrote:') ||
      trimmed.match(/^-{3,}/) || // Horizontal rules
      trimmed.match(/^_{3,}/)
    ) {
      inQuotedSection = true;
      continue;
    }

    // Detect signature markers
    if (
      trimmed === '--' ||
      trimmed.startsWith('Sent from') ||
      trimmed.startsWith('Get Outlook') ||
      trimmed.match(/^-{2,}\s*$/)
    ) {
      // Stop here, rest is signature
      break;
    }

    // If we're in quoted section, skip
    if (inQuotedSection) {
      continue;
    }

    // Keep this line
    cleanLines.push(line);
  }

  return cleanLines.join('\n').trim();
}
