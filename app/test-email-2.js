// Test email for task 787c01c1-5af1-4607-b820-00ae7dc5e9b9
const nodemailer = require('nodemailer');

const SMTP_CONFIG = {
  host: 'blizzard.mxrouting.net',
  port: 587,
  secure: false,
  auth: {
    user: 'agent@tiker.com',
    pass: 'lJpSqm9v4&YTz7dP',
  },
};

const taskId = '787c01c1-5af1-4607-b820-00ae7dc5e9b9';

async function sendTestEmail() {
  console.log('[test] Sending email for task:', taskId);
  
  const transporter = nodemailer.createTransport(SMTP_CONFIG);
  
  const mailOptions = {
    from: '"Tiker AI Assistant (Bonnie)" <agent@tiker.com>',
    to: 'jklauminzer@gmail.com',
    subject: 'Testing Email Flow - Task on testcloud',
    text: `Hi Jay!

This is test #2 for the email integration.

Task Details (on testcloud.tiker.com):
- Title: Testing email flow
- ID: ${taskId}
- Status: inbox
- Assigned to: Unassigned

🔬 THE TEST:

Reply to this email with anything (e.g., "Got it, this is my reply test").

Your reply should:
1. Go to: task-${taskId}@tiker.com
2. Get caught by Cloudflare Email Worker
3. POST to testcloud.tiker.com/api/inbound-email
4. Create a comment on the task with your external email

Then we'll check the task on testcloud to see if the comment appeared!

🔫 Bonnie
Testing from the Pi5`,
    replyTo: `task-${taskId}@tiker.com`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[test] ✅ Email sent!');
    console.log('[test] Message ID:', info.messageId);
    console.log('[test] Reply-To:', `task-${taskId}@tiker.com`);
    console.log('[test]');
    console.log('[test] Now reply to the email and check testcloud for the comment!');
  } catch (error) {
    console.error('[test] ❌ Failed:', error);
  }
}

sendTestEmail();
