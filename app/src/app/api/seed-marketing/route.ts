/**
 * TEMPORARY: One-shot seeding endpoint for marketing tasks.
 * DELETE THIS FILE after running once.
 *
 * Hit GET /api/seed-marketing?secret=tiker-seed-2026 to seed tasks.
 */

import { createClient } from '@supabase/supabase-js'
import { encrypt } from '@/lib/crypto'
import { NextResponse } from 'next/server'

const SEED_SECRET = 'tiker-seed-2026'

interface TaskDef {
  title: string
  description: string
  tags: string[]
  priority: 'now' | 'soon' | 'later'
  due_offset_days: number
  agent_name?: string
}

const MARKETING_TASKS: TaskDef[] = [
  // WEEK 1: Foundation (Days 1-4)
  {
    title: 'Clean up GitHub README with compelling hero image and quick-start',
    description: `Rewrite the GitHub README for marketing impact:
- Add a compelling hero image/screenshot showing the command center
- Write a clear 2-sentence value prop at the top
- Add quick-start guide (3 steps to running locally)
- Add "Star this repo" CTA
- Add badges (MIT license, build status, etc.)
- Add CONTRIBUTING.md with contribution guidelines
- Make self-hosting angle prominent`,
    tags: ['marketing', 'github', 'foundation'],
    priority: 'now',
    due_offset_days: 2,
    agent_name: 'Writer',
  },
  {
    title: 'Record 60-second Loom demo of Tiker in action',
    description: `Record a short, punchy demo video showing:
1. The multi-window chaos problem (show 5 terminals/AI windows)
2. Creating a task in Tiker (10 sec)
3. Assigning to an agent (5 sec)
4. Agent working + result appearing (10 sec)
5. The clean command center view (5 sec)

Keep it under 60 seconds. No fancy editing needed. Authentic > polished.
Upload to Loom (free tier). This video will be used for Product Hunt, social, and the landing page.`,
    tags: ['marketing', 'video', 'foundation'],
    priority: 'now',
    due_offset_days: 3,
  },
  {
    title: 'Write blog post: "Why Your AI Tools Are Fighting Each Other"',
    description: `SEO-targeted blog post for tiker.com/blog.

Target keywords: "manage multiple AI agents", "AI tool chaos", "AI coordination"

Structure:
- Hook: "You have 5 AI tools open. None of them know what the others are doing."
- The problem: context fragmentation, duplicated work, no visibility
- Why chat interfaces make it worse (stateless, siloed)
- The task-board alternative (introduce the concept, not hard-sell Tiker)
- CTA: link to Tiker repo

Tone: Developer-friendly, slightly irreverent. 800-1200 words.
Include a before/after screenshot comparison.`,
    tags: ['marketing', 'blog', 'seo', 'content'],
    priority: 'soon',
    due_offset_days: 3,
    agent_name: 'Writer',
  },
  {
    title: 'Write blog post: "Chat Windows vs Task Boards: The Case for Async AI"',
    description: `SEO-targeted blog post positioning the async task-board model.

Target keywords: "async AI workflow", "AI task board", "AI agent dashboard"

Structure:
- The chat paradigm: real-time, synchronous, one-thread-at-a-time
- Why chat breaks down at scale (multiple agents, multiple tasks)
- The task-board paradigm: async, parallel, persistent context
- Concrete examples of workflows that benefit (research > write, code > test > deploy)
- Why "assign and forget" is more productive than "chat and wait"

Tone: Thought-leadership, not salesy. 800-1200 words.`,
    tags: ['marketing', 'blog', 'seo', 'content'],
    priority: 'soon',
    due_offset_days: 4,
    agent_name: 'Writer',
  },
  {
    title: 'Submit Tiker to awesome-* GitHub lists',
    description: `Submit pull requests to relevant awesome-lists on GitHub:

- awesome-selfhosted (https://github.com/awesome-selfhosted/awesome-selfhosted)
- awesome-ai-agents
- awesome-developer-tools
- awesome-open-source
- awesome-nextjs

For each: follow their contribution guidelines, write a concise description that matches the list's style. Link to the GitHub repo, not the marketing site.

Also submit to:
- AlternativeTo.net (as alternative to Notion AI, Linear, etc.)
- OpenSourceAlternative.to`,
    tags: ['marketing', 'github', 'distribution'],
    priority: 'later',
    due_offset_days: 4,
    agent_name: 'Researcher',
  },
  {
    title: 'Set up Tiker blog infrastructure at /blog',
    description: `Create a minimal blog setup on tiker.com/blog:
- MDX or markdown-based (Next.js compatible)
- Clean, minimal design matching Tiker's aesthetic
- RSS feed for syndication
- Basic SEO: meta tags, og:image, structured data
- "Written by Tiker Team" author block

No need for a CMS. Markdown files in the repo are fine.
Keep it dead simple -- we need to ship content, not build a blog platform.`,
    tags: ['marketing', 'engineering', 'blog'],
    priority: 'now',
    due_offset_days: 2,
  },
  // WEEK 2: Launch Prep (Days 5-9)
  {
    title: 'Draft Hacker News Show HN post',
    description: `Draft the Show HN submission:

Title format: "Show HN: Tiker - A task board for AI agents (open source)"

First comment (post immediately after submission):
- Personal story: the multi-window chaos that led to building this
- What it does in 2 sentences
- Technical decisions: Next.js, Supabase, async architecture, Composio for integrations
- Self-hostable (MIT license)
- What's next on the roadmap
- Be candid about limitations

Key HN tips:
- Link to GitHub repo (HN prefers this over marketing sites)
- Don't ask for upvotes anywhere
- Be prepared to respond to every comment for 4+ hours
- Post Tuesday or Wednesday, ~9am ET

Save the draft for review before posting.`,
    tags: ['marketing', 'launch', 'hacker-news'],
    priority: 'now',
    due_offset_days: 5,
    agent_name: 'Writer',
  },
  {
    title: 'Draft Reddit posts for r/SideProject, r/selfhosted, r/ChatGPT',
    description: `Draft 3 Reddit posts, each with a different angle:

1. r/SideProject: "I built a command center for AI agents after drowning in terminal windows"
   - Build-in-public story
   - Screenshots
   - Ask for feedback

2. r/selfhosted: "Self-hosted task board for AI agents (MIT license, Docker)"
   - Lead with self-hosting angle
   - Docker compose setup
   - Architecture overview

3. r/ChatGPT or r/artificial: "I got tired of copy-pasting between AI tools, so I built a coordination layer"
   - Pain-point focused
   - How it solves the multi-tool problem
   - Link to try it or self-host

Stagger posts across days. Don't blast all at once.
Each post should feel native to its subreddit's culture.`,
    tags: ['marketing', 'launch', 'reddit'],
    priority: 'soon',
    due_offset_days: 6,
    agent_name: 'Writer',
  },
  {
    title: 'Create X/Twitter build-in-public launch thread',
    description: `Draft a Twitter/X thread for launch week:

Thread structure (8-10 tweets):
1. Hook: "I've been building an AI command center. Here's why chat interfaces are the wrong paradigm for AI agents."
2. The problem (screenshot of multi-window chaos)
3. What I built (screenshot of Tiker's clean board)
4. How it works: create task > assign agent > get result
5. The "agents remember" angle (persistent context)
6. Auto-coordination between agents
7. Open source, self-hostable (MIT)
8. What's next on the roadmap
9. CTA: link to GitHub repo
10. "If this resonates, RT the first tweet"

Also draft 5 standalone tweets for the week:
- Before/after screenshot comparison
- "Stop babysitting your AI" one-liner
- Feature highlight: daily briefing
- Feature highlight: calendar integration
- User testimonial or usage stat (even if it's your own)`,
    tags: ['marketing', 'launch', 'twitter'],
    priority: 'soon',
    due_offset_days: 6,
    agent_name: 'Writer',
  },
  {
    title: 'Write blog post: "How to Coordinate Multiple AI Agents Without Losing Your Mind"',
    description: `Practical, tutorial-style blog post.

Target keywords: "coordinate AI agents", "multi-agent workflow", "AI agent management"

Structure:
- The coordination problem (agents don't talk to each other)
- Pattern 1: Sequential handoffs (Researcher > Writer > Reviewer)
- Pattern 2: Parallel execution (assign 3 agents to 3 subtasks)
- Pattern 3: Human-in-the-loop review
- How Tiker implements each pattern
- Getting started guide with screenshots

This is the most "linkable" post -- other blogs/newsletters can reference it.
Include diagrams if possible (Mermaid or simple ASCII).
800-1200 words.`,
    tags: ['marketing', 'blog', 'seo', 'content'],
    priority: 'later',
    due_offset_days: 7,
    agent_name: 'Writer',
  },
  // WEEK 2-3: Product Hunt Prep (Days 8-12)
  {
    title: 'Prepare Product Hunt launch assets',
    description: `Create all assets needed for Product Hunt launch:

1. Gallery images (5 required):
   - Hero shot: clean screenshot of the command center
   - Before/after: multi-window chaos vs. Tiker
   - Feature: agent assignment flow
   - Feature: daily briefing view
   - Feature: calendar integration

2. Product Hunt listing copy:
   - Tagline (max 60 chars): "A command center for your AI agents"
   - Description (clear, benefit-focused, 300 words max)
   - Topics: Artificial Intelligence, Developer Tools, Productivity, Open Source

3. Maker comment draft (post immediately after launch):
   - Why you built it
   - What makes it different
   - Invite feedback

4. Demo video: 30-sec screen recording (can reuse/trim the Loom)

Design can be minimal. Use Canva free tier or plain screenshots with borders.
Product Hunt launches at 12:01 AM PT.`,
    tags: ['marketing', 'launch', 'product-hunt'],
    priority: 'soon',
    due_offset_days: 9,
  },
  {
    title: 'Set up email capture + 5-email nurture sequence',
    description: `Build the email funnel:

1. Email capture:
   - Add email signup to landing page (post-signup, not gating)
   - Use Resend or Loops free tier
   - Simple: "Get updates on Tiker" or "Join the waitlist for Team features"

2. Welcome/nurture sequence (5 emails over 14 days):
   - Day 0: Welcome + quick-start guide ("You just joined the future of AI coordination")
   - Day 2: "Here's what your first AI agent can do" (walkthrough with screenshots)
   - Day 5: Use case spotlight (real workflow example, even if it's your own)
   - Day 9: "What's holding you back?" (address common objections: security, setup, pricing)
   - Day 14: Pro trial nudge ("Ready to put your agents to work? Start your 7-day trial")

Each email: short (under 200 words), one clear CTA, plain-text friendly.
Set up with Resend's free tier (3,000 emails/month).`,
    tags: ['marketing', 'email', 'conversion'],
    priority: 'soon',
    due_offset_days: 10,
    agent_name: 'Writer',
  },
  // WEEK 3: LAUNCH (Days 10-14)
  {
    title: 'LAUNCH: Post Show HN on Hacker News',
    description: `GO LIVE on Hacker News.

Pre-launch checklist:
- [ ] GitHub README is polished
- [ ] Blog has 2-3 posts live
- [ ] Landing page is solid
- [ ] Demo video is recorded
- [ ] First comment is drafted and ready to paste

Execution:
1. Post Tuesday or Wednesday, 9:00 AM ET
2. Immediately add first comment (personal story + technical details)
3. Monitor and respond to EVERY comment for 4+ hours
4. Share the HN link on X (don't ask for upvotes)
5. Track signups in real-time

Post-launch:
- Screenshot any positive comments for social proof
- Note all feedback/feature requests
- If it flops, no sweat -- Reddit and Product Hunt are separate shots`,
    tags: ['marketing', 'launch', 'hacker-news'],
    priority: 'now',
    due_offset_days: 10,
  },
  {
    title: 'LAUNCH: Post on Reddit (staggered across 3 days)',
    description: `Post to Reddit communities, staggered:

Day 1 (same day as HN): r/SideProject
Day 2: r/selfhosted
Day 3: r/ChatGPT or r/artificial

For each post:
- Use the pre-drafted copy (adapt if HN generated good feedback/quotes)
- Engage genuinely in every comment thread
- Answer questions with depth, not surface-level responses
- If someone raises a valid criticism, acknowledge it honestly

Don't cross-post the same content. Each subreddit has different culture.
Don't mention the HN launch in Reddit posts (looks like you're farming).`,
    tags: ['marketing', 'launch', 'reddit'],
    priority: 'soon',
    due_offset_days: 10,
  },
  {
    title: 'LAUNCH: Post X/Twitter thread',
    description: `Go live with the build-in-public thread on X.

Timing: Same morning as HN launch.

Execute:
1. Post the full thread (8-10 tweets, pre-drafted)
2. Pin the first tweet
3. Share the GitHub link in your bio
4. Engage with anyone who replies or quotes
5. Retweet any positive reactions with a thank you

Follow-up (rest of the week):
- Post 1 standalone tweet per day from the pre-drafted set
- Share interesting HN/Reddit comments as screenshots
- Quote-tweet any positive mentions`,
    tags: ['marketing', 'launch', 'twitter'],
    priority: 'soon',
    due_offset_days: 10,
  },
  // WEEK 3-4: Product Hunt + Sustain (Days 14-18)
  {
    title: 'LAUNCH: Product Hunt launch day',
    description: `Product Hunt launch -- the second big push.

Schedule: 5-7 days after HN launch (use HN momentum).

Launch day:
1. Post at 12:01 AM PT
2. Add maker comment immediately
3. Reply to every comment within the hour
4. Share PH link on X, email list, and Reddit (naturally, not spammy)
5. Email beta users asking them to check it out (don't explicitly ask for upvotes)
6. Monitor all day -- PH rewards active makers

Goal: Top 5 of the day (200+ upvotes).

Post-launch:
- Add "Featured on Product Hunt" badge to landing page/README
- Screenshot the PH listing for social proof`,
    tags: ['marketing', 'launch', 'product-hunt'],
    priority: 'now',
    due_offset_days: 16,
  },
  {
    title: 'Write comparison blog: "Tiker vs Notion AI"',
    description: `SEO comparison post targeting high-intent searches.

Target keywords: "Notion AI alternative", "Notion AI vs", "AI task manager"

Structure:
- What Notion AI does well (inline AI, Q&A, summarization)
- Where it falls short for multi-agent coordination
- How Tiker differs: task-board model, specialist agents, async execution
- Side-by-side comparison table
- When to use Notion AI vs Tiker (be honest -- they solve different problems)
- Conclusion: complementary, not replacement

Be fair and honest. Don't trash Notion. Position Tiker as the layer that coordinates AI work that Notion doesn't handle.
800-1000 words.`,
    tags: ['marketing', 'blog', 'seo', 'comparison'],
    priority: 'later',
    due_offset_days: 15,
    agent_name: 'Writer',
  },
  {
    title: 'Write comparison blog: "Best AI Agent Managers in 2026"',
    description: `Listicle/comparison post for SEO.

Target keywords: "best AI agent manager", "AI agent platform comparison", "AI agent tools 2026"

Include 5-7 tools (be honest about all of them):
1. Tiker (obviously)
2. Lindy.ai
3. Relay.app
4. Dify
5. OpenAI AgentKit
6. Sintra AI

For each: 2-3 sentence description, key strengths, best for [use case].
Position Tiker's unique angle: task-board model, open source, self-hostable.

This type of post ranks well and captures high-intent traffic.
1000-1500 words.`,
    tags: ['marketing', 'blog', 'seo', 'comparison'],
    priority: 'later',
    due_offset_days: 17,
    agent_name: 'Researcher',
  },
  {
    title: 'Post first Indie Hackers monthly update',
    description: `Write a transparent build-in-public update on Indie Hackers.

Include:
- What we launched (Tiker, AI agent command center)
- The numbers: signups, GitHub stars, traffic sources
- What worked (which channels drove signups)
- What didn't work
- Revenue: $0 (be honest -- we're pre-revenue)
- Lessons learned
- What's next

IH community rewards honesty and transparency. Don't spin bad numbers.
Ask for feedback at the end.`,
    tags: ['marketing', 'community', 'indie-hackers'],
    priority: 'later',
    due_offset_days: 18,
    agent_name: 'Writer',
  },
  // ONGOING: OpenClaw Services Page
  {
    title: 'Create OpenClaw setup services landing page at /services',
    description: `Build a separate landing page for OpenClaw setup services.

Page: tiker.com/services (or /setup)

This is a services play, NOT part of the main product funnel.
Keep it separate from the Tiker SaaS messaging.

Page structure:
1. Hero: "Get your AI agent infrastructure running in a day, not a month"
2. What's included:
   - OpenClaw gateway setup and configuration
   - Agent configuration and optimization
   - Integration wiring (Gmail, Slack, GitHub, etc.)
   - Initial task templates and workflows
3. Packages:
   - Quick Start ($500): Basic setup, 1 integration, 2hr support
   - Full Config ($1,500): Full setup, all integrations, 8hr support, training
   - Custom: "Contact us"
4. CTA: "Book a Setup Call" (Calendly link)

Add a subtle footer link from main Tiker site: "Need help setting up? Talk to our team"
Do NOT feature on the main nav or hero. This is discoverable, not prominent.`,
    tags: ['marketing', 'services', 'openclaw'],
    priority: 'later',
    due_offset_days: 12,
  },
  // Week 4: Analytics + Optimization
  {
    title: 'Set up analytics tracking (Vercel Analytics or Plausible)',
    description: `Add privacy-friendly analytics to track campaign performance:

1. Install Vercel Analytics (free with Vercel hosting) or Plausible (free self-hosted)
2. Track:
   - Page views (landing page, blog posts, pricing)
   - Signup conversion rate
   - Traffic sources (HN, Reddit, PH, organic)
   - Blog post performance
3. Set up UTM parameters for each campaign:
   - ?utm_source=hackernews&utm_medium=social&utm_campaign=launch
   - ?utm_source=reddit&utm_medium=social&utm_campaign=launch
   - ?utm_source=producthunt&utm_medium=social&utm_campaign=launch

4. Add to GitHub README links:
   - ?ref=github

This is critical for knowing what's working and doubling down.`,
    tags: ['marketing', 'analytics', 'engineering'],
    priority: 'soon',
    due_offset_days: 4,
  },
  {
    title: 'Review campaign performance and optimize (Week 4 retro)',
    description: `End-of-campaign retrospective:

Review all metrics:
- Total signups vs. 500 target
- Pro trial conversions vs. 50 target
- GitHub stars vs. 200 target
- Email list size vs. 1,000 target
- Traffic by source
- Best-performing content pieces
- Conversion rate by channel

Analysis:
- Which channel drove the most signups?
- Which content resonated most?
- Where did we waste time?
- What should we double down on?

Next steps:
- Shut down underperforming channels
- 2x investment in top-performing channels
- Plan Month 2 content calendar based on learnings`,
    tags: ['marketing', 'analytics', 'retro'],
    priority: 'later',
    due_offset_days: 25,
    agent_name: 'Data Analyst',
  },
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (secret !== SEED_SECRET) {
    return NextResponse.json({ error: 'Invalid secret. Use ?secret=tiker-seed-2026' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // 1. Find Jay's account
  const { data: accounts, error: accError } = await supabase
    .from('accounts')
    .select('id, email')
    .ilike('email', '%jay%')
    .limit(5)

  if (accError || !accounts?.length) {
    const { data: allAccounts } = await supabase.from('accounts').select('id, email').limit(10)
    return NextResponse.json({
      error: 'Could not find Jay\'s account',
      available: allAccounts?.map((a: any) => `${a.id} (${a.email})`),
    }, { status: 404 })
  }

  const account = accounts[0]

  // 2. Get agent templates
  const { data: agents } = await supabase
    .from('account_agent_templates')
    .select('id, name, emoji')
    .eq('account_id', account.id)

  const agentMap = new Map(agents?.map((a: any) => [a.name, a.id]) || [])

  // 3. Insert tasks
  const results: string[] = []
  let created = 0
  let skipped = 0

  for (const taskDef of MARKETING_TASKS) {
    const now = new Date()
    const dueDate = new Date(now.getTime() + taskDef.due_offset_days * 24 * 60 * 60 * 1000)

    let assignedAgentIds: string[] = []
    if (taskDef.agent_name) {
      const agentId = agentMap.get(taskDef.agent_name)
      if (agentId) {
        assignedAgentIds = [agentId]
      } else {
        for (const [name, id] of agentMap) {
          if (name.toLowerCase().includes(taskDef.agent_name.toLowerCase())) {
            assignedAgentIds = [id as string]
            break
          }
        }
      }
    }

    const status = assignedAgentIds.length > 0 ? 'assigned' : 'inbox'

    const { error: insertError } = await supabase.from('mc_tasks').insert({
      account_id: account.id,
      title: encrypt(taskDef.title),
      description: encrypt(taskDef.description),
      tags: taskDef.tags,
      priority: taskDef.priority,
      status,
      assigned_agent_ids: assignedAgentIds,
      due_date: dueDate.toISOString(),
    })

    if (insertError) {
      results.push(`FAIL: ${taskDef.title.slice(0, 50)}... - ${insertError.message}`)
      skipped++
    } else {
      const agent = taskDef.agent_name
        ? (assignedAgentIds.length > 0 ? `-> ${taskDef.agent_name}` : `-> ${taskDef.agent_name} (NOT FOUND)`)
        : '(manual)'
      results.push(`OK [${taskDef.priority}] ${taskDef.title.slice(0, 60)}... ${agent}`)
      created++
    }
  }

  return NextResponse.json({
    account: `${account.email} (${account.id})`,
    agents: agents?.map((a: any) => `${a.emoji} ${a.name}`),
    created,
    skipped,
    results,
  })
}
