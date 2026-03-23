import { NextResponse } from 'next/server'
import { decrypt, encrypt } from '@/lib/crypto'
import { requireBonnieInternalAuth } from '@/lib/bonnie-auth'

export async function GET(request: Request) {
  const auth = await requireBonnieInternalAuth(request)
  if (!auth.ok) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json({ error: 'taskId required' }, { status: 400 })
    }

    const { data: task } = await auth.adminClient
      .from('mc_tasks')
      .select('id, account_id')
      .eq('id', taskId)
      .single()

    if (!task || task.account_id !== auth.account.id) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const { data: comments, error } = await auth.adminClient
      .from('mc_comments')
      .select('*')
      .eq('task_id', taskId)
      .eq('account_id', auth.account.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[Bonnie/Internal Comments] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
    }

    return NextResponse.json((comments || []).map(comment => ({
      ...comment,
      content: comment.content ? decrypt(comment.content) : comment.content,
    })))
  } catch (error) {
    console.error('[Bonnie/Internal Comments] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireBonnieInternalAuth(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const taskId = body?.taskId
    const content = body?.content

    if (!taskId || !content || typeof content !== 'string') {
      return NextResponse.json({ error: 'taskId and content required' }, { status: 400 })
    }

    const { data: task } = await auth.adminClient
      .from('mc_tasks')
      .select('id, account_id')
      .eq('id', taskId)
      .single()

    if (!task || task.account_id !== auth.account.id) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const finalContent = content.startsWith('[Bonnie]') ? content : `[Bonnie] ${content}`

    const { data: comment, error } = await auth.adminClient
      .from('mc_comments')
      .insert({
        task_id: taskId,
        content: encrypt(finalContent),
        account_id: auth.account.id,
      })
      .select('*')
      .single()

    if (error || !comment) {
      console.error('[Bonnie/Internal Comments] Create error:', error)
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
    }

    return NextResponse.json({
      ...comment,
      content: finalContent,
    }, { status: 201 })
  } catch (error) {
    console.error('[Bonnie/Internal Comments] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
