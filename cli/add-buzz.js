#!/usr/bin/env node

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from app directory
import dotenv from 'dotenv';
dotenv.config({ path: join(__dirname, '../app/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addBuzz() {
  const { data, error } = await supabase
    .from('mc_agents')
    .upsert({
      name: 'Buzz',
      session_key: 'agent:buzz:isolated',
      role: 'Social Media Manager',
      level: 'specialist',
      emoji: '📱',
      type: 'agent',
      status: 'idle'
    }, {
      onConflict: 'session_key'
    })
    .select();

  if (error) {
    console.error('❌ Error adding Buzz:', error.message);
    process.exit(1);
  }

  console.log('✅ Buzz added to Mission Control');
  console.log(data);
}

addBuzz();
