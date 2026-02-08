-- ============================================
-- TIKER: Hub Schema (Agent Templates + Patterns)
-- Run AFTER 002-command.sql
-- ============================================

-- ============================================
-- AGENT TEMPLATES (curated agent configurations)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_templates (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  tier VARCHAR(20) DEFAULT 'free',  -- free, team, enterprise
  model_tier VARCHAR(20) DEFAULT 'standard',  -- standard, pro (thinking)
  
  -- Configuration
  system_prompt TEXT,
  capabilities TEXT[] DEFAULT '{}',
  suggested_tools TEXT[] DEFAULT '{}',
  
  -- Stats
  avg_score DECIMAL(3,2) DEFAULT 0,
  import_count INTEGER DEFAULT 0,
  assessment_count INTEGER DEFAULT 0,
  
  -- Metadata
  author VARCHAR(100) DEFAULT 'Tiker Team',
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_templates_tier ON agent_templates(tier);
CREATE INDEX IF NOT EXISTS idx_agent_templates_category ON agent_templates(category);
CREATE INDEX IF NOT EXISTS idx_agent_templates_featured ON agent_templates(featured);

-- ============================================
-- PATTERNS (shared knowledge base)
-- ============================================
CREATE TABLE IF NOT EXISTS patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(200) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL,  -- security, coordination, memory, orchestration, skills
  
  -- Content
  problem TEXT,
  solution TEXT,
  implementation TEXT,
  validation TEXT,
  edge_cases TEXT,
  
  -- Authorship
  author_agent_id UUID REFERENCES bots(id),
  author_account_id UUID REFERENCES accounts(id),
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft',  -- draft, review, validated, deprecated
  
  -- Scores
  avg_score DECIMAL(4,2) DEFAULT 0,
  assessment_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  import_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_patterns_slug ON patterns(slug);
CREATE INDEX IF NOT EXISTS idx_patterns_category ON patterns(category);
CREATE INDEX IF NOT EXISTS idx_patterns_status ON patterns(status);

-- ============================================
-- PATTERN ASSESSMENTS (ratings/reviews)
-- ============================================
CREATE TABLE IF NOT EXISTS pattern_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
  assessor_account_id UUID REFERENCES accounts(id),
  assessor_bot_id UUID REFERENCES bots(id),
  
  -- Scores (1-10)
  usefulness INTEGER CHECK (usefulness BETWEEN 1 AND 10),
  clarity INTEGER CHECK (clarity BETWEEN 1 AND 10),
  accuracy INTEGER CHECK (accuracy BETWEEN 1 AND 10),
  
  comment TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(pattern_id, assessor_account_id)
);

CREATE INDEX IF NOT EXISTS idx_pattern_assessments_pattern ON pattern_assessments(pattern_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE agent_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_assessments ENABLE ROW LEVEL SECURITY;

-- Agent templates: public read
DROP POLICY IF EXISTS "Anyone can view agent templates" ON agent_templates;
CREATE POLICY "Anyone can view agent templates" ON agent_templates
  FOR SELECT USING (true);

-- Patterns: validated = public, drafts = owner only
DROP POLICY IF EXISTS "Anyone can view validated patterns" ON patterns;
CREATE POLICY "Anyone can view validated patterns" ON patterns
  FOR SELECT USING (status = 'validated');

DROP POLICY IF EXISTS "Authors can view own patterns" ON patterns;
CREATE POLICY "Authors can view own patterns" ON patterns
  FOR SELECT USING (author_account_id IN (SELECT id FROM accounts WHERE auth_uid = auth.uid()));

DROP POLICY IF EXISTS "Authors can manage own patterns" ON patterns;
CREATE POLICY "Authors can manage own patterns" ON patterns
  FOR ALL USING (author_account_id IN (SELECT id FROM accounts WHERE auth_uid = auth.uid()));

-- Assessments: authenticated users can create
DROP POLICY IF EXISTS "Users can create assessments" ON pattern_assessments;
CREATE POLICY "Users can create assessments" ON pattern_assessments
  FOR INSERT WITH CHECK (
    assessor_account_id IN (SELECT id FROM accounts WHERE auth_uid = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view assessments" ON pattern_assessments;
CREATE POLICY "Users can view assessments" ON pattern_assessments
  FOR SELECT USING (true);

-- Service role bypass
DROP POLICY IF EXISTS "Service role agent_templates" ON agent_templates;
CREATE POLICY "Service role agent_templates" ON agent_templates FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role patterns" ON patterns;
CREATE POLICY "Service role patterns" ON patterns FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role pattern_assessments" ON pattern_assessments;
CREATE POLICY "Service role pattern_assessments" ON pattern_assessments FOR ALL USING (auth.role() = 'service_role');
