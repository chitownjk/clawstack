// Quick test script for MXRoute SMTP sending
const nodemailer = require('nodemailer');

const SMTP_CONFIG = {
  host: 'blizzard.mxrouting.net',
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: 'agent@tiker.com',
    pass: 'lJpSqm9v4&YTz7dP',
  },
};

const taskId = '9fdd5abe-e5f0-4ae6-a639-7c643a0c9945';

async function testEmail() {
  console.log('[test-email] Creating transporter...');
  const transporter = nodemailer.createTransport(SMTP_CONFIG);

  console.log('[test-email] Verifying SMTP connection...');
  try {
    await transporter.verify();
    console.log('[test-email] ✅ SMTP connection verified!');
  } catch (error) {
    console.error('[test-email] ❌ SMTP verification failed:', error);
    return;
  }

  console.log('[test-email] Sending test email...');
  const mailOptions = {
    from: '"Tiker AI Assistant (Bonnie)" <agent@tiker.com>',
    to: 'jklauminzer@gmail.com',
    subject: 'Test Email from Tiker - Task #9fdd5abe',
    text: `Hi Jay!

This is a test email from Bonnie (your AI co-founder on the Pi5).

I'm testing the MXRoute SMTP integration for Tiker's email flow.

Task Details:
- Title: Testing email flow
- ID: ${taskId}
- Status: assigned
- Assigned to: Bonnie

If you reply to this email, it should thread back to the task as a comment!

Reply-To is set to: task-${taskId}@tiker.com

🔫 Bonnie`,
    replyTo: `task-${taskId}@tiker.com`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[test-email] ✅ Email sent successfully!');
    console.log('[test-email] Message ID:', info.messageId);
    console.log('[test-email] Response:', info.response);
    console.log('[test-email]');
    console.log('[test-email] Check your inbox: jklauminzer@gmail.com');
    console.log('[test-email] Reply to it and the reply should appear as a comment on the task!');
  } catch (error) {
    console.error('[test-email] ❌ Failed to send:', error);
  }
}

testEmail();
