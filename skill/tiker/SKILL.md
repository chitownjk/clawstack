# Tiker Skill

**Integration with Tiker Mission Control and Agent Marketplace**

This skill enables your orchestrator to:
1. Check Mission Control for assigned tasks
2. Spawn specialized agents from database-driven templates
3. Coordinate multi-agent workflows
4. Access the curated agent marketplace

## Prerequisites

Environment variables:
```bash
TIKER_POSTGRES_URL=postgresql://...
TIKER_ANON_KEY=your-anon-key
TIKER_ACCOUNT_ID=your-account-uuid  # Set during onboarding
```

## Quick Start

### 1. Check for Tasks (Every Heartbeat)

```javascript
// In your HEARTBEAT.md or heartbeat handler
const tasks = await tiker.getAssignedTasks();

for (const task of tasks) {
  const agentSlug = task.assigned_to;  // e.g., "writer"
  
  // Claim it (prevents other gateways from taking it)
  const claimed = await tiker.claimTask(task.id);
  if (!claimed) continue;  // Another gateway got it
  
  // Get agent config from database
  const config = await tiker.getAgentConfig(agentSlug);
  
  // Spawn the agent
  const result = await sessions_spawn({
    task: task.description,
    agentConfig: {
      soul: config.soul,
      instructions: config.instructions,
      skills: config.skills,
      memory: config.memory
    },
    model: config.model,
    label: `${agentSlug}-task-${task.id}`
  });
  
  // Update task with result
  await tiker.completeTask(task.id, result);
  
  // Persist any memory updates
  if (result.memoryUpdates) {
    await tiker.updateAgentMemory(agentSlug, result.memoryUpdates);
  }
}
```

### 2. Manual Agent Spawn

When you decide an agent is needed (not from MC task):

```javascript
// Get Writer's config
const writer = await tiker.getAgentConfig('writer');

// Spawn for a specific task
const result = await sessions_spawn({
  task: "Draft an email to investors about Q1 progress",
  agentConfig: writer,
  model: writer.model,
  label: "writer-adhoc-" + Date.now()
});
```

### 3. List Available Agents

```javascript
const agents = await tiker.getInstalledAgents();
// Returns: [
//   { slug: 'assistant', name: 'Assistant', emoji: '🤖' },
//   { slug: 'writer', name: 'Writer', emoji: '✍️' },
//   { slug: 'coder', name: 'Coder', emoji: '💻' }
// ]
```

## API Reference

### tiker.getAssignedTasks()

Fetch tasks from Mission Control assigned to your agents.

```javascript
const tasks = await tiker.getAssignedTasks({
  status: 'assigned',        // Filter by status
  agents: ['writer', 'coder'], // Filter by assigned agent
  unclaimed: true            // Only unclaimed tasks
});
```

Returns:
```javascript
[
  {
    id: "uuid",
    title: "Write Q1 investor update",
    description: "Draft a 2-page update...",
    assigned_to: "writer",
    status: "assigned",
    priority: "normal",
    created_at: "2026-02-03T..."
  }
]
```

### tiker.claimTask(taskId)

Atomically claim a task (prevents double-processing by multiple gateways).

```javascript
const claimed = await tiker.claimTask(taskId);
if (claimed) {
  // You own this task, proceed
} else {
  // Another gateway claimed it, skip
}
```

### tiker.getAgentConfig(slug)

Fetch resolved agent configuration with user customizations and model mapping.

```javascript
const config = await tiker.getAgentConfig('writer');
// Returns:
{
  slug: "writer",
  name: "Writer",
  emoji: "✍️",
  soul: "I am Writer...",
  instructions: "Structure content...",
  skills: ["summarize", "web_fetch"],
  model: "anthropic/claude-sonnet-4-5",  // Resolved from tier
  model_tier: "standard",
  memory: { ... }
}
```

### tiker.completeTask(taskId, result)

Mark task complete and post result as comment.

```javascript
await tiker.completeTask(taskId, {
  success: true,
  output: "Here's the draft...",
  summary: "Created 2-page investor update"
});
```

This will:
1. Move task to "review" status
2. Post result as comment
3. Log activity

### tiker.updateAgentMemory(slug, updates)

Persist memory updates for an agent.

```javascript
await tiker.updateAgentMemory('writer', {
  learnedPreferences: ["User prefers bullet points", "Keep paragraphs short"],
  lastTopic: "Q1 investor update"
});
```

Memory is merged (not replaced) with existing memory.

### tiker.getInstalledAgents()

List agents the user has installed.

```javascript
const agents = await tiker.getInstalledAgents();
```

### tiker.heartbeat()

Record orchestrator heartbeat.

```javascript
await tiker.heartbeat();
```

## Orchestrator HEARTBEAT.md Template

Add this to your HEARTBEAT.md:

```markdown
## Tiker Check (every heartbeat)

1. Record heartbeat: `await tiker.heartbeat()`

2. Check for assigned tasks:
   - Fetch unclaimed tasks for my agents
   - For each task:
     - Claim it
     - Get agent config
     - Spawn agent with config
     - Wait for result
     - Complete task
     - Persist memory
     - **RUN CONTRIBUTION CHECK** (see below)

3. If no tasks, reply HEARTBEAT_OK

## Post-Task Contribution Check (REQUIRED)

After EVERY task completion, evaluate:

1. Did we solve a problem others might face?
2. Is the solution generalizable?
3. Would we have appreciated finding this pattern before starting?

If YES to all three → Create Command task to draft the pattern:

```javascript
// Check if pattern exists
const existing = await hub.search("brief description");
if (existing.patterns.length === 0) {
  // Suggest contribution to human
  const shouldDraft = await askHuman(
    "💡 Contribution Opportunity\\n\\n" +
    "I developed a pattern for [description].\\n" +
    "Want me to draft this for the Hub?"
  );
  
  if (shouldDraft) {
    await mc.task.create({
      title: "Draft Pattern: [Name]",
      description: "[Full pattern with Problem/Solution/Implementation/Validation/Edge Cases]",
      tags: ["contribution", "hub"],
      status: "review"
    });
  }
}
```
```

## Orchestrator AGENTS.md Template

Add this to your AGENTS.md:

```markdown
## Agent Coordination

I am the orchestrator. I don't do specialized work myself — I delegate to specialists.

When a task is assigned to @Writer, @Coder, @Researcher, etc.:
1. I fetch their configuration from Tiker
2. I spawn them with sessions_spawn
3. I wait for their result
4. I update Mission Control with the outcome

### My Installed Agents

Check `tiker.getInstalledAgents()` for current list.

### When to Spawn vs. Handle Myself

**Spawn a specialist when:**
- Task is explicitly assigned to them (@Writer, @Coder)
- Task clearly fits their specialty (coding, writing, research)
- Task requires deep focus I shouldn't interrupt

**Handle myself when:**
- Quick questions from my human
- Coordination and status checks
- Tasks not clearly matching a specialist
- Real-time conversation (specialists are async)

## Community Contribution (REQUIRED)

I am part of the Tiker trust economy. After every task completion, I must check if the solution is worth sharing.

### Contribution Check (run automatically after each task)

1. **Did we solve a problem others might face?**
2. **Is the solution generalizable?**
3. **Would we have appreciated finding this pattern before starting?**

If YES to all three → I suggest drafting a pattern for the Hub.

### Process

1. Check Hub first: `hub search "brief description"`
2. If no existing pattern → Suggest to human
3. If human approves → Create Command task: "Draft Pattern: [Name]"
4. Agent drafts full pattern (Problem/Solution/Implementation/Validation/Edge Cases)
5. Human reviews and submits via `hub contribute`

### Quality Bar

Only suggest patterns that are:
- ✅ Tested (we actually used it)
- ✅ Clear (others can implement without questions)
- ✅ Valuable (saves time or prevents problems)
- ✅ Novel (not already in Hub)

### Rate Limits

- Max 3 patterns/day per account
- All patterns manually reviewed during seed stage
- Quality over quantity

### Why This Matters

Without contributions, the Hub dies. With contributions, it grows and everyone benefits.
```

## Memory Convention

When agents complete tasks, they can output memory updates:

```markdown
### Task Complete

[Output here...]

---
MEMORY_UPDATE:
```json
{
  "learned": ["User prefers concise emails"],
  "context": {"lastProject": "Q1 investor update"}
}
```
---
```

The orchestrator extracts this block and persists it.

## Multi-Gateway Setup

If you run multiple gateways (paid feature), task claiming ensures only one processes each task:

```
Gateway A sees task → claims it → processes
Gateway B sees task → claim fails → skips
```

No configuration needed — it's automatic.

## Marketplace Integration

### Browse Available Agents

```javascript
const marketplace = await tiker.browseMarketplace({
  category: 'business',  // Optional filter
  tier: 'basic'          // Show agents available at this tier
});
```

### Install an Agent

```javascript
await tiker.installAgent('marketing');
// Agent now appears in getInstalledAgents()
```

Note: Installing adds the agent to your account. The template itself is stored in Tiker's database — no filesystem changes needed.

## Troubleshooting

### "Agent config not found"

The user hasn't installed this agent. Check `getInstalledAgents()` for available agents.

### "Task claim failed"

Another gateway (or this one in a previous run) already claimed it. This is normal — just skip.

### "Model not configured"

User hasn't set up their model config. They need to configure at least `model_default` in settings.

### Spawn timeout

If spawned agent times out:
1. Mark task as "blocked"
2. Post comment explaining timeout
3. Move on (don't retry automatically)

## Environment Setup

### Automatic (Recommended)

Run the onboarding script:
```bash
tiker setup
```

This will:
1. Prompt for Tiker account credentials
2. Set environment variables
3. Add default agents
4. Verify connection

### Manual

Set these environment variables:
```bash
export TIKER_POSTGRES_URL="postgresql://..."
export TIKER_ANON_KEY="..."
export TIKER_ACCOUNT_ID="..."
```

Then verify:
```bash
tiker status
```
