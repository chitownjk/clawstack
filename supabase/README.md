# Tiker Database Setup

## Quick Start (Self-Hosted)

Run SQL files in order using Supabase SQL Editor or `psql`:

```bash
# Apply all migrations in order
for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done
```

All migrations are idempotent — safe to re-run on an existing database.

## Migration Index

| File | Description | Required |
|------|-------------|----------|
| `001-accounts.sql` | Users, accounts, auth foundations | ✅ Yes |
| `002-command.sql` | Tasks, agents, comments, activities | ✅ Yes |
| `003-hub.sql` | Templates, patterns (Hub feature) | Optional |
| `004-cloud-support.sql` | Cloud execution modes, billing columns, Stripe fields, model usage tracking | Cloud only |
| `005-trial-logic.sql` | Trial tracking, onboarding state, subscription status | Cloud only |
| `006-usage-tracking.sql` | Monthly usage table, per-task cost tracking | Cloud only |
| `007-feature-flags.sql` | `features` JSONB column, tier-driven feature gates | Cloud only |
| `008-available-agents.sql` | Agent catalog, per-account agent enablement | Cloud only |
| `009-agent-templates.sql` | Starter agent template seeding | Optional |
| `010-file-storage.sql` | File attachment metadata | Optional |
| `011-google-oauth.sql` | Google OAuth token storage | Optional |
| `012-email-signature.sql` | User email signature storage | Optional |
| `013-agentmail.sql` | AgentMail inbound routing | Optional |
| `014-github-oauth.sql` | GitHub OAuth token storage | Optional |
| `015-external-email-participants.sql` | Track external email CC/BCC participants | Optional |
| `016-consumer-views.sql` | Simplified consumer-mode views | Cloud only |
| `017-agent-comment-attribution.sql` | Link comments to the agent that created them | Optional |
| `018-recurring-tasks.sql` | Recurring task schedules | Optional |
| `019-briefings.sql` | Daily AI briefing storage | Cloud only |
| `020-reminders.sql` | Reminder/nudge scheduling | Optional |
| `021-smart-lists.sql` | Saved smart-filter lists | Optional |
| `022-admin-role.sql` | Admin role column on accounts | Optional |
| `023-actions.sql` | Action library (quick-run templates) | Optional |
| `025-consumer-mode.sql` | Consumer-mode flag and simplified UX state | Cloud only |
| `026-agent-jobs.sql` | Background job queue for agents | Cloud only |
| `027-tier-name-aliases.sql` | Aliases for tier names (solo/developer/team) | Cloud only |
| `028-tiker-email.sql` | `tiker_username` column for `user@tiker.com` routing | Cloud only |

> **Note:** Migration `024` was intentionally skipped — the numbering gap is expected and causes no issues.

## Naming Convention

```
NNN-description.sql
```

- `NNN` — zero-padded three-digit sequence number (001, 002, … 028)
- `description` — lowercase, hyphen-separated, concise noun phrase
- Each file is **idempotent**: uses `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, and `DROP TRIGGER IF EXISTS` before re-creating triggers

**Do not create two files with the same prefix number.** If a migration needs to be amended after deployment, add a new file with the next sequence number rather than a `-fix` suffix.

## Database Options

Tiker works with any Postgres 14+ database:

| Provider | Notes |
|----------|-------|
| **Supabase** | Recommended for cloud. Free tier available. |
| **Local Postgres** | Full control. Use `AUTH_MODE=local` or `password`. |
| **Neon** | Serverless Postgres. |
| **Railway** | Easy deploy. |
| **AWS RDS** | Enterprise scale. |

## Row Level Security

All tables use RLS policies. Users can only access their own data. The service role bypasses RLS (used by API routes).

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

**"relation already exists"** — Safe to ignore. All migrations use `IF NOT EXISTS`.

**"column already exists"** — Safe to ignore. All `ALTER TABLE ADD COLUMN` statements use `IF NOT EXISTS`.

**"policy already exists"** — All migrations use `DROP POLICY IF EXISTS` before creating. Re-run is safe.
