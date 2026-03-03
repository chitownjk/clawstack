// Script to create Supabase Storage bucket for mc-files
// Run: npx tsx scripts/setup-storage-bucket.ts

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../app/.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupBucket() {
  const bucketName = 'mc-files'
  
  console.log(`Setting up storage bucket: ${bucketName}`)
  
  // 1. Create bucket if it doesn't exist
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()
  
  if (listError) {
    console.error('Error listing buckets:', listError)
    process.exit(1)
  }
  
  const bucketExists = buckets?.some(b => b.name === bucketName)
  
  if (!bucketExists) {
    console.log('Creating bucket...')
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: false,
      fileSizeLimit: 104857600, // 100MB max file size
      allowedMimeTypes: [
        'text/*',
        'application/pdf',
        'application/json',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/*',
        'video/*',
        'audio/*',
      ]
    })
    
    if (error) {
      console.error('Error creating bucket:', error)
      process.exit(1)
    }
    
    console.log('✓ Bucket created')
  } else {
    console.log('✓ Bucket already exists')
  }
  
  // 2. Set up RLS policies for the bucket
  console.log('Setting up storage policies...')
  
  // Note: Storage policies are managed separately from table policies
  // They use a different syntax via the Supabase dashboard or via direct SQL
  
  // Policy 1: Users can upload to their own account folder
  const uploadPolicy = {
    name: 'Users can upload to own folder',
    definition: `(bucket_id = '${bucketName}' AND (storage.foldername(name))[1] = (SELECT id::text FROM accounts WHERE auth_uid = auth.uid()))`,
    check: `(bucket_id = '${bucketName}' AND (storage.foldername(name))[1] = (SELECT id::text FROM accounts WHERE auth_uid = auth.uid()))`
  }
  
  // Policy 2: Users can read from their own folder
  const readPolicy = {
    name: 'Users can read own files',
    definition: `(bucket_id = '${bucketName}' AND (storage.foldername(name))[1] = (SELECT id::text FROM accounts WHERE auth_uid = auth.uid()))`
  }
  
  // Policy 3: Users can delete their own files
  const deletePolicy = {
    name: 'Users can delete own files',
    definition: `(bucket_id = '${bucketName}' AND (storage.foldername(name))[1] = (SELECT id::text FROM accounts WHERE auth_uid = auth.uid()))`
  }
  
  console.log('\n✓ Storage bucket setup complete!')
  console.log('\nNOTE: Storage RLS policies must be set via Supabase Dashboard:')
  console.log('  1. Go to Storage > Policies')
  console.log(`  2. Create policies for bucket "${bucketName}":`)
  console.log('     - INSERT: Allow if path starts with user\'s account_id')
  console.log('     - SELECT: Allow if path starts with user\'s account_id')
  console.log('     - DELETE: Allow if path starts with user\'s account_id')
  console.log('\nOr run this SQL in Supabase SQL Editor:')
  console.log(`
-- Storage policies for mc-files bucket
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'mc-files' 
  AND (storage.foldername(name))[1] = (SELECT id::text FROM accounts WHERE auth_uid = auth.uid())
);

CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'mc-files'
  AND (storage.foldername(name))[1] = (SELECT id::text FROM accounts WHERE auth_uid = auth.uid())
);

CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'mc-files'
  AND (storage.foldername(name))[1] = (SELECT id::text FROM accounts WHERE auth_uid = auth.uid())
);
  `)
}

setupBucket()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Setup failed:', err)
    process.exit(1)
  })
