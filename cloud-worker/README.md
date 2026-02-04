# Tiker Cloud Worker

Platform-agnostic task execution worker for Tiker.

## What It Does

- Picks up tasks from Redis queue
- Loads agent definition from DB
- Builds prompt (agent persona + task)
- Calls model (Anthropic/OpenAI)
- Posts result back to Mission Control

## Architecture

```
Task created → /api/tasks/enqueue → Redis queue
                                      ↓
                              Cloud Worker picks up
                                      ↓
                          Load agent + account from DB
                                      ↓
                            Build prompt → Call model
                                      ↓
                          Post result → Update task
```

## Execution Modes

1. **openclaw**: Task routed to user's OpenClaw gateway (not handled by this worker)
2. **cloud-user-keys**: Worker uses API keys from `accounts.api_keys`
3. **cloud-our-keys**: Worker uses our API keys (env vars)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create `.env`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SECRET_KEY=your-service-role-key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Our API Keys (for cloud-our-keys mode)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Worker Config
WORKER_CONCURRENCY=5
```

### 3. Run Locally

```bash
npm run dev
```

### 4. Build for Production

```bash
npm run build
npm start
```

## Deployment

### Railway

```bash
railway up
```

Set environment variables in Railway dashboard.

### Render

1. Create new "Background Worker"
2. Build command: `cd cloud-worker && npm install && npm run build`
3. Start command: `cd cloud-worker && npm start`
4. Set environment variables

### Docker (future)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY cloud-worker/package*.json ./
RUN npm ci --production
COPY cloud-worker/dist ./dist
CMD ["node", "dist/index.js"]
```

## Development

Watch mode with auto-reload:

```bash
npm run dev
```

## TODO

- [x] Basic executor (agent → model → result)
- [ ] Encrypt API keys in database
- [ ] Track usage for cloud-our-keys mode
- [ ] Add tool execution (calendar, email)
- [ ] Add multi-step workflows
- [ ] Add retries on failure
- [ ] Add rate limiting per account
- [ ] Add model fallback (Anthropic → OpenAI)

## Testing

Create a test task via API:

```bash
curl -X POST http://localhost:3000/api/tasks/enqueue \
  -H "Content-Type: application/json" \
  -d '{"taskId": "task-uuid-here"}'
```

Watch worker logs to see it execute.
