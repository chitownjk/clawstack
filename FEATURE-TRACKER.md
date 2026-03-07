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
| 9 | Gmail Scan: Bills & Due Dates | Not Started | P0 #3 | In email/scan | Already supported in classification (type: "bill"). Needs recurring sender patterns. |
| 10 | Gmail Scan: Unresponded Invites | Not Started | P0 #3 | In email/scan | Flag calendar invites with no RSVP. |
| 11 | Meeting Prep: Attendee Lookup | Not Started | None | `app/src/app/api/meeting-prep/[eventId]/route.ts` | LinkedIn via Composio. |
| 12 | Meeting Prep: Prior Context | Not Started | #11 | In meeting-prep route | Search tasks/comments by attendee. |
| 13 | Meeting Prep: Briefing Card | Not Started | #11, #12 | `app/src/components/MeetingPrepCard.tsx` | Attendee bios, talking points. |
| 14 | Smart Reminders: Escalation | Not Started | None | `app/src/app/api/reminders/route.ts`, new reminders table | Re-notify at +1d, +3d, +7d. |
| 15 | Briefing Email Delivery | Not Started | P0 #2, #8 | `app/src/components/BriefingEmail.tsx` | HTML email via Nodemailer or Resend. TODO stub in cron route. |
| 16 | User Preferences: Briefing | Not Started | P0 #5 | Settings UI, user_preferences table | Delivery time, email opt-in, sections. DB columns already added. |
| 17 | Landing Page Rewrite | Not Started | None | `app/src/app/page.tsx` | New hero, messaging. "Your life, handled." |
| 18 | Fix Broken Integrations | Not Started | None | Settings/connections | X/Twitter broken. LinkedIn untested. |

## P2: Intelligence Layer (Weeks 5-10)

| # | Feature | Status | Depends On | Files | Notes |
|---|---------|--------|------------|-------|-------|
| 19 | Email Action Item Extraction | Not Started | P0 #3 | In email/scan | Already supported (type: "action_item"). Needs UX for task creation. |
| 20 | Subscription & Trial Tracker | Not Started | P1 #9 | New component | Detect recurring charges, trial expiry. |
| 21 | Life Admin Research Agent | Not Started | None | New agent type | Web search + checklist generation. |
| 22 | Contextual Smart Lists | Not Started | None | `SmartListView.tsx` | Shopping, errands, packing. Calendar-aware. |
| 23 | Proactive Suggestions Engine | Not Started | P0 #2, P1 #9-12 | `app/src/app/api/suggestions/route.ts` | Pattern analysis across all data. |
| 24 | Integration Passive Value | Not Started | P0/P1 | Per-integration | Each integration auto-surfaces insights. |
| 25 | Push Notifications (Web) | Not Started | P1 #14 | Service worker | Permission flow. Briefing + reminder delivery. |
| 26 | Mobile-First Briefing View | Not Started | P0 #5 | DailyBriefing.tsx | Swipeable cards. Touch-optimized. |

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
| P0 #1-#8: Full briefing system | 2026-03-07 | DB migration, briefing engine, Gmail scan, auto-create events, tab redesign, cron job |
| Google Calendar sync (events display) | 2026-03-07 | Fixed Composio slug to GOOGLECALENDAR_EVENTS_LIST |
| Card modal layout redesign | 2026-03-07 | Split status/actions into two rows |
| Consolidate briefing activity section | 2026-03-07 | Filter heartbeats, rename to AI Activity |
| Dark mode support | Prior session | Tailwind dark: prefix throughout |
| Calendar view (click-to-create) | Prior session | Weekly grid with event creation |
| Recurring tasks | Prior session | Daily/weekly/monthly recurrence |
