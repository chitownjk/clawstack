# Tiker Feature Tracker

**Last updated:** 2026-03-07
**Ref docs:** TIKER-PRODUCT-VISION.docx | TIKER-ENGINEERING-SPEC.docx

---

## P0: Ship Immediately (Weeks 1-2)

| # | Feature | Status | Depends On | Files | Notes |
|---|---------|--------|------------|-------|-------|
| 1 | Briefings DB migration | Done | None | `supabase/migrations/019-briefings.sql` | briefings + extracted_items tables. Run migration against Supabase. |
| 2 | Briefing Engine API | Done | #1 | `app/src/app/api/briefing/generate/route.ts` | Pulls calendar, tasks, agent activity, extracted items. Claude Haiku synthesis. Conflict detection built in. |
| 3 | Gmail Scan: Flights & Hotels | Done | None | `app/src/app/api/email/scan/route.ts` | Composio GMAIL_LIST_MESSAGES with slug fallback. AI classification for 7 item types. |
| 4 | Auto-Create Calendar Events | Done | #3 | `app/src/app/api/email/extract/route.ts` | Composio GOOGLECALENDAR_EVENTS_CREATE. Supports flight, hotel, invite. Dismiss/acknowledge actions. |
| 5 | Briefing Tab Redesign | Done | #2 | `app/src/components/DailyBriefing.tsx` | AI summary, attention items, email intelligence section, suggestions. Full rewrite. |
| 6 | Default View: Briefing | Done (prior) | #5 | `app/src/app/command/client.tsx` | Already defaults to 'briefing'. |
| 7 | Calendar Conflict Detection | Done | #2 | In briefing engine | findConflicts() compares timed events. Surfaces in AI attention_items. |
| 8 | Briefing Cron Job | Done | #2 | `app/src/app/api/briefing/cron/route.ts`, `app/vercel.json` | Vercel Cron at 10 UTC (6 AM ET). Per-user timezone + briefing_time. |

## P1: Ship Next (Weeks 3-4)

| # | Feature | Status | Depends On | Files | Notes |
|---|---------|--------|------------|-------|-------|
| 9 | Gmail Scan: Bills & Due Dates | Done | P0 #3 | In email/scan | Enhanced AI prompt with aggressive bill detection, is_recurring flag, bill categories. |
| 10 | Gmail Scan: Unresponded Invites | Done | P0 #3 | `app/src/app/api/email/invites/route.ts` | Checks GCal for responseStatus: needsAction/tentative. Stores as extracted_items. |
| 11 | Meeting Prep: Attendee Lookup | Done | None | `app/src/app/api/meeting-prep/route.ts` | LinkedIn via Composio with slug fallback. Email domain parsing fallback. |
| 12 | Meeting Prep: Prior Context | Done | #11 | In meeting-prep route | Searches tasks + activities by attendee name/email/event keywords. Decrypts encrypted fields. |
| 13 | Meeting Prep: Briefing Card | Done | #11, #12 | `app/src/components/MeetingPrepCard.tsx` | Attendee bios, talking points, questions. Wired into DailyBriefing calendar section. |
| 14 | Smart Reminders: Escalation | Done | None | `app/src/app/api/reminders/route.ts`, `supabase/migrations/020-reminders.sql` | 3-stage escalation (1d/3d/7d). Snooze, dismiss, complete. Email escalation flag. |
| 15 | Briefing Email Delivery | Done | P0 #2, #8 | `app/src/lib/briefing-email.ts` | HTML email via Nodemailer SMTP. Wired into cron route. Sends when briefing_email pref enabled. |
| 16 | User Preferences: Briefing | Done | P0 #5 | `app/src/app/settings/briefing/page.tsx` | Delivery time, timezone, email opt-in, section toggles, reminder escalation config. |
| 17 | Landing Page Rewrite | Done | None | `app/src/app/page.tsx` | "Your life, handled." New hero, problem section, 4 feature showcases with mockups, updated pricing with new features. |
| 18 | Fix Broken Integrations | Done | None | `app/src/lib/composio.ts` | Added toolkitFallbacks for Twitter (TWITTER_V2, X) and LinkedIn (LINKEDIN_V2). Connection check and initiation try fallback slugs. |

## P2: Intelligence Layer (Weeks 5-10)

| # | Feature | Status | Depends On | Files | Notes |
|---|---------|--------|------------|-------|-------|
| 19 | Email Action Item Extraction | Done | P0 #3 | `app/src/app/api/email/action-to-task/route.ts` | Converts extracted action_items to tasks. Creates task with encryption, marks item processed. |
| 20 | Subscription & Trial Tracker | Done | P1 #9 | `app/src/app/api/subscriptions/route.ts` | Groups subscription/bill items by service, calculates monthly total, tracks upcoming renewals and trials. |
| 21 | Life Admin Research Agent | Done | None | `app/src/app/api/agents/research/route.ts` | POST endpoint. AI generates structured research, auto-creates task + smart list. |
| 22 | Contextual Smart Lists | Done | None | `app/src/app/api/smart-lists/route.ts`, `supabase/migrations/021-smart-lists.sql` | CRUD with AI auto-generation. Types: shopping, errands, packing, prep, custom. |
| 23 | Proactive Suggestions Engine | Done | P0 #2, P1 #9-12 | `app/src/app/api/suggestions/route.ts` | Analyzes tasks, activities, extracted items, reminders. AI generates 3-5 actionable suggestions. |
| 24 | Integration Passive Value | Done | P0/P1 | `app/src/app/api/insights/route.ts` | Unified insights from calendar, tasks, email, reminders. Busy day, back-to-back, overdue, escalated. |
| 25 | Push Notifications (Web) | Done | P1 #14 | `app/public/sw.js`, `app/src/app/api/push/subscribe/route.ts` | Service worker with push events, notification click handlers, snooze/complete actions. Subscribe/unsubscribe API. |
| 26 | Mobile-First Briefing View | Done | P0 #5 | `app/src/components/DailyBriefing.tsx` | Mobile-responsive padding, stacked action buttons on small screens, touch-manipulation, line-clamp. |

## P3: Autonomy (Weeks 11-20)

| # | Feature | Status | Depends On | Files | Notes |
|---|---------|--------|------------|-------|-------|
| 27 | AI-Initiated Booking | Not Started | P2 #21 | TBD | Flights, restaurants, appointments. |
| 28 | Autonomous Task Completion | Not Started | P2 #21, #23 | TBD | Multi-step with approval gates. |
| 29 | Payment Integration (Plaid) | Not Started | P1 #9 | TBD | Financial awareness. |
| 30 | AI Phone Agent (ElevenLabs + Twilio) | Not Started | P2 #21 | TBD | Voice agent makes calls on your behalf. |
| 31 | Proactive Schedule Optimization | Not Started | P0 #7, P2 #23 | TBD | "No focus time today. Reschedule 3pm?" |
| 32 | Multi-Person Coordination | Not Started | P3 #27 | TBD | Family/team scheduling. |
| 33 | Voice Interface | Not Started | P3 #30 | TBD | "Hey Tiker, what's my day look like?" |
| 34 | Agent Marketplace | Not Started | P2 #21 | TBD | Third-party agents + integrations. |

## Future Ideas (Unscoped)

| Idea | Description | Status |
|------|-------------|--------|
| Browser Extension | Activity monitoring, one-click capture, purchase tracking, offer to finish tasks, contextual suggestions. Real-time intent data layer. | Concept |
| Native Mobile App | Push briefings, voice capture, location-aware reminders, widgets, offline capture. | Concept |
| Enterprise (SSO, audit, compliance) | For organizations. | Concept |

---

## Composio Slug Verification

| Service | Expected Slug | Purpose | Verified? |
|---------|---------------|---------|-----------|
| Calendar | GOOGLECALENDAR_EVENTS_LIST | Fetch events | Yes |
| Calendar | GOOGLECALENDAR_EVENTS_CREATE | Create events from extractions | No (slug fallback in place) |
| Gmail | GMAIL_LIST_MESSAGES | Scan inbox | No (slug fallback in place) |
| Gmail | GMAIL_GET_MESSAGE | Read full email | No (slug fallback in place) |
| Gmail | GMAIL_SEND_EMAIL | Send briefing email | No |
| LinkedIn | LINKEDIN_GET_PROFILE | Attendee lookup | No |

---

## Previously Completed (This Sprint)

| Feature | Date | Commit |
|---------|------|--------|
| P1 #11-13: Meeting prep system | 2026-03-07 | Attendee lookup (LinkedIn + email), prior context search, MeetingPrepCard component |
| P1 #14: Smart reminders | 2026-03-07 | Migration 020, reminders API with 3-stage escalation, snooze/dismiss/complete |
| P1 #16: Briefing settings | 2026-03-07 | Settings page with time, timezone, email, section toggles, reminder config |
| P1 #17: Landing page rewrite | 2026-03-07 | "Your life, handled." New hero, problem, features, pricing with life operator positioning |
| P0 #1-#8: Full briefing system | 2026-03-07 | DB migration, briefing engine, Gmail scan, auto-create events, tab redesign, cron job |
| Google Calendar sync (events display) | 2026-03-07 | Fixed Composio slug to GOOGLECALENDAR_EVENTS_LIST |
| Card modal layout redesign | 2026-03-07 | Split status/actions into two rows |
| Consolidate briefing activity section | 2026-03-07 | Filter heartbeats, rename to AI Activity |
| Dark mode support | Prior session | Tailwind dark: prefix throughout |
| Calendar view (click-to-create) | Prior session | Weekly grid with event creation |
| Recurring tasks | Prior session | Daily/weekly/monthly recurrence |
