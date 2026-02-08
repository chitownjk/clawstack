const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: require('path').join(__dirname, '../app/.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

async function main() {
  // Get all comments in last 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  
  const { data: comments } = await supabase
    .from('mc_comments')
    .select('*, task:mc_tasks(title)')
    .gt('created_at', tenMinutesAgo)
    .order('created_at', { ascending: false })
  
  console.log(`Comments in last 10 minutes:`)
  if (comments?.length === 0) {
    console.log('(none)')
  } else {
    comments?.forEach(c => {
      console.log(`\n[${c.created_at}] ${c.agent_name} on "${c.task?.title}"`)
      console.log(`  ${c.content.substring(0, 150)}`)
    })
  }
}

main()
