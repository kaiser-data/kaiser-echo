-- Kaiser Echo Database Schema (FIXED for Supabase)
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (only created when they authenticate)
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table (anonymous and authenticated)
CREATE TABLE sessions (
  session_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  avatar_config JSONB DEFAULT '{}',
  language TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  language TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User facts table (extracted knowledge)
CREATE TABLE user_facts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  fact_type TEXT NOT NULL,
  fact_value TEXT NOT NULL,
  confidence FLOAT DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage tracking table (for cost control) - FIXED UNIQUE constraint
CREATE TABLE daily_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  session_id TEXT REFERENCES sessions(session_id) ON DELETE CASCADE,
  conversation_count INT DEFAULT 0,
  message_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index for daily_usage (replaces the UNIQUE constraint)
CREATE UNIQUE INDEX idx_daily_usage_unique ON daily_usage(date, user_id, session_id);

-- Magic link tokens table
CREATE TABLE magic_tokens (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  session_id TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_user_facts_session_id ON user_facts(session_id);
CREATE INDEX idx_user_facts_user_id ON user_facts(user_id);
CREATE INDEX idx_user_facts_type ON user_facts(fact_type);
CREATE INDEX idx_daily_usage_date ON daily_usage(date);
CREATE INDEX idx_daily_usage_user_id ON daily_usage(user_id);
CREATE INDEX idx_daily_usage_session_id ON daily_usage(session_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_magic_tokens_email ON magic_tokens(email);
CREATE INDEX idx_magic_tokens_expires_at ON magic_tokens(expires_at);

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_facts_updated_at BEFORE UPDATE ON user_facts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_usage_updated_at BEFORE UPDATE ON daily_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a function to clean up expired magic tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM magic_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE magic_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "View own sessions" ON sessions
  FOR SELECT USING (
    user_id = auth.uid() OR
    session_id IN (SELECT session_id FROM sessions WHERE user_id = auth.uid())
  );

CREATE POLICY "View own messages" ON messages
  FOR SELECT USING (
    user_id = auth.uid() OR
    session_id IN (SELECT session_id FROM sessions WHERE user_id = auth.uid())
  );

CREATE POLICY "View own facts" ON user_facts
  FOR SELECT USING (
    user_id = auth.uid() OR
    session_id IN (SELECT session_id FROM sessions WHERE user_id = auth.uid())
  );

CREATE POLICY "View own usage" ON daily_usage
  FOR SELECT USING (
    user_id = auth.uid() OR
    session_id IN (SELECT session_id FROM sessions WHERE user_id = auth.uid())
  );
