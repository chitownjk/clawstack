#!/usr/bin/env node
/**
 * Migration script to encrypt existing data
 * 
 * IMPORTANT: Run this ONCE after setting ENCRYPTION_KEY env var
 * This script is idempotent - running it again won't double-encrypt
 * 
 * Usage: node cli/migrate-encryption.js
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../app/.env.local') })
const { encrypt, isEncrypted } = require('./crypto')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

if (!process.env.ENCRYPTION_KEY) {
  console.error('Missing ENCRYPTION_KEY - set this before running migration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrateTable(tableName, fields, idField = 'id') {
  console.log(`\n📦 Migrating ${tableName}...`)
  
  // Fetch all records
  const { data: records, error } = await supabase
    .from(tableName)
    .select(`${idField}, ${fields.join(', ')}`)
  
  if (error) {
    console.error(`  ❌ Error fetching ${tableName}:`, error.message)
    return { migrated: 0, skipped: 0, errors: 1 }
  }
  
  if (!records || records.length === 0) {
    console.log(`  ⏭️  No records to migrate`)
    return { migrated: 0, skipped: 0, errors: 0 }
  }
  
  let migrated = 0
  let skipped = 0
  let errors = 0
  
  for (const record of records) {
    const updates = {}
    let needsUpdate = false
    
    for (const field of fields) {
      const value = record[field]
      if (value && typeof value === 'string' && !isEncrypted(value)) {
        updates[field] = encrypt(value)
        needsUpdate = true
      }
    }
    
    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from(tableName)
        .update(updates)
        .eq(idField, record[idField])
      
      if (updateError) {
        console.error(`  ❌ Error updating ${record[idField]}:`, updateError.message)
        errors++
      } else {
        migrated++
      }
    } else {
      skipped++
    }
  }
  
  console.log(`  ✅ Migrated: ${migrated}, Skipped (already encrypted): ${skipped}, Errors: ${errors}`)
  return { migrated, skipped, errors }
}

async function main() {
  console.log('🔐 Starting encryption migration...\n')
  console.log('⚠️  Make sure you have a backup before proceeding!')
  console.log('   This migration is idempotent - already encrypted data will be skipped.\n')
  
  const results = {
    tasks: await migrateTable('mc_tasks', ['title', 'description']),
    comments: await migrateTable('mc_comments', ['content']),
    // Skip activities for now - too many records and less sensitive
    // activities: await migrateTable('mc_activities', ['message']),
    accounts: await migrateTable('accounts', ['two_factor_secret']),
  }
  
  console.log('\n📊 Migration Summary:')
  console.log('━'.repeat(50))
  
  let totalMigrated = 0
  let totalSkipped = 0
  let totalErrors = 0
  
  for (const [table, result] of Object.entries(results)) {
    console.log(`${table}: ${result.migrated} migrated, ${result.skipped} skipped, ${result.errors} errors`)
    totalMigrated += result.migrated
    totalSkipped += result.skipped
    totalErrors += result.errors
  }
  
  console.log('━'.repeat(50))
  console.log(`Total: ${totalMigrated} migrated, ${totalSkipped} skipped, ${totalErrors} errors`)
  
  if (totalErrors > 0) {
    console.log('\n⚠️  Some records failed to migrate. Check errors above.')
    process.exit(1)
  } else {
    console.log('\n✅ Migration complete!')
  }
}

main().catch(err => {
  console.error('Migration error:', err)
  process.exit(1)
})
