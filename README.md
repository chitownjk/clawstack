# Tiker

**Your life, handled.**

Tiker is an AI-powered life operating system. It manages your tasks, scans your email for action items, preps you for meetings, tracks your bills, and coordinates everything from a single daily briefing. Think of it as a personal chief of staff that actually remembers what you told it yesterday.

Built in the open. Self-hostable. Free to start.

[Website](https://tiker.com) | [Blog](https://tiker.com/blog) | [Sign Up](https://tiker.com/start)

---

## What Tiker Does

**Daily Briefing** -- Start every morning with a personalized summary of your day: what is on your calendar, what needs your attention, and what your AI assistants handled overnight.

**Email Intelligence** -- Tiker scans your inbox and pulls out flights, hotel reservations, bills, subscription renewals, meeting invites, and action items. No more digging through email to find that confirmation number.

**Smart Task Management** -- Create tasks in natural language ("Plan Jake's birthday party") and let AI break them down, research options, and handle the boring parts. You approve, it executes.

**Meeting Prep** -- Before every meeting, Tiker looks up your attendees, pulls relevant context from past conversations, and gives you talking points so you walk in prepared.

**Proactive Suggestions** -- Based on your tasks, calendar, and email patterns, Tiker suggests things you should probably do before they become urgent.

**Integrations** -- Connects to Gmail, Google Calendar, Slack, LinkedIn, and more through one-click OAuth. Your tools work together instead of in silos.

---

## Quick Start (Cloud)

The fastest way to use Tiker:

1. Go to [tiker.com/start](https://tiker.com/start)
2. Sign in with Google
3. Connect your email and calendar
4. Get your first daily briefing

That is it. No installation, no configuration, no database setup.

---

## Self-Hosted Setup

Tiker is fully open source (MIT) and designed to run on your own infrastructure.

### Prerequisites

Node.js 18+, a PostgreSQL database (Supabase recommended), and about 10 minutes.

### 1. Clone and install

```bash
git clone https://github.com/chitownjk/tiker.git
cd tiker/app
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```bash
# Supabase (recommended)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Encryption (required -- generate with: openssl rand -base64 32)
ENCRYPTION_KEY=your-encryption-key-min-32-chars

# Auth
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
```

### 3. Run database migrations

Run the SQL files in `supabase/migrations/` in order, either through the Supabase SQL Editor or directly against your Postgres instance:

```bash
psql -d tiker -f supabase/migrations/001-accounts.sql
psql -d tiker -f supabase/migrations/002-command.sql
# ... continue through all numbered migrations
```

### 4. Start the app

```bash
npm run dev
```

Visit http://localhost:3000.

### Docker

```bash
cp app/.env.example .env.local
# Edit .env.local with your values
docker-compose up -d
```

---

## Authentication

Tiker supports three auth modes:

**Supabase Auth (default)** -- Google SSO via Supabase. Best for cloud and team deployments. No extra config needed if using Supabase.

**Local Mode** -- No login required. Single user assumed. Set `AUTH_MODE=local`. Only use on localhost or trusted networks.

**Password Auth** -- Simple password login. Set `AUTH_MODE=password` and `LOCAL_ADMIN_PASSWORD=your-password`. Good for self-hosted installs without Google/Supabase.

---

## Security

All sensitive data (task titles, descriptions, comments) is encrypted with AES-256-GCM before storage. The encryption key never touches the database.

Optional 2FA (TOTP) is available for write access. Sessions last 30 days.

Never commit your `.env.local` file. Generate strong keys with `openssl rand -base64 32`.

---

## Project Structure

```
tiker/
  app/               Next.js web application
    src/
      app/           App router (pages and API routes)
      components/    React components
      hooks/         Custom React hooks
      lib/           Utilities (crypto, supabase, blog, etc.)
  cli/               Command-line interface for agents
  cloud-worker/      Background job processing
  content/blog/      Blog posts (markdown with frontmatter)
  supabase/          Database migrations
  docker-compose.yml Docker deployment
```

---

## Advanced: Agent Coordination

For technical users and teams running AI agents, Tiker includes a full coordination layer. Toggle to Advanced Mode in Settings to access:

**Multi-agent task board** -- Assign tasks to specific AI agents, track their status in real time, and review their work before it goes live.

**Agent heartbeats** -- Agents check in periodically, pick up new tasks, and report progress automatically via the CLI.

**Hub** -- A shared pattern library at [tiker.com/hub](https://tiker.com/hub) where the community contributes coordination patterns, agent templates, and best practices.

```bash
# Install the CLI
npm install -g @tiker/command-cli

# Agent heartbeat
npx @tiker/command-cli heartbeat --agent "YourAgent"
```

---

## Contributing

Contributions are welcome. Areas where help is especially appreciated: new integrations, mobile experience, accessibility, and documentation.

Please open an issue before starting major changes.

---

## License

MIT License.

---

## Links

[Website](https://tiker.com) | [Blog](https://tiker.com/blog) | [GitHub Issues](https://github.com/chitownjk/tiker/issues)
