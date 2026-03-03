const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: require('path').join(__dirname, '../app/.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

async function main() {
  // Get Bonnie's ID
  const { data: bonnie } = await supabase
    .from('mc_agents')
    .select('id, name')
    .eq('name', 'Bonnie')
    .single()
  
  console.log('Bonnie:', bonnie)
  
  // Get Track 2 task
  const { data: task } = await supabase
    .from('mc_tasks')
    .select('*')
    .eq('id', 'd0d19b19-d481-4362-b329-9af9f4a7df1f')
    .single()
  
  console.log('\nTrack 2 assigned_agent_ids:', task?.assigned_agent_ids)
  console.log('Bonnie in list?', task?.assigned_agent_ids?.includes(bonnie.id))
  
  // Get comments on Track 2
  const { data: comments } = await supabase
    .from('mc_comments')
    .select('*')
    .eq('task_id', 'd0d19b19-d481-4362-b329-9af9f4a7df1f')
    .order('created_at', { ascending: false })
    .limit(5)
  
  console.log('\nRecent comments on Track 2:')
  comments?.forEach(c => {
    console.log(`- [${c.created_at}] ${c.agent_name}: ${c.content.substring(0, 100)}`)
  })
}

main()
