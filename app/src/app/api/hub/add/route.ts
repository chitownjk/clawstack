import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { encrypt } from '@/lib/crypto'

// Static agent templates (same as hub page - will move to DB later)
const AGENT_TEMPLATES: Record<string, {
  name: string
  emoji: string
  description: string
  tier: string
}> = {
  'assistant': {
    name: 'Assistant',
    emoji: '🤖',
    description: 'Your all-purpose AI. Questions, planning, research, drafts, code help.',
    tier: 'free',
  },
  'coder': {
    name: 'Coder',
    emoji: '💻',
    description: 'Code, debug, review, ship. Speaks Python, TypeScript, Go, Rust, and more.',
    tier: 'team',
  },
  'writer': {
    name: 'Writer',
    emoji: '✍️',
    description: 'Emails, docs, blog posts, social content. Clear, on-brand, polished.',
    tier: 'team',
  },
  'researcher': {
    name: 'Researcher',
    emoji: '🔬',
    description: 'Deep dives, competitive analysis, market research. Cites sources.',
    tier: 'team',
  },
}

// POST /api/hub/add - Add an agent or pattern to the user's Command
export async function POST(request: Request) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Support two formats:
    // 1. Agent from modal: { agentId, name, personality, modelTier }
    // 2. Generic format: { type, id, customizations }
    const { agentId, name, personality, modelTier, type, id, customizations } = body

    // Determine if this is an agent or pattern request
    const isAgent = agentId || type === 'agent'
    const isPattern = type === 'pattern'
    
    if (!isAgent && !isPattern) {
      return NextResponse.json({ error: 'Invalid request. Must provide agentId or type.' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Get account ID
    const { data: account } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    let title: string
    let description: string
    let itemType: 'agent' | 'pattern'

    if (isAgent) {
      itemType = 'agent'
      const agentIdToUse = agentId || id
      const agentName = name || customizations?.name
      
      // Look up agent template
      const template = AGENT_TEMPLATES[agentIdToUse]
      if (!template) {
        return NextResponse.json({ error: 'Agent template not found' }, { status: 404 })
      }

      const finalName = agentName || template.name
      title = `Setup: ${finalName} agent`
      
      // Build description with agent details and customizations
      const descriptionParts = [
        `## Agent Details`,
        `- **Template:** ${template.name} ${template.emoji}`,
        `- **Tier:** ${template.tier}`,
        `- **Description:** ${template.description}`,
      ]

      if (personality || customizations?.personality || modelTier || customizations?.modelTier) {
        descriptionParts.push('', '## Customizations')
        if (personality || customizations?.personality) {
          descriptionParts.push(`- **Personality:** ${personality || customizations?.personality}`)
        }
        if (modelTier || customizations?.modelTier) {
          descriptionParts.push(`- **Model Tier:** ${modelTier || customizations?.modelTier}`)
        }
      }

      descriptionParts.push(
        '',
        '## Required: Configure Pattern Contribution',
        'This agent is now part of the Tiker trust economy. To keep the Hub growing, your orchestrator must be configured to suggest pattern contributions when agents solve reusable problems.',
        '',
        '**Add this to your orchestrator AGENTS.md:**',
        '```markdown',
        '## Community Contribution',
        '',
        'When agents discover valuable patterns during work, they should suggest sharing back to the Hub.',
        '',
        '### Contribution Check (run after every task completion)',
        '1. Did we solve a problem others might face?',
        '2. Is the solution generalizable?',
        '3. Would we have appreciated finding this pattern before starting?',
        '',
        'If yes to all three → Create Command task: "Draft Pattern: [Name]"',
        '',
        '### Hub Integration Commands',
        '- `hub search "query"` - Find existing patterns',
        '- `hub show <slug>` - Read full pattern',
        '- `hub contribute --title "..." --file pattern.md` - Submit pattern',
        '```',
        '',
        '## Next Steps',
        '1. [ ] Add contribution protocol to AGENTS.md (see above)',
        '2. [ ] Create the agent in Team settings',
        '3. [ ] Test agent with a simple task',
        '4. [ ] Verify `hub` CLI is installed and API key configured'
      )

      description = descriptionParts.join('\n')
      
      // Note: agent templates don't have import_count in DB yet (static)
      
    } else {
      // Pattern
      itemType = 'pattern'
      const patternId = id
      
      if (!patternId) {
        return NextResponse.json({ error: 'Pattern id is required' }, { status: 400 })
      }

      // Look up pattern from database
      const { data: pattern, error: patternError } = await adminClient
        .from('patterns')
        .select('id, title, category, problem, solution, implementation, validation, import_count')
        .eq('id', patternId)
        .single()

      if (patternError || !pattern) {
        return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })
      }

      title = `Review: ${pattern.title}`
      
      // Build description with full pattern content
      const descriptionParts = [
        `## Pattern: ${pattern.title}`,
        `**Category:** ${pattern.category}`,
        '',
        '## Problem',
        pattern.problem || 'No problem statement provided.',
        '',
        '## Solution',
        pattern.solution || 'No solution provided.',
      ]

      if (pattern.implementation) {
        descriptionParts.push('', '## Implementation', pattern.implementation)
      }

      if (pattern.validation) {
        descriptionParts.push('', '## Validation', pattern.validation)
      }

      descriptionParts.push(
        '',
        '## Next Steps',
        '1. Review the pattern above',
        '2. Evaluate if it fits your use case',
        '3. Implement the solution in your agents/system',
        '4. Mark as complete when done'
      )

      description = descriptionParts.join('\n')

      // Increment import_count on the pattern
      await adminClient
        .from('patterns')
        .update({ import_count: (pattern.import_count || 0) + 1 })
        .eq('id', patternId)
    }

    // Get user's first agent (orchestrator) to assign the task
    const { data: userAgents } = await adminClient
      .from('mc_agents')
      .select('id, name')
      .eq('account_id', account.id)
      .order('created_at', { ascending: true })
      .limit(1)
    
    const defaultAgentId = userAgents?.[0]?.id
    const assignedAgentIds = defaultAgentId ? [defaultAgentId] : []

    // Create task with encrypted fields
    const { data: task, error: taskError } = await adminClient
      .from('mc_tasks')
      .insert({
        title: encrypt(title),
        description: encrypt(description),
        assigned_agent_ids: assignedAgentIds,
        tags: [itemType === 'agent' ? 'setup' : 'review', 'hub-import'],
        priority: 'normal',
        status: assignedAgentIds.length > 0 ? 'assigned' : 'inbox',
        account_id: account.id,
      })
      .select()
      .single()

    if (taskError) {
      console.error('Error creating task:', taskError)
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    // Return with decrypted fields for immediate use
    return NextResponse.json({
      success: true,
      task: {
        ...task,
        title,
        description,
      },
      message: itemType === 'agent' 
        ? `"${title}" added to your Command inbox`
        : `Pattern "${title.replace('Review: ', '')}" added to your Command inbox`,
    })
  } catch (error) {
    console.error('Error in hub/add:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
