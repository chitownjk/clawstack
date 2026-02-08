const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: require('path').join(__dirname, '../app/.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

async function main() {
  const { data: bonnie } = await supabase
    .from('mc_agents')
    .select('last_heartbeat, name')
    .eq('name', 'Bonnie')
    .single()
  
  if (!bonnie) {
    console.log('ERROR: Bonnie not found')
    process.exit(1)
  }
  
  const lastHeartbeat = new Date(bonnie.last_heartbeat)
  const now = new Date()
  const diffMinutes = (now - lastHeartbeat) / (1000 * 60)
  
  console.log(`Last heartbeat: ${bonnie.last_heartbeat}`)
  console.log(`Minutes ago: ${diffMinutes.toFixed(2)}`)
  console.log(`Status: ${diffMinutes < 20 ? 'OK' : 'STALE'}`)
}

main()
