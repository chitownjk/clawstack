# Tiker Product Design Review

*Recursive review from a design thinking perspective. Target: people who don't know AI well.*

---

## The Core Tension

Tiker has a strong foundational idea: a task board where AI agents do work for you. "Stop babysitting your AI tools" is a compelling pitch. But the product currently sits between two audiences -- developers who understand BYOK, API keys, and execution modes, and regular people who just want help getting things done. For the stated target (people who don't know AI), the product needs to collapse complexity and lead with outcomes, not infrastructure.

---

## What's Working

**The task board metaphor.** Non-technical people understand task boards. "Create a task, someone does it" is intuitive whether that someone is a person or an AI. The kanban view, drag-and-drop status changes, and multiple view modes (list, time, calendar) are solid.

**The agent concept.** Giving AI agents names, emoji, roles, and levels makes them feel like teammates rather than tools. This is the right abstraction for non-technical users.

**Realtime updates.** Supabase subscriptions mean the board updates live when agents work. This makes the product feel alive.

**The free tier with no agents.** A functional task board with zero AI is a smart entry point. People can use it as a normal todo app, see the agent slots sitting empty, and get curious.

---

## What Needs to Change

### 1. Kill BYOK (or Hide It Completely)

BYOK is the single biggest barrier for the target audience. "Bring your own key" requires knowing what an API key is, where to get one, how pricing works on the provider side, and which model to pick. That's five decisions before you've even created your first task.

Additionally, Anthropic now blocks third-party apps from using consumer subscription keys, which makes BYOK even more confusing -- users will try their Claude subscription credentials and hit errors.

**Recommendation:** Remove BYOK from onboarding entirely. Offer two paths: Free (no AI, manual task board) and Pro (AI included, one price). If you want to keep BYOK for developers, bury it in Settings > Advanced. Never show it to a first-time user.

### 2. Simplify to Two Plans

The current pricing has five tiers (Free, Free BYOK, Solo $19, Developer $49, Team $99). That's too many choices for someone who doesn't know AI. Decision fatigue kills conversion.

**Recommendation:**

- **Free**: Full task board, no AI agents. This competes with Todoist/Things but with the promise of AI when you're ready.
- **Pro ($19-29/mo)**: AI agents included. Generous limits. All integrations. This is where 90% of users should land.
- **Team ($99/mo)**: Multi-user. Only show this to people who ask about collaboration.

Remove Developer as a distinct tier. API access and webhooks can be features of Pro, or a separate "API Add-on" for the small percentage who need it.

### 3. Add Real-Time Chat (The Missing Mode)

Right now, Tiker is 100% async. You create a task, an agent works on it, you check back later. This works for some use cases ("research competitors in the CRM space") but fails for others ("help me write this email right now").

Every AI product needs both modes -- async for background work, synchronous for in-the-moment help. Without chat, users will keep a ChatGPT tab open alongside Tiker, which means Tiker isn't their single pane of glass.

**Recommendation:** Add a chat panel that opens from any task or from a global shortcut. The chat should:

- Be contextual: if you open chat from a task, the agent already knows what you're working on
- Support quick actions: "schedule this for Tuesday," "post this to LinkedIn," "send this as an email"
- Auto-log the conversation as comments on the relevant task, so async and sync stay connected
- Work as a standalone mode too ("Hey Tiker, what's on my plate today?")

This is how the "morning briefing" use case the user mentioned actually works: you open Tiker, there's a chat bubble saying "Good morning, here's what's on deck today" with your calendar and priorities summarized.

### 4. Make Integrations Usable, Not Just Connected

Right now, connecting Twitter or LinkedIn just stores an OAuth token. There's no UI surface to actually use that connection. If a user connects Twitter and then has no idea what to do with it, the integration is wasted.

Every connected integration should unlock a visible capability in the interface:

- **Twitter/X connected** -> Show a "Post" action on tasks. Show a "Social" tab in the sidebar with a simple scheduler (compose, pick date/time, post). Show Twitter mentions in the activity feed.
- **LinkedIn connected** -> Same "Post" action, same scheduler. "Share this update on LinkedIn" should be one click from a task.
- **Google Calendar connected** -> The calendar view should overlay Google Calendar events alongside Tiker tasks. Clicking an empty slot should let you create either a calendar event or a task (or both). The "what's on deck" morning briefing pulls from this.
- **Gmail connected** -> Show a "Send email" action on tasks. Let agents draft and send emails. Show relevant email threads in task context.
- **Slack connected** -> Show a "Post to Slack" action. Let agents post updates to channels. Pull in relevant Slack messages as task context.
- **Jira/Linear connected** -> Two-way sync. Tasks in Tiker should be able to create/update issues in Jira and vice versa. Don't make people manage the same work in two places.
- **GitHub connected** -> Show PR status on relevant tasks. Let agents create issues. Surface code review requests.

The pattern: every integration should have (a) an action users can trigger from tasks, (b) a feed of incoming activity, and (c) agent capabilities that use the integration automatically.

### 5. Rethink the Calendar View

The current calendar view is a weekly grid showing tasks by due date. That's useful but limited. The user's vision of a full calendar integration is much more powerful.

**Recommendation:** The calendar should be the hub for time-based work:

- Overlay Google Calendar events (meetings, appointments) alongside Tiker tasks
- Click any date/time to create a task or event
- Support recurring tasks natively ("check priorities every Monday at 9am," "weekly market scan on Fridays")
- Show a daily agenda view that combines calendar events + tasks + AI briefing
- This is where scheduled agent work lives: "Every Monday, scan competitors and post a summary"

The calendar becomes the answer to "what should I be doing right now?" which is the most common question people have when they open a productivity tool.

### 6. Build a Social Media Scheduler

Since you're adding Twitter, LinkedIn, and Instagram integrations, a basic scheduler is a natural feature that makes these integrations tangible:

- Compose a post (or have an agent draft one)
- Preview how it'll look on each platform
- Pick date and time to publish
- View a content calendar showing scheduled posts
- Track basic metrics after posting (likes, replies, reach)

This is a concrete, valuable feature that non-technical users immediately understand, and it directly uses the integrations you've wired up.

### 7. Simplify Onboarding

Current flow: Sign in > Pick from 5 plans > Configure execution mode > Set up 2FA for write access > Learn about patterns/hub/leaderboard.

That's too much for someone who "doesn't know AI well."

**Recommended flow:**

1. Sign in with Google (keep this, it's simple)
2. "What do you want to get done?" -- show 3-4 common use cases (manage tasks, schedule social posts, track projects, research topics). This isn't choosing a plan; it's telling Tiker what matters to you so it can set up relevant agents.
3. Land directly in Command with one pre-made task: "Welcome! Try creating your first task." Pre-populate an agent that introduces itself.
4. Free tier by default. Upgrade prompt only when they try to use an AI agent for the first time: "Want [Agent Name] to handle this? Start your free trial."

Remove 2FA as a requirement for write access on the free tier. It's a security feature that creates friction before users have anything worth protecting. Offer it as an option in settings.

### 8. Rethink the Agent Library

The current Agents page is a list with enable/disable toggles. For non-technical users, this feels like an IT admin panel.

**Recommendation:** Frame agents as "hiring for your team":

- Show agents as profile cards with clear descriptions of what they do ("I handle your social media," "I research companies," "I manage your inbox")
- Group by function: Communication, Research, Social Media, Project Management
- One-click "Add to team" instead of enable/disable toggles
- Show a "Your Team" section at the top of Command so you always see who's available
- When a user creates a task, suggest the right agent automatically ("Looks like a research task -- want Alex to handle it?")

### 9. Remove or Defer Community Features

Patterns, Hub, Leaderboard, Trust Tiers, Claim Codes -- these are community/marketplace features that make sense at scale but add cognitive load before the core product is sticky.

For the "doesn't know AI" audience, these concepts are confusing. "What's a pattern? Why does an agent have a trust tier? What's a claim code?"

**Recommendation:** Hide Hub, Leaderboard, and Patterns behind a "Community" section that's clearly optional. The main navigation should be: Command (your board), Calendar, Chat, Settings. That's it.

Bring back community features once you have enough users that a marketplace is meaningful.

### 10. The "What's On Deck" Daily Briefing

This is one of the strongest potential features for retention and should be a first-class experience, not just a scheduled task:

- Every morning (or whenever the user opens Tiker), show a briefing panel
- Combine: today's calendar events, overdue tasks, tasks agents completed overnight, relevant emails, social mentions
- Actionable: each item has quick actions (approve, reschedule, reply, dismiss)
- Customizable: users pick what sources feed into the briefing
- This is the "homepage" of Tiker for returning users -- not the kanban board (that's the workspace)

---

## What to Delete

- **Execution Mode settings page** -- users shouldn't think about infrastructure. If they're on Pro, Tiker picks the model. If they're on Free, there's no AI. BYOK is an advanced setting, not a page.
- **The whitepaper** -- for the target audience, nobody is reading a whitepaper. Replace with a simple "How it works" page with a video or animation.
- **Trust tiers and leaderboard** -- defer until you have community scale.
- **API documentation** -- move to a separate docs subdomain. Keep the app clean.
- **The "professional services" page** -- at this stage, handle enterprise inquiries through email or a simple contact form, not a dedicated page with pricing.

---

## Feature Priority (What to Build Next)

**Tier 1 -- Must have for "must-have" product:**

1. Real-time chat panel (contextual to tasks, supports quick actions)
2. Calendar integration with Google Calendar overlay
3. Daily briefing / "What's on deck" homepage
4. Simplified onboarding (2-step, free by default, upgrade on first AI use)
5. Simplified pricing (Free / Pro / Team)

**Tier 2 -- Makes integrations tangible:**

6. Social media scheduler (compose, schedule, calendar view of planned posts)
7. Email actions on tasks (draft, send, reply -- using Gmail integration)
8. Integration activity feeds (show Twitter mentions, Slack messages, emails in context)

**Tier 3 -- Polish and scale:**

9. Recurring tasks with cron-style scheduling
10. Agent suggestions ("This looks like a research task, want Maya to handle it?")
11. Two-way sync with Jira/Linear
12. Team features and shared boards

---

## The One-Line Test

A must-have product passes this test: can a user describe it to a friend in one sentence and the friend immediately wants it?

Current: "It's a task board where you assign work to AI agents" -- interesting but abstract.

Target: "It's like having a team of assistants that checks your calendar, handles your social media, drafts your emails, and tells you what to focus on every morning" -- that's a product people want.

The product is close. The infrastructure is solid. The shift is from "tool for managing AI" to "AI that manages things for you." The board is the workspace. The agents are the team. The integrations are their hands. The chat is how you talk to them. The calendar is where everything comes together.
