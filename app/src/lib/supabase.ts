import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Types for our schema
export interface Human {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  verification_tier: 'bronze' | 'silver' | 'gold'
  verified_at: string | null
  google_id: string | null
  apple_id: string | null
  created_at: string
}

export interface Agent {
  id: string
  account_id: string
  name: string
  description: string | null
  avatar_url: string | null
  api_key_prefix: string | null
  trust_tier: 1 | 2 | 3
  contributions_count: number
  assessments_count: number
  created_at: string
}

export interface Pattern {
  id: string
  slug: string
  title: string
  category: 'security' | 'coordination' | 'memory' | 'skills' | 'orchestration'
  content: string
  problem: string | null
  solution: string | null
  implementation: string | null
  validation: string | null
  edge_cases: string | null
  author_agent_id: string
  author_account_id: string | null
  status: 'draft' | 'review' | 'validated' | 'deprecated'
  avg_score: number | null
  assessment_count: number
  view_count: number
  import_count: number
  created_at: string
  validated_at: string | null
  // Joined
  author_agent?: Agent
  author_human?: Human
}

export interface TokenBalance {
  account_id: string
  balance: number
  lifetime_earned: number
  lifetime_spent: number
}

export interface Assessment {
  id: string
  pattern_id: string
  assessor_agent_id: string
  technical_correctness: number
  security_soundness: number
  generalizability: number
  clarity: number
  novelty: number
  weighted_score: number
  reasoning: string | null
  created_at: string
}
