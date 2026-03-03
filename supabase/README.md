# Tiker Database Setup

## Quick Start (Self-Hosted)

Run these SQL files in order using Supabase SQL Editor or `psql`:

```sql
-- 1. Core tables (accounts, bots)
migrations/001-accounts.sql

-- 2. Command center (tasks, agents, comments, activities)
migrations/002-command.sql
```

**That's it!** You now have a working Command center.

## Hub (Optional)

The **Hub** is Tiker's shared knowledge base — agent templates, coordination patterns, and best practices contributed by the community.

**For self-hosted installs, we recommend using the central Hub at [tiker.com/hub](https://tiker.com/hub)** rather than running your own. Benefits:

- Access 100+ community-contributed patterns
- No additional tables to maintain
- Patterns stay updated as community improves them
- Your contributions help everyone

If you need a fully air-gapped install with private patterns, you can optionally run:

```sql
-- 3. Hub tables (optional - for air-gapped/private installs only)
migrations/003-hub.sql

-- Seed data (if running local Hub)
seed/agent-templates.sql
seed/patterns.sql
```

## Roadmap

We're building deeper Hub integration for self-hosted installs:

| Phase | Feature | Status |
|-------|---------|--------|
| **MVP** | Central Hub at tiker.com, OSS links out | ✅ Now |
| **Phase 2** | Hub API — search/import patterns programmatically | 🔜 Coming |
| **Phase 3** | Contribute from self-hosted → central Hub | 🔜 Coming |

## File Overview

```
supabase/
├── migrations/
│   ├── 001-accounts.sql    # Users, bots, auth (required)
│   ├── 002-command.sql     # Tasks, agents, comments (required)
│   └── 003-hub.sql         # Templates, patterns (optional)
└── seed/
    ├── agent-templates.sql # Starter personas (if using local Hub)
    └── patterns.sql        # Example patterns (if using local Hub)
```

## Database Options

Tiker works with any Postgres database:

| Provider | Notes |
|----------|-------|
| **Supabase** | Recommended for cloud. Free tier available. |
| **Local Postgres** | Full control. Use `AUTH_MODE=local` or `password`. |
| **Neon** | Serverless Postgres. |
| **Railway** | Easy deploy. |
| **AWS RDS** | Enterprise scale. |

## Row Level Security

All tables use RLS policies:
- Users can only access their own data
- Service role bypasses RLS (for API routes)

## Encryption

Task titles, descriptions, and comments are **encrypted by the app** before storage. The database stores ciphertext — even with DB access, content is unreadable without the encryption key.

## Auth Modes

Set `AUTH_MODE` in your `.env`:

| Mode | Description |
|------|-------------|
| `supabase` | Google SSO via Supabase Auth (default) |
| `local` | No auth — single user, local dev |
| `password` | Simple password login |

## Troubleshooting

**"relation already exists"** — Safe to ignore. `CREATE TABLE IF NOT EXISTS` skips existing tables.

**"policy already exists"** — All migrations use `DROP POLICY IF EXISTS` before creating. Re-run is safe.

**Missing columns on existing tables** — If you have old tables, the migrations won't add new columns. Drop and recreate, or manually `ALTER TABLE ADD COLUMN`.
