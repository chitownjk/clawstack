const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: require('path').join(__dirname, '../app/.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

async function main() {
  const { data: comments } = await supabase
    .from('mc_comments')
    .select('*')
    .eq('task_id', 'cfbd2f33-e3c0-482f-b514-88486cc0137d')
    .order('created_at', { ascending: false })
    .limit(3)
  
  comments?.forEach(c => {
    console.log(`\n[${c.created_at}] ${c.agent_name || 'Jay'}:`)
    console.log(c.content)
    console.log('---')
  })
}

main()
