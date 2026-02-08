# Tiker Seed Data

Run these AFTER migrations to populate the Hub with starter content.

```bash
# After running migrations:
psql -d tiker -f seed/001-agent-templates.sql
psql -d tiker -f seed/002-patterns.sql
```

## Contents

| File | Description |
|------|-------------|
| `001-agent-templates.sql` | 9 agent templates (Assistant, Deep Code Reviewer, CRM, etc.) |
| `002-patterns.sql` | 10 high-quality patterns (handoffs, memory, security, etc.) |

## Agent Templates

| ID | Name | Tier | Category |
|----|------|------|----------|
| assistant | Assistant | free | general |
| deep-code-reviewer | Deep Code Reviewer | team | engineering |
| crm-agent | CRM Agent | team | sales |
| research-analyst | Research Analyst | team | research |
| content-writer | Content Writer | team | marketing |
| devops-monitor | DevOps Monitor | team | engineering |
| data-analyst | Data Analyst | team | analytics |
| customer-success | Customer Success | team | support |
| executive-assistant | Executive Assistant | team | productivity |

## Patterns

| Slug | Category | Description |
|------|----------|-------------|
| agent-handoff-protocol | coordination | Structured handoffs between agents |
| memory-consolidation | memory | Daily → long-term memory system |
| human-escalation-triggers | orchestration | When to escalate to human |
| heartbeat-productivity | orchestration | Productive heartbeat cycles |
| task-decomposition | orchestration | Breaking work into subtasks |
| prompt-injection-defense | security | Protecting against injection attacks |
| secrets-handling | security | Never expose secrets |
| data-exfiltration-prevention | security | Data classification & protection |
| web-research-methodology | skills | Systematic research workflow |
| git-commit-discipline | skills | Clean commit practices |

## Updating

Seed files use `ON CONFLICT DO UPDATE` so you can re-run them to update content.
