# Deploy Cloud Worker - Quick Guide

**Goal:** Deploy the cloud-worker service so it can execute tasks in cloud mode.

---

## Prerequisites

1. **Redis** (free tier available)
2. **Worker hosting** (Railway, Render, or similar)

---

## Quick Start: Fly.io (Recommended - 10 minutes)

**Why Fly.io:**
- ✅ 3 free VMs (generous free tier)
- ✅ Built-in Redis integration
- ✅ One command deployment
- ✅ Perfect for background workers

### Step 1: Install Fly CLI (1 min)

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

### Step 2: Set Up Redis (2 min)

```bash
fly redis create tiker-redis --region sjc
```

Copy the `redis://...` URL it gives you.

### Step 3: Deploy Worker (5 min)

```bash
cd ~/botnet/development/clawstack/cloud-worker

# Launch (creates fly.toml if needed)
fly launch --no-deploy

# Set secrets
fly secrets set \
  NEXT_PUBLIC_SUPABASE_URL="your-supabase-url" \
  SUPABASE_SECRET_KEY="your-service-role-key" \
  ENCRYPTION_KEY="your-encryption-key" \
  ANTHROPIC_API_KEY="your-anthropic-key" \
  REDIS_URL="redis://... (from step 2)"

# Deploy!
fly deploy
```

### Step 4: Check Status

```bash
fly status
fly logs
```

**Done! Worker is live.** ✅

---

## Alternative: Railway/Render

If you prefer Railway or Render, see options below.

---

## Option A: Set Up Redis (Upstash - Free)

1. Go to https://upstash.com
2. Sign up / Log in
3. Create Redis database:
   - Name: `tiker-cloud-worker`
   - Region: Choose closest to your users
   - Type: Free tier (10K commands/day)
4. Get credentials:
   - Copy **Endpoint** (looks like `usw1-xxx.upstash.io`)
   - Copy **Port** (usually `6379`)
   - Copy **Password** (optional for Upstash)

---

## Option B: Deploy Worker (Railway)

### Option A: Railway (Easiest)

1. Go to https://railway.app
2. Sign up / Log in
3. New Project → Deploy from GitHub
4. Select repository: `chitownjk/tiker`
5. Branch: `cloud-dev`
6. Root Directory: `/cloud-worker`
7. Set environment variables (see below)
8. Deploy!

**Railway will auto-detect it's a Node.js app and build it.**

---

### Option B: Render

1. Go to https://render.com
2. New → Background Worker
3. Connect GitHub: `chitownjk/tiker`
4. Branch: `cloud-dev`
5. Root Directory: `cloud-worker`
6. Build Command: `npm install && npm run build`
7. Start Command: `npm start`
8. Set environment variables (see below)
9. Create Service

---

## Step 3: Environment Variables

Set these in Railway/Render dashboard:

```bash
# Supabase (same as main app)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SECRET_KEY=your-service-role-key

# Redis (from Upstash)
REDIS_HOST=usw1-xxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-password (if using Upstash)

# Encryption (MUST match main app)
ENCRYPTION_KEY=<copy from main app env>

# Our API Keys (for cloud-our-keys mode)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-... (optional)

# Worker Config
WORKER_CONCURRENCY=5
NODE_ENV=production
```

**Critical:** `ENCRYPTION_KEY` must match exactly what's in the main app, or decryption will fail!

---

## Step 4: Update Main App Environment Variables

Add Redis config to main app (Vercel):

**If using Fly.io Redis:**
```bash
REDIS_URL=redis://default:password@region.fly.dev:6379
```

**If using Upstash:**
```bash
REDIS_HOST=usw1-xxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-password (if any)
```

This lets the `/api/tasks/enqueue` endpoint connect to Redis.

---

## Step 5: Run Database Migration

Apply the cloud support migration:

1. Go to Supabase dashboard
2. SQL Editor
3. Paste contents of `supabase/migrations/004-cloud-support.sql`
4. Run it

**This adds:**
- `execution_mode` column
- `api_keys` column
- `model_usage` table

---

## Step 6: Test End-to-End

### 1. Set Execution Mode

1. Go to Settings → Execution
2. Choose "Cloud - Your Keys"
3. Enter Anthropic API key
4. Save

### 2. Create Test Task

1. Go to Command
2. Create task: "Write a haiku about coding"
3. Assign to any agent
4. Watch status change: `inbox` → `executing` → `done`

### 3. Check Worker Logs

In Railway/Render dashboard:
- Go to Logs tab
- Should see:
  ```
  [Worker] Processing task xxx
  [Worker] ✓ Task xxx completed
  ```

---

## Troubleshooting

### Worker not picking up tasks

**Check:**
1. Redis connection (REDIS_HOST/PORT correct?)
2. Worker is running (Railway/Render shows "Deployed"?)
3. Task was enqueued (check Redis or task status)

**Debug:**
```bash
# Check Redis has jobs
redis-cli -h your-host -p 6379 -a your-password
> KEYS *
> LRANGE bull:tiker-tasks:wait 0 -1
```

---

### Task stuck in "executing"

**Possible causes:**
1. Worker crashed (check logs)
2. API key invalid (check encryption/decryption)
3. Model API error (check Anthropic status)

**Fix:**
- Check worker logs for errors
- Verify ENCRYPTION_KEY matches between app and worker
- Test API key manually

---

### Decryption errors

**Error:** `Decryption failed`

**Cause:** ENCRYPTION_KEY mismatch between app and worker

**Fix:**
1. Copy exact `ENCRYPTION_KEY` from main app env
2. Set it in worker env
3. Redeploy worker

---

## Costs

**Free tier (Fly.io - Recommended):**
- Redis: Fly.io Redis free (256MB)
- Worker: 3 free shared-cpu VMs
- Total: $0/month (forever, not a trial!)

**Alternative (Upstash + Railway):**
- Redis: Upstash free (10K commands/day)
- Worker: Railway free ($5 credit/month)
- Total: $0/month for testing

**Paid (when you scale):**
- Fly.io: ~$2/mo per worker (beyond free tier)
- Redis: ~$2/mo for more memory
- Total: ~$4-10/mo

**Note:** Model costs (Anthropic/OpenAI) are separate - either user pays (cloud-user-keys) or we pay (cloud-our-keys).

---

## Next Steps After Deploy

1. **Test all execution modes:**
   - OpenClaw (should still work)
   - Cloud with user keys
   - Cloud with our keys (once you add ANTHROPIC_API_KEY)

2. **Monitor usage:**
   - Check `model_usage` table
   - Track costs per account

3. **Add pricing page:**
   - Show execution mode pricing
   - Add Stripe integration

4. **Launch! 🚀**

---

## Architecture Diagram

```
User creates task → Next.js app
                      ↓
              Saves to Supabase
                      ↓
        Checks execution_mode
                      ↓
    If cloud → POST /api/tasks/enqueue
                      ↓
              Redis queue (Upstash)
                      ↓
        Cloud Worker picks up (Railway/Render)
                      ↓
            Loads agent + account
                      ↓
          Decrypts API keys
                      ↓
        Calls Anthropic/OpenAI
                      ↓
      Posts result to Supabase
                      ↓
          Updates task status
                      ↓
      User sees completed task! ✅
```

---

**Ready to deploy?** Follow steps 1-6 and you're live! 🚀
