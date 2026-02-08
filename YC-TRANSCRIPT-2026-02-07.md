# YC Application - AI Collaboration Transcript
# Session: February 7, 2026

## Context
Jay (CEO) working with Bonnie (AI Chief of Staff) to prepare Tiker for YC application. Building "your to-do list, done for you" - AI-powered task management focused on calendar-first workflow for busy parents.

---

## Session 1: Strategic Direction & Jony Ive Principles (22:35-22:51 UTC)

### The Lost Context Problem
**Jay:** "I hate that we lost all context. We talked about this. We talked about you using a Jony Ive mindset - design is king. We need to make a super complex backend be dead simple for users on the front end."

**Key Insight:** Apply Apple's design philosophy to AI task management
- Complex orchestration backend (multiple AI agents, spawning, coordination)
- Dead simple frontend ("What do you need?")
- Hide all technical complexity from users

### The Core Model - Orchestrator + Specialists

**User Flow:**
1. User adds task: "What do you need?" + "When?" + checkbox: "Need AI help?"
2. If help = YES → routes to Orchestrator (Claude Sonnet, cost-efficient)
3. Orchestrator analyzes task, decides what's needed
4. Example: "I need Security Agent + Scheduler + Email Handler"
5. Orchestrator spawns specialist agents
6. **User sees visual representation of agents working** (builds trust)

**Jay's Philosophy:**
> "For everyone (including devs and including moms), we shouldn't put the burden of deciding on them. BUT, if we do spin up a backend, security, scheduling, email, etc. agent, we should visually represent that to them."

**The Magic:** Don't ask users to choose agents upfront. Auto-decide. Then show the work happening transparently.

### What We're Killing (Ruthless Simplification)
- ❌ AddAgentModal / Agent customization
- ❌ "Assign to" dropdowns
- ❌ Marketplace/Hub in main nav
- ❌ Any mention of "agents" or "orchestration" in user-facing UI
- ❌ Technical jargon everywhere

### What Stays (The Essentials)
- ✅ Task creation: description, when, tags, "need help?" checkbox
- ✅ Agent visibility: See emojis/names of agents working on your tasks
- ✅ Comments: Communication thread on tasks
- ✅ Calendar integration: Tasks live where users live

### Calendar-First Philosophy (Critical Insight)

**Jay:** "I think due-dates are actually critical - we built a UI for that. It's necessary for the mom with kids that lives in her calendar. That's where we can use our gcal link."

**Why this matters:**
- Target user = busy parent orchestrating family life
- They live in their calendar, not in task apps
- Integration is key: Tasks created in Tiker → appear in Google Calendar
- This is the differentiator vs. other task managers

**User Scenario:**
1. Mom: "Pick up Jake's prescription"
2. When: "Today"
3. Need help: "No, I'll handle it"
4. → Appears in her Google Calendar
5. She sees it in her daily view, gets it done

**Or:**
1. Mom: "Plan Jake's birthday party"
2. When: "March 22"
3. Need help: "Yes"
4. → AI orchestrator takes it
5. → Calendar block created for party planning
6. → AI emails progress updates
7. → She reviews deliverables when ready

### Pricing & Plan Structure

**Current Plans:**
- **Solo:** $19/mo - 100 AI tasks, Claude Sonnet, Google integrations
- **Developer:** $49/mo - 400 AI tasks, priority support
- **Team:** $99/mo - 1000 AI tasks, Claude Opus access
- **BYOK (Bring Your Own Keys):** Free unlimited, user pays providers directly

**Jay's Concern:** "Even 50 AI tasks is a lot - that's $3-6/mo in costs, depending on Opus calls/task"

**Strategic Decision:** Need to bifurcate pricing
- **Family plan:** Email collaborators, no shared kanban (keeps costs lower)
- **Pro/Business plan:** Shared team view, advanced features

**Free plan consideration:** Tight margins - need to find sustainable free tier or focus on paid from start

### Must-Have Features for MVP

**Jay's Priorities:**
1. ✅ Task creation (simple modal)
2. ✅ Agent availability/visibility (show who's working)
3. ✅ Tags (organizational flexibility)
4. ✅ Comments (communication thread)

**Everything else:** Can be solved with simpler approaches or deferred post-MVP

### Success Criteria

**Jay:** "Success is having a product people will pay for. It's no more complex than that and that guides our customer empathy approach. Build it right, people will pay. Super amazing tech that doesn't work, users will abandon."

**Philosophy:**
- Not about timeline ("shipping when it's right")
- Not about feature count
- About solving a real problem so well people open their wallets
- User empathy drives every decision

### Post-MVP Ideas (Logged for Later)

**Jay:** "I have a whole host of ideas on this [GCal integration] for later, once we get an MVP."

**To explore after launch:**
- Advanced calendar integration patterns
- Two-way sync improvements
- Calendar-based workflows
- (Details saved for future planning session)

---

## Architecture Discovery

**Current State:**
- Next.js + Supabase (PostgreSQL)
- AgentMail integration (username@tiker.com per user)
- Cloud worker for task execution
- Encryption at rest (AES-256-GCM)
- 2FA authentication
- OAuth (Google, GitHub)

**Key Finding:** Orchestrator intelligence/spawning logic doesn't exist yet
- Current: "Need help?" → assigns to "General Assistant" → single agent executes
- Vision: "Need help?" → Orchestrator analyzes → spawns specialists → coordinated work

**Two Paths Forward:**
1. **Path A (Recommended):** Ship simple MVP this weekend, build orchestration next sprint
2. **Path B:** Build full orchestrator vision first (2-4 days, delays launch)

**Decision:** Path A - validate demand first with simple AI help, then add multi-agent magic based on real usage patterns

---

## Execution Plan (Weekend Sprint)

### Phase 1: UI Polish (12h)
- Keep SimpleCreateTaskModal as-is (already excellent)
- Remove agent-facing jargon
- Verify due dates → calendar sync
- Remove AddAgentModal/Hub from main nav

### Phase 2: Calendar Integration (12h)
- Test GCal two-way sync
- Verify task → calendar block creation
- Email notifications in calendar context
- Prominent username@tiker.com display on first login

### Phase 3: Design Polish (12h)
- "Mom test" - cognitive walkthrough
- Copy audit (kill jargon, emphasize calendar)
- Visual consistency
- Mobile responsive

### Phase 4: Competitive Research & GTM (24h)
- Research Motion, Sunsama, Akiflow (calendar-focused competitors)
- Pricing/positioning strategy
- Launch plan (organic-first)

**Total:** ~60 hours = this weekend + early next week

---

## Key Learnings for YC

### 1. Build-Measure-Learn in Real-Time
This transcript shows iterative product development with AI assistance:
- Lost session context → rebuilt understanding quickly
- Pivoted from dev-focused to consumer-focused
- Made hard decisions about what to cut
- Validated assumptions with target user insight

### 2. Speed with Substance
- Jay can ideate and set strategy
- Bonnie (AI) can execute technical work
- Coordination happens asynchronously
- "Weekend build" becomes realistic timeline

### 3. Customer Empathy Drives Everything
Every decision traced back to: "Would the mom orchestrating her family's life understand this?"
- Not "what can we build?"
- But "what should we build?"
- Simplicity > Feature count

### 4. The Meta Problem
Building coordination tools while experiencing coordination problems ourselves (OpenClaw state sync issues, lost context)
- We are our own first customer
- The pain is real
- The solution matters

---

## Status: Ready for YC Application

**Product:** Clear direction, validated approach, realistic MVP scope
**Team:** Founder + AI Chief of Staff operating efficiently
**Market:** Underserved (busy parents), large TAM, calendar-first differentiation
**Traction:** Building in public, focused on getting first paying customers

**Next:** Ship MVP, validate demand, iterate based on real usage
