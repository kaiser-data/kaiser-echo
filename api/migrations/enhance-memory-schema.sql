-- Enhanced Memory Management Schema Migration
-- Adds professional memory management fields to user_facts table

-- Add new columns to user_facts table for enhanced memory management
ALTER TABLE user_facts
ADD COLUMN IF NOT EXISTS context TEXT,
ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'conversation' CHECK (source IN ('conversation', 'explicit', 'inferred')),
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS importance VARCHAR(10) DEFAULT 'medium' CHECK (importance IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_facts_importance ON user_facts(importance);
CREATE INDEX IF NOT EXISTS idx_user_facts_verified ON user_facts(verified);
CREATE INDEX IF NOT EXISTS idx_user_facts_source ON user_facts(source);
CREATE INDEX IF NOT EXISTS idx_user_facts_expires_at ON user_facts(expires_at);

-- Add index for fact type queries (categorical)
CREATE INDEX IF NOT EXISTS idx_user_facts_fact_type_prefix ON user_facts USING btree(fact_type text_pattern_ops);

-- Update existing records with default values
UPDATE user_facts
SET
  source = 'conversation',
  verified = CASE WHEN confidence > 0.8 THEN TRUE ELSE FALSE END,
  importance = CASE
    WHEN fact_type LIKE 'identity.%' OR fact_type = 'profession.title' OR fact_type = 'location.residence' THEN 'high'
    WHEN fact_type LIKE 'profession.%' OR fact_type LIKE 'goals.%' OR fact_type LIKE 'interests.%' THEN 'medium'
    ELSE 'low'
  END
WHERE source IS NULL OR verified IS NULL OR importance IS NULL;

-- Add comment for documentation
COMMENT ON TABLE user_facts IS 'Enhanced user facts table with professional memory management features including categorization, verification, and expiration';
COMMENT ON COLUMN user_facts.context IS 'Surrounding conversation context where fact was mentioned';
COMMENT ON COLUMN user_facts.source IS 'How the fact was obtained: conversation, explicit input, or inferred';
COMMENT ON COLUMN user_facts.verified IS 'Whether the fact has been confirmed or validated';
COMMENT ON COLUMN user_facts.importance IS 'Importance level for memory prioritization';
COMMENT ON COLUMN user_facts.expires_at IS 'Optional expiration timestamp for temporary facts';