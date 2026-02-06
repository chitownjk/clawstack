/**
 * Email utilities for Tiker
 * Handles sending emails via MXRoute SMTP
 */

import nodemailer from 'nodemailer';

// MXRoute SMTP configuration
const SMTP_CONFIG = {
  host: 'blizzard.mxrouting.net',
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: 'agent@tiker.com',
    pass: process.env.MXROUTE_SMTP_PASSWORD || '',
  },
};

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport(SMTP_CONFIG);
  }
  return transporter;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  taskId?: string; // If provided, sets Reply-To to task email
}

/**
 * Send email via MXRoute SMTP
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const { to, subject, text, html, replyTo, taskId } = options;

  // Determine Reply-To address
  let replyToAddress = replyTo;
  if (taskId && !replyTo) {
    // Use task-specific email for threading
    replyToAddress = `task-${taskId}@tiker.com`;
  }

  const mailOptions = {
    from: '"Tiker AI Assistant" <agent@tiker.com>',
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    text,
    html,
    replyTo: replyToAddress,
  };

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail(mailOptions);
    console.log('[email] Sent successfully:', {
      messageId: info.messageId,
      to: mailOptions.to,
      subject,
    });
  } catch (error) {
    console.error('[email] Failed to send:', error);
    throw new Error(`Failed to send email: ${error}`);
  }
}

/**
 * Send email from task (with automatic Reply-To threading)
 */
export async function sendTaskEmail(
  taskId: string,
  to: string | string[],
  subject: string,
  body: string
): Promise<void> {
  await sendEmail({
    to,
    subject,
    text: body,
    taskId, // Automatically sets Reply-To for threading
  });
}

/**
 * Test SMTP connection
 */
export async function testSmtpConnection(): Promise<boolean> {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    console.log('[email] SMTP connection verified');
    return true;
  } catch (error) {
    console.error('[email] SMTP connection failed:', error);
    return false;
  }
}
