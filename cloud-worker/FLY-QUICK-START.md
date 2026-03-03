# Fly.io Quick Start - 10 Minutes ⚡

Deploy the cloud worker to Fly.io with Redis in 3 commands.

---

## 1. Install Fly CLI (1 min)

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

---

## 2. Create Redis (2 min)

```bash
fly redis create tiker-redis --region sjc
```

**Copy the `redis://...` URL it gives you.**

---

## 3. Deploy Worker (5 min)

```bash
cd cloud-worker

# Launch (first time only)
fly launch --no-deploy

# Set secrets
fly secrets set \
  NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co" \
  SUPABASE_SECRET_KEY="your-service-role-key" \
  ENCRYPTION_KEY="your-encryption-key" \
  ANTHROPIC_API_KEY="sk-ant-..." \
  REDIS_URL="redis://... (from step 2)"

# Deploy!
fly deploy
```

---

## 4. Verify (1 min)

```bash
fly status
fly logs
```

You should see:
```
[Worker] Cloud worker started
[Worker] Concurrency: 5
```

---

## Done! ✅

Worker is live and ready to process tasks.

---

## Next Steps

1. **Add REDIS_URL to Vercel** (main app env)
2. **Run migration** (004-cloud-support.sql in Supabase)
3. **Test it:**
   - Go to Settings → Execution
   - Choose "Cloud - Your Keys"
   - Add Anthropic API key
   - Create test task
   - Watch it execute!

---

## Useful Commands

```bash
# Check status
fly status

# View logs (live)
fly logs

# SSH into worker (debug)
fly ssh console

# Scale workers
fly scale count 2

# Restart worker
fly deploy --strategy immediate
```

---

## Troubleshooting

**Worker not starting:**
```bash
fly logs
# Check for ENCRYPTION_KEY or API key errors
```

**Redis connection failed:**
```bash
fly redis list
# Verify redis://... URL is correct
```

**Task not executing:**
```bash
# Check if task was enqueued
fly ssh console
redis-cli -u $REDIS_URL
> KEYS *
> LRANGE bull:tiker-tasks:wait 0 -1
```

---

## Costs

**Free tier (Fly.io):**
- 3 shared-cpu VMs: **FREE**
- Redis 256MB: **FREE**
- Outbound bandwidth: 100GB/mo free

**Total: $0/month** ✅

**If you scale beyond free tier:**
- Additional VMs: ~$2/mo each
- More Redis memory: ~$2/mo
- Still very cheap!

---

## Why Fly.io?

- ✅ Actually free (not a trial)
- ✅ Built-in Redis
- ✅ One command deploy
- ✅ Auto-restart on crash
- ✅ Global edge network
- ✅ Great for background workers

**Perfect for this use case.** 🚀
