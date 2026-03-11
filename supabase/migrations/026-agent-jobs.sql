-- ============================================
-- Agent Jobs: end-to-end transactional workflows
-- Extension detects intent, agent searches via browser automation,
-- user reviews options and completes booking.
-- ============================================

-- Agent jobs track search/booking workflows
CREATE TABLE IF NOT EXISTS agent_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  job_type TEXT NOT NULL,              -- 'flight', 'hotel', 'shopping', 'restaurant', etc.
  status TEXT NOT NULL DEFAULT 'searching',
    -- searching: agent is actively searching
    -- options_ready: results found, awaiting user review
    -- selected: user picked an option
    -- completed: booking/purchase done
    -- failed: search or booking failed
    -- expired: options timed out
    -- declined: user dismissed
  search_params JSONB,                 -- encrypted: origin, dest, dates, passengers, etc.
  source_url TEXT,                     -- the page user was on when they triggered
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ               -- when options expire
);

-- Individual options found by the agent
CREATE TABLE IF NOT EXISTS agent_job_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES agent_jobs(id) ON DELETE CASCADE,
  provider TEXT,                        -- airline name, hotel name, store name
  provider_offer_id TEXT,               -- external reference if applicable
  option_data JSONB,                    -- encrypted: full details (times, stops, features)
  display_summary TEXT,                 -- encrypted: "United UA 1234 - 8:15am nonstop - $291"
  price_cents INT,
  currency TEXT DEFAULT 'USD',
  booking_url TEXT,                     -- encrypted: direct link to book
  ranking INT,                          -- 1 = best
  ranking_reason TEXT,                  -- "cheapest", "fastest", "best value"
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link tasks to agent jobs
ALTER TABLE mc_tasks ADD COLUMN IF NOT EXISTS agent_job_id UUID REFERENCES agent_jobs(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_jobs_account ON agent_jobs(account_id);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_status ON agent_jobs(account_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_job_options_job ON agent_job_options(job_id);
CREATE INDEX IF NOT EXISTS idx_mc_tasks_agent_job ON mc_tasks(agent_job_id);

-- RLS
ALTER TABLE agent_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_job_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own agent jobs"
  ON agent_jobs FOR ALL
  USING (account_id IN (SELECT id FROM accounts WHERE auth_uid = auth.uid()));

CREATE POLICY "Users can view options for own jobs"
  ON agent_job_options FOR ALL
  USING (job_id IN (SELECT id FROM agent_jobs WHERE account_id IN (SELECT id FROM accounts WHERE auth_uid = auth.uid())));
