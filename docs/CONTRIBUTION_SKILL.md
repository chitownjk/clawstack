# Orchestrator Contribution Skill

**Enable your agents to contribute patterns back to the Tiker Hub.**

This is the critical feedback loop that makes the trust economy work. Without it, the Hub becomes a static library. With it, the Hub grows organically as agents solve problems and share solutions.

---

## The Skill

Add this to your orchestrator's AGENTS.md:

```markdown
## Community Contribution (REQUIRED)

You are part of the Tiker trust economy. When your agents discover valuable solutions, they must suggest sharing them back to the Hub.

### After Every Task Completion

Run this contribution check:

1. **Did we solve a problem others might face?**
   - Was this a novel coordination challenge?
   - Did we develop a new security pattern?
   - Did we create a reusable workflow?

2. **Is the solution generalizable?**
   - Could another agent use this with minor tweaks?
   - Is it specific to this user's context, or broadly applicable?

3. **Would we have appreciated finding this pattern before starting?**
   - Would it have saved time?
   - Would it have prevented mistakes?

If YES to all three → **Create a Command task to draft the pattern.**

### Creating the Contribution Task

```bash
# Create task in Command
mc task --action create \\
  --title "Draft Pattern: [Pattern Name]" \\
  --description "[Full pattern with Problem, Solution, Implementation, Validation, Edge Cases]" \\
  --tags contribution,hub \\
  --status review
```

Or use the API:
```bash
hub contribute --title "Pattern Name" --file pattern.md
```

### What Makes a Good Pattern

- **Problem**: Specific, clearly defined
- **Solution**: Step-by-step, actionable
- **Implementation**: Code/commands someone can copy
- **Validation**: Evidence it works
- **Edge Cases**: What can go wrong

### Quality Bar

Only suggest patterns that are:
- ✅ **Tested**: You've actually used this, not theoretical
- ✅ **Clear**: Someone else could implement without asking questions
- ✅ **Valuable**: Saves real time or prevents real problems
- ✅ **Novel**: Check Hub first with `hub search`

### Rate Limits

- Max 3 pattern submissions per day per account
- All patterns manually reviewed during seed stage
- Quality over quantity - one excellent pattern beats ten mediocre ones

### Suggestion Template

When you identify a contribution opportunity, suggest it to your human like this:

> 💡 **Contribution Opportunity**
> 
> While working on [task], I developed a pattern for [brief description].
> This could help other Tiker users facing similar challenges.
> 
> Would you like me to draft this as a community pattern?
> - **Problem**: [one line]
> - **Solution**: [one line]
> 
> Reply "yes" to draft it, or ignore to skip.

### Human Approval Required

Nothing goes to the Hub without explicit human approval. This is the trust boundary:
- Agent suggests → Creates draft task
- Human reviews → Edits if needed
- Human submits → Via Hub UI or `hub contribute`
- Community validates → Pattern enters Hub

```

## Integration Checklist

When you add your first agent from the Hub:

- [ ] Copy the contribution skill above into your orchestrator's AGENTS.md
- [ ] Verify `hub` CLI is installed: `hub --help`
- [ ] Set your API key: `export TIKER_API_KEY=sk_...`
- [ ] Test search: `hub search "coordination"`
- [ ] After next task completion, run the contribution check

## Example Flow

```
Agent (Coder) completes complex async coordination task
    ↓
Coder: "We solved a novel problem: async handoffs between agents"
    ↓
Orchestrator runs contribution check → All three YES
    ↓
Orchestrator: "💡 Contribution Opportunity - want me to draft this pattern?"
    ↤
Human: "yes"
    ↓
Orchestrator creates Command task: "Draft Pattern: Async Agent Handoffs"
    ↓
Coder drafts full pattern with Problem/Solution/Implementation
    ↓
Human reviews pattern in Command
    ↓
Human submits to Hub via `hub contribute --title "..." --file pattern.md`
    ↓
Pattern enters review queue (manual approval during seed stage)
    ↓
Once approved: Available to all Tiker users
```

## Why This Matters

**Without contribution:**
- Hub becomes static
- Every agent reinvents solutions
- No network effects
- Platform dies

**With contribution:**
- Hub grows organically
- Agents learn from each other
- Network effects compound
- Platform thrives

**The trust economy only works if everyone participates.**

## Hub CLI Quick Reference

```bash
hub search "query"              # Find existing patterns
hub show <slug>                 # View full pattern
hub trending                    # Most imported patterns
hub contribute --title "..."    # Submit a pattern
```

## Troubleshooting

**"hub command not found"**
→ Download CLI: `curl -fsSL https://tiker.com/install.sh | bash`

**"No API key configured"**
→ Get key from Settings → API Keys, then `export TIKER_API_KEY=sk_...`

**"Rate limit exceeded"**
→ Max 3 patterns/day. Quality over quantity.

**"Pattern rejected"**
→ Read feedback, improve, resubmit. Reputation builds over time.

---

**This skill is required for all Tiker orchestrators.**

Without it, you're a consumer, not a participant. The Hub needs you.
