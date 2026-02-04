# Cloud Product Development Roadmap

**Branch:** cloud-dev  
**Deploy:** testcloud.tiker.com (once Vercel project created)  
**Goal:** Build cloud-hosted Tiker with 4 product tiers

---

## Phase 1: Foundation (Week 1) - START HERE

### 1.1 Environment Setup ✅
- [x] Create cloud-dev branch
- [x] Push to GitHub
- [x] Create Vercel project (testcloud.tiker.com)
- [x] Set environment variables (all 10 configured)
- [x] Configure Next.js framework preset

### 1.2 Product Mode Detection
**Files to create/modify:**
- `lib/product-mode.ts` - Detect OSS vs Cloud
- `lib/config.ts` - Environment-based config
- `.env.local.example` - Document new variables

**Environment Variables Needed:**
```bash
# Add to Vercel project settings
NEXT_PUBLIC_PRODUCT_MODE=cloud
NEXT_PUBLIC_BASE_URL=https://testcloud.tiker.com

# For now, share Supabase with OSS (we'll separate later)
NEXT_PUBLIC_SUPABASE_URL=<current>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<current>
```

### 1.3 Database Schema Updates
**Files:** `supabase/migrations/XXX-cloud-support.sql`

```sql
-- Add to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'free';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS product_mode TEXT DEFAULT 'oss';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS gateway_url TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS gateway_token TEXT; -- encrypted
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS gateway_connected BOOLEAN DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
```

---

## Phase 2: Bucket 2 - Cloud Management (Week 1-2)

**Goal:** Let users connect their OpenClaw gateway and access MC from cloud

### 2.1 Settings Page: Connect Gateway
**Files to create:**
- `app/settings/gateway/page.tsx` - Gateway connection UI
- `app/api/gateway/connect/route.ts` - Save gateway credentials
- `app/api/gateway/status/route.ts` - Check gateway health

**UI Features:**
- Input: Gateway URL (e.g., http://192.168.1.100:18789)
- Input: API Token (from OpenClaw)
- Button: "Test Connection"
- Status indicator: Connected ✅ / Offline 🔴
- Instructions: How to get API token from OpenClaw

### 2.2 Gateway Proxy
**Files to create:**
- `lib/gateway-client.ts` - API client for OpenClaw
- `app/api/tasks/route.ts` - Proxy task CRUD to gateway
- `app/api/agents/route.ts` - Proxy agent queries to gateway

**Logic:**
```typescript
// lib/gateway-client.ts
export async function getAccountGateway(accountId: string) {
  // Fetch gateway URL + token from accounts table
  // Return configured axios instance
}

export async function proxyToGateway(accountId: string, endpoint: string, options) {
  const gateway = await getAccountGateway(accountId);
  if (!gateway) throw new Error('No gateway connected');
  
  return gateway.request({
    url: endpoint,
    ...options
  });
}
```

### 2.3 Update MC UI to Use Gateway
**Files to modify:**
- `app/command/page.tsx` - Fetch tasks via gateway proxy
- `app/mc/page.tsx` - Same (if different page)
- Components that hit Supabase directly → route via API

**Pattern:**
```typescript
// OLD (direct Supabase)
const { data } = await supabase.from('mc_tasks').select('*');

// NEW (gateway-aware)
const res = await fetch('/api/tasks');
const data = await res.json();
```

---

## Phase 3: Bucket 3A - Cloud Hosted (Your Keys) (Week 2-3)

**Goal:** Run agents in cloud using user's API keys

### 3.1 API Key Management
**Files to create:**
- `app/settings/keys/page.tsx` - Store API keys UI
- `lib/crypto.ts` - Encrypt/decrypt keys at rest
- `app/api/keys/route.ts` - CRUD for API keys

**Keys to store:**
- Anthropic API key
- OpenAI API key
- Google API key (Gemini)

**Security:**
- Encrypt before storing in DB
- Never return decrypted keys to client
- Use only server-side

### 3.2 Agent Orchestrator Service
**New service:** `cloud-orchestrator/`

**Option A: Node.js (faster to start)**
```
cloud-orchestrator/
├── index.ts          # Express or Fastify server
├── queue.ts          # Redis-based job queue
├── worker.ts         # Pick up tasks, execute
├── models/
│   ├── anthropic.ts
│   ├── openai.ts
│   └── google.ts
└── tools/
    ├── calendar.ts
    ├── email.ts
    └── web.ts
```

**Option B: Go (production-ready)**
```
cloud-orchestrator/
├── main.go
├── queue/worker.go
├── models/router.go
└── tools/
```

**Recommendation:** Start with Node.js, migrate to Go later

### 3.3 Queue System
**Tech:** Redis + BullMQ (Node.js) or similar

**Flow:**
1. User creates task in UI
2. API endpoint adds job to Redis queue
3. Worker picks up job
4. Worker loads user's API keys
5. Worker executes agent with user's keys
6. Worker posts result back to task
7. User sees completed task

---

## Phase 4: Bucket 3B - Cloud Hosted (Our Keys) (Week 3-4)

**Goal:** User pays us, we provide everything

### 4.1 Token Metering
**Files to create:**
- `supabase/migrations/XXX-usage-tracking.sql`
- `lib/usage.ts` - Track token usage per user
- `app/api/usage/route.ts` - Query usage for billing

**Schema:**
```sql
CREATE TABLE model_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id),
  task_id UUID REFERENCES mc_tasks(id),
  model TEXT,
  tokens_in INTEGER,
  tokens_out INTEGER,
  cost_usd DECIMAL(10,6),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_usage_account ON model_usage(account_id, created_at DESC);
```

### 4.2 Usage Limits
**Files to create:**
- `lib/limits.ts` - Check if user is under limit
- `app/api/tasks/route.ts` - Enforce limits before queueing

**Limits (Team+ plan):**
- 500 simple tasks/month (Haiku/GPT-4o-mini)
- 100 complex tasks/month (Sonnet/GPT-4o)

**Overage:**
- Soft limit: Warning at 80%
- Hard limit: Block new tasks, show upgrade prompt

### 4.3 Model Router (Cost Optimization)
**Files to create:**
- `cloud-orchestrator/models/router.ts`

**Logic:**
```typescript
function selectModel(task: Task): Model {
  const complexity = estimateComplexity(task.description);
  
  if (complexity < 5) return 'haiku'; // $0.002 per task
  if (complexity < 8) return 'gpt-4o-mini'; // $0.005 per task
  return 'sonnet'; // $0.02 per task
}
```

---

## Phase 5: Pricing & Billing (Week 4-5)

### 5.1 Pricing Page
**Files to create:**
- `app/pricing/page.tsx`

**Tiers:**
| Plan | Price | Features |
|------|-------|----------|
| Free (OSS) | $0 | Self-hosted, unlimited |
| Pro (Cloud Mgmt) | $12/mo | Cloud UI, your gateway |
| Team (Your Keys) | $29/mo | Cloud agents, your API keys |
| Team+ (Our Keys) | $49/mo | Everything included, 500 tasks |

### 5.2 Stripe Integration
**Files to create:**
- `app/api/billing/checkout/route.ts` - Create checkout session
- `app/api/billing/webhook/route.ts` - Handle Stripe events
- `app/api/billing/portal/route.ts` - Customer portal link

**Stripe Products:**
- `price_pro_monthly` - $12/mo
- `price_team_monthly` - $29/mo
- `price_team_plus_monthly` - $49/mo
- `price_team_plus_usage` - Metered overage

---

## Phase 6: Polish (Week 5-6)

### 6.1 Onboarding Flow
- New user → What do you want?
  - I have OpenClaw → Pro plan
  - I have API keys → Team plan
  - I want it managed → Team+ plan
  - I'm just exploring → Free (OSS instructions)

### 6.2 Documentation
- How to connect gateway
- How to add API keys
- Usage limits explained
- Billing FAQ

### 6.3 Analytics
- Track conversions (free → paid)
- Track usage patterns (optimize routing)
- Track churn (why users leave)

---

## Technical Decisions Needed

### 1. Supabase Strategy
**Option A:** Share project, add `product_mode` column
**Option B:** Separate Supabase for cloud
**Recommendation:** Start with A, migrate to B at scale

### 2. Agent Orchestrator Language
**Option A:** Node.js (faster to build, same stack)
**Option B:** Go (more efficient, better for scale)
**Recommendation:** Start with Node.js

### 3. Queue System
**Option A:** Redis + BullMQ
**Option B:** Temporal/Inngest (workflow engine)
**Recommendation:** Redis for MVP, Temporal later

### 4. API Key Storage
**Option A:** Encrypt with server secret
**Option B:** Use Supabase Vault (if available)
**Option C:** AWS Secrets Manager / Vault
**Recommendation:** Start with A, migrate to C at scale

---

## Next Actions (Today)

1. **Jay:** Create Vercel project for cloud-dev branch
2. **Bonnie:** Create product mode detection (`lib/product-mode.ts`)
3. **Bonnie:** Database migration for cloud support
4. **Bonnie:** Settings page scaffold (gateway connection UI)

Let's start with those 3 files and get something deployable to testcloud.tiker.com by tonight.

Ready?
