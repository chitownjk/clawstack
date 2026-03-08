// Action Registry: defines all quick actions and workflow templates
// Hardcoded for speed. DB-backed customization comes later.

export interface ActionFormField {
  name: string;
  type: 'text' | 'textarea' | 'url' | 'email' | 'datetime' | 'date' | 'time' | 'number' | 'select' | 'checkbox';
  label: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  defaultValue?: string | number | boolean;
  showIf?: string; // conditional field: show if this other field is truthy
  options?: { label: string; value: string }[];
}

export interface ActionDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  service: string;          // matches key in COMPOSIO_TOOLKITS
  category: 'quick' | 'workflow';
  aiDraft: boolean;         // whether AI generates a draft before posting
  aiPromptTemplate?: string;
  formFields: ActionFormField[];
  composioActionSlugs: string[]; // Composio action slugs with fallbacks
  sortOrder: number;
}

export interface WorkflowDefinition extends ActionDefinition {
  category: 'workflow';
  workflowConfig: {
    stepsDescription: string;
    defaultStepCount: number;
    delayBetweenSteps: string; // human readable
  };
}

// ─── Quick Actions ─────────────────────────────────────────

export const QUICK_ACTIONS: ActionDefinition[] = [
  {
    id: 'linkedin-post',
    name: 'LinkedIn Post',
    description: 'Share a post on your LinkedIn feed',
    icon: '💼',
    service: 'linkedin',
    category: 'quick',
    aiDraft: true,
    aiPromptTemplate: `Write a LinkedIn post about the following topic. Make it professional but conversational. Include 2-3 relevant hashtags at the end. Keep it under 1300 characters.

Topic: {{topic}}
{{#context}}Additional context: {{context}}{{/context}}

Write ONLY the post content, nothing else.`,
    formFields: [
      { name: 'topic', type: 'textarea', label: "What's on your mind?", placeholder: 'e.g., Lessons from launching our new product...', required: true },
      { name: 'context', type: 'text', label: 'Any extra context?', placeholder: 'Optional: tone, audience, key points...' },
    ],
    composioActionSlugs: ['LINKEDIN_CREATE_POST', 'LINKEDIN_ADD_POST', 'LINKEDIN_SHARE_POST', 'LINKEDIN_CREATE_SHARE'],
    sortOrder: 1,
  },
  {
    id: 'tweet',
    name: 'Tweet',
    description: 'Post a tweet to X',
    icon: '𝕏',
    service: 'twitter',
    category: 'quick',
    aiDraft: true,
    aiPromptTemplate: `Write a tweet about the following topic. Keep it under 280 characters. Make it punchy and engaging. Include 1-2 hashtags if appropriate.

Topic: {{topic}}
{{#context}}Additional context: {{context}}{{/context}}

Write ONLY the tweet text, nothing else.`,
    formFields: [
      { name: 'topic', type: 'textarea', label: "What's the tweet about?", placeholder: 'e.g., Just shipped a new feature...', required: true, maxLength: 280 },
      { name: 'context', type: 'text', label: 'Any extra context?', placeholder: 'Optional: tone, audience...' },
    ],
    composioActionSlugs: ['TWITTER_CREATE_TWEET', 'TWITTER_POST_TWEET', 'TWITTER_SEND_TWEET', 'TWITTER_CREATION_OF_A_POST'],
    sortOrder: 2,
  },
  {
    id: 'slack-message',
    name: 'Slack Message',
    description: 'Send a message to a Slack channel',
    icon: '💬',
    service: 'slack',
    category: 'quick',
    aiDraft: false,
    formFields: [
      { name: 'channel', type: 'text', label: 'Channel name', placeholder: 'e.g., #general', required: true },
      { name: 'message', type: 'textarea', label: 'Message', placeholder: 'Type your message...', required: true },
    ],
    composioActionSlugs: ['SLACK_SEND_MESSAGE', 'SLACK_POST_MESSAGE', 'SLACK_CHAT_POST_MESSAGE'],
    sortOrder: 3,
  },
  {
    id: 'email-draft',
    name: 'Draft Email',
    description: 'AI drafts an email, you review and send',
    icon: '✉️',
    service: 'gmail',
    category: 'quick',
    aiDraft: true,
    aiPromptTemplate: `Draft a professional email based on the following:

To: {{to}}
Subject hint: {{subject}}
{{#context}}Context: {{context}}{{/context}}

Write a clear, concise email. Include a subject line on the first line prefixed with "Subject: ", then a blank line, then the body. Keep it professional but warm.`,
    formFields: [
      { name: 'to', type: 'email', label: 'To', placeholder: 'recipient@email.com', required: true },
      { name: 'subject', type: 'text', label: 'What is this about?', placeholder: 'e.g., Follow up on our meeting', required: true },
      { name: 'context', type: 'textarea', label: 'Any details to include?', placeholder: 'Optional: key points, tone, attachments to mention...' },
    ],
    composioActionSlugs: ['GMAIL_CREATE_DRAFT', 'GMAIL_SEND_EMAIL', 'GMAIL_SEND_MESSAGE'],
    sortOrder: 4,
  },
  {
    id: 'calendar-event',
    name: 'Schedule Event',
    description: 'Create a calendar event',
    icon: '📅',
    service: 'google-calendar',
    category: 'quick',
    aiDraft: false,
    formFields: [
      { name: 'title', type: 'text', label: 'Event name', placeholder: 'e.g., Team standup', required: true },
      { name: 'date', type: 'date', label: 'Date', required: true },
      { name: 'startTime', type: 'time', label: 'Start time', required: true, defaultValue: '09:00' },
      { name: 'endTime', type: 'time', label: 'End time', required: true, defaultValue: '09:30' },
      { name: 'attendees', type: 'text', label: 'Attendees', placeholder: 'Optional: comma-separated emails' },
    ],
    composioActionSlugs: ['GOOGLECALENDAR_EVENTS_CREATE', 'GOOGLECALENDAR_CREATE_EVENT', 'GOOGLECALENDAR_QUICK_ADD'],
    sortOrder: 5,
  },
  {
    id: 'notion-page',
    name: 'Notion Page',
    description: 'Create a new page in Notion',
    icon: '📝',
    service: 'notion',
    category: 'quick',
    aiDraft: true,
    aiPromptTemplate: `Create content for a Notion page with the following title and topic.

Title: {{title}}
{{#context}}Context: {{context}}{{/context}}

Write well-structured content using markdown. Include headers, bullet points where appropriate, and keep it organized. Write ONLY the page content.`,
    formFields: [
      { name: 'title', type: 'text', label: 'Page title', placeholder: 'e.g., Meeting Notes - March 8', required: true },
      { name: 'context', type: 'textarea', label: 'What should be on this page?', placeholder: 'Optional: outline, key topics...' },
    ],
    composioActionSlugs: ['NOTION_CREATE_PAGE', 'NOTION_ADD_PAGE', 'NOTION_CREATE_A_NEW_PAGE'],
    sortOrder: 6,
  },
  {
    id: 'linear-issue',
    name: 'Linear Issue',
    description: 'Create an issue in Linear',
    icon: '📐',
    service: 'linear',
    category: 'quick',
    aiDraft: false,
    formFields: [
      { name: 'title', type: 'text', label: 'Issue title', placeholder: 'e.g., Fix login page redirect', required: true },
      { name: 'description', type: 'textarea', label: 'Description', placeholder: 'Describe the issue...' },
      { name: 'priority', type: 'select', label: 'Priority', options: [
        { label: 'Urgent', value: '1' },
        { label: 'High', value: '2' },
        { label: 'Medium', value: '3' },
        { label: 'Low', value: '4' },
      ]},
    ],
    composioActionSlugs: ['LINEAR_CREATE_ISSUE', 'LINEAR_CREATE_LINEAR_ISSUE'],
    sortOrder: 7,
  },
  {
    id: 'github-issue',
    name: 'GitHub Issue',
    description: 'Open an issue on GitHub',
    icon: '🐙',
    service: 'github',
    category: 'quick',
    aiDraft: false,
    formFields: [
      { name: 'repo', type: 'text', label: 'Repository', placeholder: 'e.g., owner/repo', required: true },
      { name: 'title', type: 'text', label: 'Issue title', placeholder: 'e.g., Bug: login fails on mobile', required: true },
      { name: 'body', type: 'textarea', label: 'Description', placeholder: 'Describe the issue...' },
    ],
    composioActionSlugs: ['GITHUB_CREATE_ISSUE', 'GITHUB_CREATE_AN_ISSUE', 'GITHUB_ISSUES_CREATE'],
    sortOrder: 8,
  },
  {
    id: 'jira-ticket',
    name: 'Jira Ticket',
    description: 'Create a Jira ticket',
    icon: '🗒️',
    service: 'jira',
    category: 'quick',
    aiDraft: false,
    formFields: [
      { name: 'project', type: 'text', label: 'Project key', placeholder: 'e.g., PROJ', required: true },
      { name: 'summary', type: 'text', label: 'Summary', placeholder: 'e.g., Update onboarding flow', required: true },
      { name: 'description', type: 'textarea', label: 'Description', placeholder: 'Describe the ticket...' },
    ],
    composioActionSlugs: ['JIRA_CREATE_ISSUE', 'JIRA_CREATE_JIRA_ISSUE'],
    sortOrder: 9,
  },
];

// ─── Workflow Templates ────────────────────────────────────

export const WORKFLOW_TEMPLATES: WorkflowDefinition[] = [
  {
    id: 'linkedin-post-sequence',
    name: 'LinkedIn Post Sequence',
    description: 'AI writes a series of posts on a theme, posted daily',
    icon: '📈',
    service: 'linkedin',
    category: 'workflow',
    aiDraft: true,
    aiPromptTemplate: `Create a series of {{numPosts}} LinkedIn posts about the following theme. Each post should build on the previous one, telling a cohesive story or exploring different angles. Make each post standalone but connected.

Theme: {{topic}}
{{#context}}Additional context: {{context}}{{/context}}
Number of posts: {{numPosts}}

Format your response as a JSON array of strings, each string being one complete post (including hashtags). Example:
["Post 1 content here #hashtag", "Post 2 content here #hashtag"]`,
    formFields: [
      { name: 'topic', type: 'textarea', label: 'What theme should the posts cover?', placeholder: 'e.g., 5 lessons from scaling a startup...', required: true },
      { name: 'context', type: 'text', label: 'Any extra context?', placeholder: 'Optional: audience, tone...' },
      { name: 'numPosts', type: 'number', label: 'How many posts?', defaultValue: 5, min: 2, max: 14 },
      { name: 'startDate', type: 'date', label: 'Start date', required: true },
      { name: 'postTime', type: 'time', label: 'Post time each day', defaultValue: '09:00' },
    ],
    composioActionSlugs: ['LINKEDIN_CREATE_POST', 'LINKEDIN_ADD_POST', 'LINKEDIN_SHARE_POST'],
    sortOrder: 1,
    workflowConfig: {
      stepsDescription: 'One post per day',
      defaultStepCount: 5,
      delayBetweenSteps: '24 hours',
    },
  },
  {
    id: 'tweet-storm',
    name: 'Tweet Storm',
    description: 'AI writes a thread of connected tweets, posted minutes apart',
    icon: '⚡',
    service: 'twitter',
    category: 'workflow',
    aiDraft: true,
    aiPromptTemplate: `Write a tweet storm (thread) of {{numTweets}} tweets about the following topic. Each tweet should be under 280 characters. The first tweet should hook the reader. Number each tweet (1/N format). Make them flow as a thread.

Topic: {{topic}}
{{#context}}Additional context: {{context}}{{/context}}
Number of tweets: {{numTweets}}

Format your response as a JSON array of strings. Example:
["1/3 First tweet here", "2/3 Second tweet here", "3/3 Final tweet here"]`,
    formFields: [
      { name: 'topic', type: 'textarea', label: 'What should the thread cover?', placeholder: 'e.g., Why we rebuilt our entire backend...', required: true },
      { name: 'context', type: 'text', label: 'Any extra context?', placeholder: 'Optional: tone, key points...' },
      { name: 'numTweets', type: 'number', label: 'How many tweets?', defaultValue: 5, min: 3, max: 10 },
    ],
    composioActionSlugs: ['TWITTER_CREATE_TWEET', 'TWITTER_POST_TWEET', 'TWITTER_SEND_TWEET'],
    sortOrder: 2,
    workflowConfig: {
      stepsDescription: 'One tweet every 2 minutes',
      defaultStepCount: 5,
      delayBetweenSteps: '2 minutes',
    },
  },
  {
    id: 'launch-day-blast',
    name: 'Launch Day Blast',
    description: 'Coordinated posts across LinkedIn and X for a launch',
    icon: '🚀',
    service: 'linkedin', // primary, but uses twitter too
    category: 'workflow',
    aiDraft: true,
    aiPromptTemplate: `Create launch day social content for both LinkedIn and Twitter/X.

What are you launching: {{topic}}
{{#context}}Additional context: {{context}}{{/context}}

Create:
1. A LinkedIn announcement post (professional, detailed, under 1300 chars)
2. A tweet announcement (punchy, under 280 chars)
3. A follow-up LinkedIn post for 4 hours later (share a key insight/feature)
4. A follow-up tweet for 4 hours later

Format as JSON:
{
  "linkedin_1": "...",
  "tweet_1": "...",
  "linkedin_2": "...",
  "tweet_2": "..."
}`,
    formFields: [
      { name: 'topic', type: 'textarea', label: 'What are you launching?', placeholder: 'e.g., Our new AI-powered dashboard...', required: true },
      { name: 'context', type: 'textarea', label: 'Key details', placeholder: 'Link, features, pricing, audience...' },
      { name: 'launchDate', type: 'date', label: 'Launch date', required: true },
      { name: 'launchTime', type: 'time', label: 'Launch time', defaultValue: '09:00' },
    ],
    composioActionSlugs: ['LINKEDIN_CREATE_POST', 'TWITTER_CREATE_TWEET'],
    sortOrder: 3,
    workflowConfig: {
      stepsDescription: 'LinkedIn + X posts at launch, then follow-ups 4h later',
      defaultStepCount: 4,
      delayBetweenSteps: '4 hours',
    },
  },
];

// ─── Helpers ───────────────────────────────────────────────

export function getAllActions(): ActionDefinition[] {
  return [...QUICK_ACTIONS, ...WORKFLOW_TEMPLATES];
}

export function getActionById(id: string): ActionDefinition | undefined {
  return getAllActions().find(a => a.id === id);
}

export function getActionsForService(service: string): ActionDefinition[] {
  return getAllActions().filter(a => a.service === service);
}

export function getAvailableActions(
  connectedServices: string[]
): { available: ActionDefinition[]; suggested: ActionDefinition[] } {
  const all = getAllActions();
  const available = all.filter(a => connectedServices.includes(a.service));
  const suggested = all.filter(a => !connectedServices.includes(a.service));
  return { available, suggested };
}

export function getQuickActions(connectedServices: string[]): ActionDefinition[] {
  return QUICK_ACTIONS
    .filter(a => connectedServices.includes(a.service))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getWorkflowTemplates(connectedServices: string[]): WorkflowDefinition[] {
  return WORKFLOW_TEMPLATES
    .filter(t => connectedServices.includes(t.service))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
