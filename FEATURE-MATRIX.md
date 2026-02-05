# Feature Matrix - Tier by Tier

## Complete Feature Breakdown

| Feature | Free (No AI) | Free (BYOK) | Solo ($19) | Developer ($49) | Team ($99) | Self-Hosted |
|---------|--------------|-------------|------------|-----------------|------------|-------------|
| **Core Features** |
| Create tasks manually | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited |
| Comments & attachments | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Kanban board view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Simple list view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Calendar view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Search & filters | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Export data | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **AI Orchestration** |
| AI agents | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Task execution | ❌ | ✅ Unlimited | ✅ 100/mo | ✅ 400/mo | ✅ 1,000/mo | ✅ Unlimited |
| Multi-turn conversations | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tool use (Gmail, Calendar) | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Model Access** |
| Bring your own API keys | ❌ | ✅ Required | ❌ | ❌ | ❌ | ✅ Required |
| We provide models | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Claude Haiku (Fast) | ❌ | If you have key | ✅ | ✅ | ✅ | If you have key |
| Claude Sonnet (Standard) | ❌ | If you have key | ✅ Default | ✅ | ✅ | If you have key |
| Claude Opus (Reasoning) | ❌ | If you have key | ❌ | ✅ | ✅ | If you have key |
| Kimi K2.5 (Budget) | ❌ | If you have key | ✅ | ✅ | ✅ | If you have key |
| Gemini | ❌ | If you have key | ❌ | ✅ | ✅ | If you have key |
| GPT-4 | ❌ | If you have key | ❌ | ✅ | ✅ | If you have key |
| **Developer Features** |
| API access | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Webhooks | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Custom agents (upload) | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Priority execution queue | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Advanced analytics | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Usage API endpoint | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Collaboration** |
| Team members | 1 | 1 | 1 | 1 | ✅ 10 | ✅ Unlimited |
| Shared boards | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Role permissions | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Team activity feed | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Support & Limits** |
| Support level | Community | Community | Email | Priority email | Priority + Chat | Community |
| Task limit | ∞ manual | ∞ AI (fair use) | 100 AI/mo | 400 AI/mo | 1,000 AI/mo | ∞ |
| Storage limit | 10MB | 100MB | 500MB | 2GB | 10GB | ∞ |
| Rate limit | 10/hr | 100/hr | 200/hr | 500/hr | 1,000/hr | ∞ |
| **Infrastructure** |
| Hosted by | Tiker | Tiker | Tiker | Tiker | Tiker | You |
| Data location | US/EU | US/EU | US/EU | US/EU | US/EU | Your choice |
| SLA | None | None | 99% | 99.9% | 99.9% | N/A |
| Uptime monitoring | ❌ | ❌ | ✅ | ✅ | ✅ | You handle |

---

## Tier Descriptions (For Marketing)

### Free (No AI)
**"Simple to-do list"**
- Perfect for: Personal task tracking without AI
- You get: Full kanban/list/calendar views, unlimited manual tasks
- You don't get: AI agents, automation, integrations
- Upgrade when: You want AI to handle tasks for you

### Free (BYOK) - "POPULAR"
**"Bring your own API keys"**
- Perfect for: Technical users, privacy-conscious, cost-aware
- You get: Everything except our models (unlimited AI tasks with your keys)
- You pay: Only model costs directly to provider (~$0.06/task)
- Upgrade when: You're tired of managing API keys

### Solo ($19/mo)
**"For individuals"**
- Perfect for: Casual users, non-technical folks
- You get: 100 AI tasks/month, no key management, we handle everything
- 7-day free trial
- Upgrade when: You need more than 100 tasks or want advanced features

### Developer ($49/mo)
**"Power features"**
- Perfect for: Power users, indie hackers, developers
- You get: 400 AI tasks, API access, webhooks, all models, custom agents
- No trial (immediate value for developers)
- Upgrade when: You need team collaboration

### Team ($99/mo)
**"Collaboration"**
- Perfect for: Teams, agencies, companies
- You get: 1,000 AI tasks, 10 members, shared boards, priority support
- No trial (contact sales for enterprise)
- Upgrade when: You need more than 10 seats (custom pricing)

### Self-Hosted
**"Full control"**
- Perfect for: Enterprises, compliance-heavy orgs, geeks
- You get: Everything, unlimited, on your infrastructure
- Free forever (OSS license)
- Setup: 5 min with OpenClaw CLI

---

## Feature Flags (Database)

```sql
-- Add feature flags to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}'::jsonb;

-- Example feature flags per tier:
-- Free (No AI):
{
  "ai_enabled": false,
  "task_limit": null,
  "models": [],
  "api_access": false,
  "webhooks": false,
  "team_size": 1
}

-- Free (BYOK):
{
  "ai_enabled": true,
  "task_limit": null,
  "models": ["user_provided"],
  "api_access": false,
  "webhooks": false,
  "team_size": 1
}

-- Solo:
{
  "ai_enabled": true,
  "task_limit": 100,
  "models": ["haiku", "sonnet", "kimi"],
  "api_access": false,
  "webhooks": false,
  "team_size": 1
}

-- Developer:
{
  "ai_enabled": true,
  "task_limit": 400,
  "models": ["haiku", "sonnet", "opus", "kimi", "gemini", "gpt4"],
  "api_access": true,
  "webhooks": true,
  "custom_agents": true,
  "priority_queue": true,
  "team_size": 1
}

-- Team:
{
  "ai_enabled": true,
  "task_limit": 1000,
  "models": ["haiku", "sonnet", "opus", "kimi", "gemini", "gpt4"],
  "api_access": true,
  "webhooks": true,
  "custom_agents": true,
  "priority_queue": true,
  "team_size": 10,
  "shared_boards": true,
  "role_permissions": true
}
```

---

## Enforcement Points

### 1. Task Creation
```typescript
// Check if AI enabled
if (!account.features.ai_enabled) {
  // Create as manual task only
  // Hide "Assign to agent" option
}

// Check monthly limit
if (account.features.task_limit) {
  const usage = await getMonthlyUsage(account.id);
  if (usage.tasks_used >= account.features.task_limit) {
    return { error: "Monthly limit reached. Upgrade or wait until reset." };
  }
}
```

### 2. Model Selection
```typescript
// Check which models are available
const availableModels = account.features.models || [];

if (selectedModel === 'opus' && !availableModels.includes('opus')) {
  return { error: "Opus requires Developer tier or higher" };
}

// For BYOK: check if user has that key
if (availableModels.includes('user_provided')) {
  const hasKey = account.api_keys?.[provider];
  if (!hasKey) {
    return { error: "Add your API key in Settings" };
  }
}
```

### 3. API Access
```typescript
// Check if API access is enabled
if (request.path.startsWith('/api/v1/') && !account.features.api_access) {
  return { error: "API access requires Developer tier", upgrade: "/pricing" };
}
```

### 4. Team Features
```typescript
// Check team size
const teamMembers = await getTeamMembers(account.id);
if (teamMembers.length >= account.features.team_size) {
  return { error: "Team limit reached. Upgrade to add more members." };
}

// Check shared boards
if (action === 'share_board' && !account.features.shared_boards) {
  return { error: "Shared boards require Team tier" };
}
```

---

## UI Visibility Rules

### Settings Page
```tsx
// Show/hide based on tier
{account.features.api_access && (
  <Link href="/settings/api">API Keys & Webhooks</Link>
)}

{account.features.team_size > 1 && (
  <Link href="/settings/team">Team Members</Link>
)}
```

### Task Creation
```tsx
// Hide agent selector for free no-AI tier
{account.features.ai_enabled && (
  <Select label="Assign to agent">
    {agents.map(agent => <option>{agent.name}</option>)}
  </Select>
)}

// Show model picker for Developer+
{account.features.models.length > 3 && (
  <Select label="Preferred model">
    {account.features.models.map(model => <option>{model}</option>)}
  </Select>
)}
```

### Upgrade Prompts
```tsx
// When trying to use locked feature
{!account.features.api_access && (
  <div className="upgrade-prompt">
    <p>API access requires Developer tier</p>
    <Link href="/pricing">Upgrade to Developer ($49/mo) →</Link>
  </div>
)}
```

---

## Migration Path

```sql
-- Migration: Add feature flags based on current plan_tier
UPDATE accounts SET features = 
  CASE plan_tier
    WHEN 'free' THEN 
      CASE execution_mode
        WHEN 'cloud-user-keys' THEN '{"ai_enabled":true,"task_limit":null,"models":["user_provided"],"team_size":1}'::jsonb
        ELSE '{"ai_enabled":false,"task_limit":null,"team_size":1}'::jsonb
      END
    WHEN 'cloud' THEN '{"ai_enabled":true,"task_limit":100,"models":["haiku","sonnet","kimi"],"team_size":1}'::jsonb
    WHEN 'cloud-developer' THEN '{"ai_enabled":true,"task_limit":400,"models":["haiku","sonnet","opus","kimi","gemini","gpt4"],"api_access":true,"webhooks":true,"custom_agents":true,"priority_queue":true,"team_size":1}'::jsonb
    WHEN 'cloud-plus' THEN '{"ai_enabled":true,"task_limit":1000,"models":["haiku","sonnet","opus","kimi","gemini","gpt4"],"api_access":true,"webhooks":true,"custom_agents":true,"priority_queue":true,"team_size":10,"shared_boards":true,"role_permissions":true}'::jsonb
    ELSE '{"ai_enabled":false,"task_limit":null,"team_size":1}'::jsonb
  END;
```

---

## Testing Checklist

- [ ] Free (No AI) user can't tag agents
- [ ] Free (BYOK) user can create unlimited tasks with their keys
- [ ] Solo user hits 100 task limit and sees upgrade prompt
- [ ] Solo user can't access Opus (only Haiku/Sonnet/Kimi)
- [ ] Developer user can access API endpoints
- [ ] Developer user can create webhooks
- [ ] Team user can invite 10 members
- [ ] Team user can share boards
- [ ] Self-hosted user has no limits (all features)

---

## Next Steps

1. Add `features` JSONB column to accounts
2. Create helper functions: `hasFeature(account, 'api_access')`
3. Update executor to check model access
4. Update UI to show/hide features based on tier
5. Add upgrade prompts when hitting limits
6. Write enforcement logic for each feature
7. Test every tier thoroughly

**Want me to start implementing the feature flags system?**
