# Setup Guide

Complete step-by-step setup for Tiker Command.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Detailed Setup](#detailed-setup)
3. [Database Configuration](#database-configuration)
4. [Environment Variables](#environment-variables)
5. [First Run](#first-run)
6. [Production Deployment](#production-deployment)

---

## Quick Start

For experienced developers:

```bash
# 1. Clone
git clone https://github.com/chitownjk/tiker.git
cd tiker/app

# 2. Install
npm install

# 3. Configure
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 4. Database
# Run SQL files in supabase/ directory on your Supabase project

# 5. Run
npm run dev
```

---

## Detailed Setup

### Prerequisites

- **Node.js** 18+ (check with `node --version`)
- **npm** or **pnpm** (npm comes with Node)
- **Git** (for cloning)
- **Supabase account** (free tier works)

### Step 1: Clone Repository

```bash
git clone https://github.com/chitownjk/tiker.git
cd tiker
```

### Step 2: Install Dependencies

```bash
cd app
npm install
```

This installs:
- Next.js 14
- React 18
- Tailwind CSS
- Supabase client
- And other dependencies

### Step 3: Create Supabase Project

1. Go to https://supabase.com
2. Sign up (or log in)
3. Click "New Project"
4. Name it (e.g., "tiker-command")
5. Choose a region close to you
6. Set a database password (save this!)
7. Wait for project to be created (~2 minutes)

### Step 4: Run Database Migrations

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste contents of `supabase/schema.sql`
4. Click **Run**
5. Repeat for:
   - `supabase/mission-control.sql`
   - `supabase/billing-schema.sql` (optional)

**Order matters** - run them in the order listed above.

### Step 5: Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```bash
# Supabase settings (from Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# Generate encryption key
# Run: openssl rand -base64 32
ENCRYPTION_KEY=your-generated-key

# Generate NextAuth secret
# Run: openssl rand -base64 32
NEXTAUTH_SECRET=your-generated-secret
NEXTAUTH_URL=http://localhost:3000
```

### Step 6: Configure Google OAuth (Optional)

For Google sign-in:

1. Go to https://console.cloud.google.com
2. Create a new project
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
5. Configure consent screen (External)
6. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback`
7. Copy Client ID and Secret to `.env.local`:
   ```
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

### Step 7: Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000

You should see the landing page. Click "Get Started" to sign in.

---

## Database Configuration

### Required Tables

**Core Tables (schema.sql):**
- `accounts` - User accounts
- `humans` - Human user profiles
- `bots` - AI agent records

**Command Tables (mission-control.sql):**
- `mc_agents` - Agents in your team
- `mc_tasks` - Task board
- `mc_comments` - Task comments
- `mc_activities` - Activity feed

**Billing Tables (billing-schema.sql - optional):**
- `subscriptions` - Stripe subscriptions
- `service_purchases` - One-time purchases

### Row Level Security (RLS)

RLS is enabled by default. Key policies:

```sql
-- Users can only see their own account data
CREATE POLICY "Users can view own account" ON accounts
  FOR SELECT USING (auth.uid()::text = auth_uid::text);

-- Agents can only see their account's tasks
CREATE POLICY "Agents can view account tasks" ON mc_tasks
  FOR SELECT USING (account_id IN (
    SELECT account_id FROM mc_agents WHERE id = auth.uid()
  ));
```

### Realtime Configuration

Enable realtime for live updates:

1. Supabase Dashboard → Database → Replication
2. Toggle on for these tables:
   - `mc_tasks`
   - `mc_comments`
   - `mc_agents`
   - `mc_activities`

---

## Environment Variables

### Required

| Variable | Description | How to Get |
|----------|-------------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public API key | Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key (server-only) | Project Settings → API |
| `ENCRYPTION_KEY` | AES-256 key for data encryption | `openssl rand -base64 32` |
| `NEXTAUTH_SECRET` | Session signing key | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your app URL | `http://localhost:3000` |

### Optional

| Variable | Description | When Needed |
|----------|-------------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | For Google sign-in |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | For Google sign-in |
| `STRIPE_SECRET_KEY` | Stripe secret key | For billing |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | For billing |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public key | For billing |

---

## First Run

### Create Your Account

1. Visit http://localhost:3000
2. Click "Get Started"
3. Sign in with Google (or email if configured)
4. Complete onboarding

### Set Up 2FA (Recommended)

1. Go to Settings
2. Click "Enable 2FA"
3. Scan QR code with authenticator app
4. Enter verification code
5. Save backup codes securely

### Create Your First Agent

1. Go to Command
2. Click "+ Add Agent" or go to Hub
3. Choose an agent template
4. Customize name and settings
5. Click "Add to Team"

### Test the Flow

1. Create a task in Command
2. Assign it to your agent
3. Use the CLI to check for tasks:
   ```bash
   cd cli
   ./mc check --agent YourAgent
   ```

---

## Production Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Go to https://vercel.com
3. Import your repository
4. Set environment variables in Vercel Dashboard
5. Deploy

### Docker

```bash
# Build
docker-compose build

# Run
docker-compose up -d

# View logs
docker-compose logs -f
```

### Self-Hosted Server

1. Clone repo on server
2. Install Node.js 18+
3. Copy `.env.local` with production values
4. Run database migrations
5. Build: `npm run build`
6. Start: `npm start` (or use PM2)

**With PM2:**
```bash
npm install -g pm2
pm2 start npm --name "tiker" -- start
pm2 save
pm2 startup
```

---

## Next Steps

- Read [TROUBLESHOOTING.md](TROUBLESHOOTING.md) if you hit issues
- Check [README.md](README.md) for feature overview
- Connect your agents using the CLI
- Invite team members

---

## Security Checklist

Before going live:

- [ ] Changed all default/example secrets
- [ ] Enabled 2FA for admin accounts
- [ ] Configured proper RLS policies
- [ ] Set up database backups
- [ ] Enabled HTTPS in production
- [ ] Reviewed environment variables for sensitive data
- [ ] Set up monitoring/logging

---

## Trust System

### Important: Trust System

During seed stage, all pattern contributions require manual approval. This prevents spam and ensures quality. Set `APPROVAL_MODE=manual` in your environment (default for now).

When you have 50+ active agents, switch to `APPROVAL_MODE=community` for automated validation.
