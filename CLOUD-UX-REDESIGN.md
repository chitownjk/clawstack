# Cloud UX Redesign - Complete Specification

## Problem Statement

The current product is a Frankenstein merge of two incompatible mental models:
1. **OSS/Self-Hosted** - Install skills in your workspace, manage your own gateway, contribute to Hub
2. **Cloud SaaS** - We run everything, you just use it

This creates massive UX confusion:
- Cloud users see "install this skill" (but they don't have a workspace)
- Cloud users see Hub (but they're not running agents locally)
- Self-hosted users see cloud pricing (but they're not on cloud)
- **Zero tier enforcement** - anyone can "add" any agent regardless of plan

## Three Distinct Products

### 1. Self-Hosted (execution_mode: `openclaw`)

**Who:** Technical users, privacy-conscious orgs, geeks who want full control

**What they run:**
- OpenClaw gateway on their own machine (Pi, VPS, laptop)
- All code runs locally
- They manage API keys, skills, and infrastructure

**UX Flow:**
```
Sign up → Install OpenClaw → Connect gateway → Browse Hub → 
Install skills → Create tasks → Agents execute locally
```

**Key Pages:**
- **/hub** - Browse and install skills/agents
- **/settings/execution** - Gateway connection setup
- **/command** - Task management (same for all)
- **/patterns** - Community patterns (contribute back)

**Terminology:**
- "Agent" = a skill you install in your workspace
- "Install" = add skill to your OpenClaw instance
- "Hub" = community marketplace of skills

**Limits:** None (you pay for your own API usage directly to providers)

---

### 2. Cloud BYOK (execution_mode: `cloud-user-keys`)

**Who:** Users who want convenience but handle their own API costs

**What we run:**
- Cloud worker that polls for their tasks
- Executes tasks using their encrypted API keys
- No infrastructure for them to manage

**UX Flow:**
```
Sign up → Choose "Free (BYOK)" → Add API keys → 
Enable agents → Create tasks → Our worker executes
```

**Key Pages:**
- **/agents** - Enable/disable agents for your account (NOT Hub)
- **/settings/connections** - Add OAuth providers (Gmail, Calendar, etc.)
- **/settings/execution** - Manage API keys (Anthropic, OpenAI, Google, Kimi)
- **/command** - Task management

**Terminology:**
- "Agent" = a capability we enable for your account
- "Enable" = turn on this agent type for your tasks
- "Connections" = OAuth providers you've authorized

**Limits:** Fair use policy (we'll email if you're abusing)

---

### 3. Cloud Paid (execution_mode: `cloud-our-keys`)

**Who:** Non-technical users who want zero setup

**What we run:**
- Everything (worker + our API keys)
- They just create tasks and we handle it

**UX Flow:**
```
Sign up → Choose plan (Solo/Developer/Team) → 
Enable agents → Create tasks → We execute & bill monthly
```

**Key Pages:**
- **/agents** - Enable/disable agents (gated by tier)
- **/settings/connections** - Add OAuth providers
- **/settings/usage** - Track task usage and costs
- **/command** - Task management

**Terminology:**
- Same as BYOK
- "Agent" = a capability (some require higher tiers)
- "Enable" = turn on this agent (if your plan allows)

**Limits:**
- Solo: 100 tasks/month, basic models
- Developer: 400 tasks/month, all models, API access
- Team: 1000 tasks/month, all models, team features

---

## The New `/agents` Page (Cloud Users)

**Purpose:** Let cloud users see and enable agent capabilities without the complexity of Hub/skills.

### UI Design

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  Your Agents                                    │
│  Enable the agents you want to use             │
├─────────────────────────────────────────────────┤
│                                                 │
│  🔍 All Agents    ✅ Enabled (3)                │
│                                                 │
│  ┌─────────────────────────────────────────┐  │
│  │ 🤖 General Assistant         [Enabled]  │  │
│  │ Answer questions, research, drafts      │  │
│  │ • Claude Sonnet, GPT-4                  │  │
│  │ • Available on all plans                │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
│  ┌─────────────────────────────────────────┐  │
│  │ 💻 Coder             [Enable Agent ▼]   │  │
│  │ Write code, debug, review PRs           │  │
│  │ • Claude Opus, GPT-4                    │  │
│  │ • Requires: Developer tier or higher    │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
│  ┌─────────────────────────────────────────┐  │
│  │ 📊 Data Analyst      [Enable Agent ▼]   │  │
│  │ Analyze data, create charts, insights   │  │
│  │ • Claude Sonnet, GPT-4 + Code Interp    │  │
│  │ • Available on all plans                │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Agent Card States

**Enabled:**
- Green checkmark badge
- "Enabled" button (click to disable)
- Agent is usable in tasks

**Available (not enabled):**
- "Enable Agent" button
- Click to enable (if plan allows)

**Locked (tier too low):**
- Grayed out
- "Requires Developer tier" badge
- "Upgrade to Enable" button → `/upgrade?for=coder`

### Agent Definitions

**Database Schema:**
```sql
-- New table: available_agents
CREATE TABLE available_agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  required_tier TEXT, -- 'free', 'solo', 'developer', 'team'
  required_models TEXT[], -- ['claude-opus', 'gpt4']
  tags TEXT[], -- ['coding', 'research', 'creative']
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- New table: account_agents
CREATE TABLE account_agents (
  account_id UUID REFERENCES accounts(id),
  agent_id TEXT REFERENCES available_agents(id),
  enabled BOOLEAN DEFAULT TRUE,
  enabled_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (account_id, agent_id)
);
```

**Seed Data:**
```sql
INSERT INTO available_agents (id, name, description, icon, required_tier, required_models, tags) VALUES
('general', 'General Assistant', 'Answer questions, research topics, write drafts', '🤖', 'free', ARRAY['claude-sonnet', 'gpt4'], ARRAY['general', 'research']),
('coder', 'Coder', 'Write code, debug issues, review pull requests', '💻', 'developer', ARRAY['claude-opus', 'gpt4'], ARRAY['coding', 'development']),
('data-analyst', 'Data Analyst', 'Analyze data, create visualizations, extract insights', '📊', 'free', ARRAY['claude-sonnet', 'gpt4'], ARRAY['data', 'analysis']),
('writer', 'Writer', 'Blog posts, documentation, marketing copy', '✍️', 'free', ARRAY['claude-sonnet', 'gpt4'], ARRAY['writing', 'content']),
('researcher', 'Researcher', 'Deep research, citations, summaries', '🔍', 'free', ARRAY['claude-sonnet', 'gpt4'], ARRAY['research', 'knowledge']),
('email-manager', 'Email Manager', 'Draft emails, manage inbox, schedule', '📧', 'solo', ARRAY['claude-sonnet'], ARRAY['email', 'productivity']),
('calendar-agent', 'Calendar Agent', 'Schedule meetings, manage calendar, send invites', '📅', 'solo', ARRAY['claude-sonnet'], ARRAY['calendar', 'scheduling']),
('social-media', 'Social Media Manager', 'Post to Twitter/LinkedIn, engage, schedule content', '📱', 'developer', ARRAY['claude-sonnet', 'gpt4'], ARRAY['social', 'marketing']),
('project-manager', 'Project Manager', 'Track projects, create subtasks, status updates', '📋', 'developer', ARRAY['claude-sonnet'], ARRAY['projects', 'management']),
('translator', 'Translator', 'Translate content across 100+ languages', '🌍', 'free', ARRAY['claude-sonnet', 'gpt4'], ARRAY['translation', 'language']);
```

---

## Implementation Plan

### Phase 2.1: Database & API (2 hours)

1. Create migrations:
   - `008-available-agents.sql` - Tables + seed data
   
2. API endpoints:
   - `GET /api/agents` - List available agents (filtered by tier)
   - `POST /api/agents/:id/enable` - Enable an agent
   - `DELETE /api/agents/:id/enable` - Disable an agent
   
3. Tier enforcement:
   ```typescript
   // Check if user can enable this agent
   if (agent.required_tier) {
     const tierHierarchy = { free: 0, solo: 1, developer: 2, team: 3 };
     const userTierLevel = tierHierarchy[account.plan_tier];
     const requiredTierLevel = tierHierarchy[agent.required_tier];
     
     if (userTierLevel < requiredTierLevel) {
       return { error: 'Upgrade required', requiredTier: agent.required_tier };
     }
   }
   ```

### Phase 2.2: `/agents` UI (3 hours)

1. Create `/app/agents/page.tsx`:
   - Fetch available agents
   - Fetch user's enabled agents
   - Show enable/disable buttons
   - Handle tier gating with upgrade prompts
   
2. Agent card component:
   - Display agent info
   - Show tier requirement badge
   - Enable/disable toggle
   - Model requirements

3. Filtering:
   - All Agents
   - Enabled
   - By tag (Coding, Research, Writing, etc.)

### Phase 2.3: Worker Integration (1 hour)

Update worker to check enabled agents:

```typescript
// When executing a task
const { data: enabledAgents } = await supabase
  .from('account_agents')
  .select('agent_id')
  .eq('account_id', task.account_id)
  .eq('enabled', true);

const enabledAgentIds = enabledAgents.map(a => a.agent_id);

// Only use tools from enabled agents
const availableTools = ALL_TOOLS.filter(tool => {
  return enabledAgentIds.includes(tool.agent_id);
});
```

### Phase 2.4: Navigation Updates (30 min)

1. Update NavBar:
   ```tsx
   {/* Cloud users see /agents, self-hosted see /hub */}
   {account?.execution_mode === 'openclaw' ? (
     <Link href="/hub">Agents</Link>
   ) : (
     <Link href="/agents">Agents</Link>
   )}
   ```

2. Add to SettingsNav (if appropriate)

---

## Testing Checklist

### Self-Hosted Users
- [ ] See /hub in navigation
- [ ] Can browse and "install" skills
- [ ] See gateway setup in /settings/execution
- [ ] No usage limits shown

### BYOK Cloud Users
- [ ] See /agents (not /hub) in navigation
- [ ] Can enable/disable agents
- [ ] See "Add API keys" prompts
- [ ] No usage dashboard (unlimited with fair use)

### Paid Cloud Users
- [ ] See /agents in navigation
- [ ] Tier gating works (can't enable Developer agents on Solo plan)
- [ ] Usage dashboard shows task consumption
- [ ] Upgrade prompts when hitting limits or locked agents

---

## Migration Strategy

**For existing users:**

1. **Default all cloud users to having "General Assistant" enabled**
   ```sql
   INSERT INTO account_agents (account_id, agent_id)
   SELECT id, 'general'
   FROM accounts
   WHERE execution_mode != 'openclaw'
   ON CONFLICT DO NOTHING;
   ```

2. **Don't break existing functionality:**
   - Worker will execute tasks even if agent not explicitly enabled (for now)
   - Add a grace period where we log warnings but don't block

3. **Communication:**
   - Email existing users about new agent management
   - In-app banner: "New: Manage your agents in one place"

---

## Future Enhancements

**Custom Agents (Developer+ tier):**
- Let users define their own agents
- Upload custom system prompts
- Select specific tools/models
- Share with team

**Agent Marketplace:**
- Community-contributed agents (like Hub but for cloud)
- One-click enable from marketplace
- Ratings and reviews

**Agent Analytics:**
- Which agents are you using most?
- Success rates per agent
- Cost breakdown per agent

---

## Questions & Decisions

1. **Should BYOK users see tier restrictions?**
   - Decision: No, they can enable any agent (they pay for usage)
   - Rationale: Fair use policy is enough

2. **Can users have multiple agents of same type?**
   - Decision: No, one instance per agent type
   - Rationale: Simplicity; can expand later if needed

3. **What happens to existing Hub for self-hosted?**
   - Decision: Keep as-is, no changes
   - Rationale: Separate product, works fine

---

**Ready to implement Phase 2?** This spec covers the complete redesign for cloud users while preserving self-hosted functionality.
