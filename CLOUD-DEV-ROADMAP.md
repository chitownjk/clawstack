# Cloud Product Development Roadmap

**Branch:** cloud-dev  
**Deploy:** testcloud.tiker.com (once Vercel project created)  
**Goal:** Build cloud-hosted Tiker with 4 product tiers

---

## Phase 1: Foundation (Week 1) - ✅ COMPLETE

### 1.1 Environment Setup ✅
- [x] Create cloud-dev branch
- [x] Push to GitHub
- [x] Create Vercel project (testcloud.tiker.com)
- [x] Set environment variables (all 10 configured)
- [x] Configure Next.js framework preset

### 1.2 Product Mode Detection ✅
- [x] `lib/product-mode.ts` - Detect OSS vs Cloud
- [x] Environment variables configured

### 1.3 Database Schema Updates ✅
- [x] `supabase/migrations/004-cloud-support.sql`
- [x] Added `execution_mode` (openclaw | cloud-user-keys | cloud-our-keys)
- [x] Added `api_keys` (JSONB, encrypted)
- [x] Added `model_usage` table for billing
- [x] Added monthly usage function

---

## Phase 2: Cloud Execution MVP - ✅ COMPLETE

**Goal:** Execute tasks in cloud with user's API keys or ours

### 2.1 Settings Page ✅
- [x] `app/settings/execution/page.tsx` - Choose execution mode
- [x] OpenClaw gateway configuration (URL + token)
- [x] Cloud user keys configuration (Anthropic/OpenAI)
- [x] Cloud managed mode (fully hosted)
- [x] Test connection button (for OpenClaw mode)

### 2.2 Cloud Worker ✅
- [x] `cloud-worker/` - Standalone Node.js service
- [x] `src/index.ts` - BullMQ worker
- [x] `src/executor.ts` - Agent→model→result logic
- [x] Loads agent definition from DB
- [x] Builds prompt (persona + task)
- [x] Calls Anthropic (user keys or ours)
- [x] Posts result as comment
- [x] Tracks usage for billing

### 2.3 Task Enqueueing ✅
- [x] `app/api/tasks/enqueue/route.ts` - Add task to Redis queue
- [x] Worker picks up from queue
- [x] Execution happens async

**Architecture:**
```
Task created → /api/tasks/enqueue → Redis
                                      ↓
                              Worker picks up
                                      ↓
                    Load agent + account from DB
                                      ↓
                      Build prompt → Call model
                                      ↓
                    Post result → Update status
```

---

## Phase 3: Integration & Testing (Next)

**Goal:** Wire everything together and test end-to-end

### 3.1 Task Creation Flow
- [ ] Update task creation to check `execution_mode`
- [ ] If `openclaw` → Do nothing (already handled)
- [ ] If `cloud-*` → Call `/api/tasks/enqueue`
- [ ] Show "Executing..." status in UI

### 3.2 Encryption
- [ ] Encrypt `gateway_token` before storing
- [ ] Encrypt `api_keys` before storing
- [ ] Decrypt on worker side

### 3.3 Deploy Worker
- [ ] Set up Redis (Upstash free tier)
- [ ] Deploy worker to Railway/Render
- [ ] Set environment variables
- [ ] Test with real task

### 3.4 Usage Tracking
- [ ] Insert into `model_usage` table
- [ ] Calculate costs based on model pricing
- [ ] Show usage in settings page
- [ ] Usage limits for cloud-our-keys mode

---

## Phase 4: Pricing & Billing (Week 2-3)

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
