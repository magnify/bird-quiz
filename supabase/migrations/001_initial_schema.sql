-- Dansk Fugleviden: Full Database Schema
-- Phase 1: Foundation

-- ============================================================
-- CORE TABLES
-- ============================================================

-- Birds table — 246 Danish birds
CREATE TABLE birds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_da TEXT NOT NULL,
  name_en TEXT NOT NULL,
  scientific_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- standfugl, trækfugl, sjælden gæst
  is_common BOOLEAN NOT NULL DEFAULT false,
  is_easy BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_birds_scientific_name ON birds (scientific_name);
CREATE INDEX idx_birds_category ON birds (category);
CREATE INDEX idx_birds_is_common ON birds (is_common) WHERE is_common = true;
CREATE INDEX idx_birds_is_easy ON birds (is_easy) WHERE is_easy = true;

-- Similarity groups — 25 groups of visually similar birds
CREATE TABLE similarity_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_da TEXT NOT NULL,
  name_en TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Junction table: birds <-> similarity groups (many-to-many)
CREATE TABLE bird_similarity_group (
  bird_id UUID NOT NULL REFERENCES birds(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES similarity_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (bird_id, group_id)
);

CREATE INDEX idx_bsg_bird ON bird_similarity_group (bird_id);
CREATE INDEX idx_bsg_group ON bird_similarity_group (group_id);

-- Bird images
CREATE TABLE bird_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bird_id UUID NOT NULL REFERENCES birds(id) ON DELETE CASCADE,
  image_url TEXT, -- original URL (Wikipedia/Commons)
  storage_path TEXT, -- Supabase Storage path
  source TEXT NOT NULL DEFAULT 'wikipedia', -- wikipedia, commons, override, upload
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, flagged
  is_primary BOOLEAN NOT NULL DEFAULT false,
  quality_score SMALLINT CHECK (quality_score BETWEEN 1 AND 5),
  flag_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bird_images_bird ON bird_images (bird_id);
CREATE INDEX idx_bird_images_status ON bird_images (status);
CREATE INDEX idx_bird_images_primary ON bird_images (bird_id) WHERE is_primary = true;

-- ============================================================
-- USER TABLES
-- ============================================================

-- Profiles — extends Supabase Auth
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'user', -- user, admin
  tier TEXT NOT NULL DEFAULT 'free', -- free, premium
  total_quizzes INTEGER NOT NULL DEFAULT 0,
  total_correct INTEGER NOT NULL DEFAULT 0,
  total_answered INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Spaced repetition weights per user per bird
CREATE TABLE user_bird_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bird_id UUID NOT NULL REFERENCES birds(id) ON DELETE CASCADE,
  weight REAL NOT NULL DEFAULT 1.0,
  times_seen INTEGER NOT NULL DEFAULT 0,
  times_correct INTEGER NOT NULL DEFAULT 0,
  last_seen_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, bird_id)
);

CREATE INDEX idx_ubw_user ON user_bird_weights (user_id);
CREATE INDEX idx_ubw_bird ON user_bird_weights (bird_id);

-- ============================================================
-- ANALYTICS TABLES
-- ============================================================

-- Quiz sessions
CREATE TABLE quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_id TEXT, -- UUID string for non-logged-in users
  difficulty TEXT NOT NULL, -- easy, common, all
  mode TEXT NOT NULL, -- photo, name, mixed
  question_count INTEGER NOT NULL,
  score INTEGER,
  duration_ms INTEGER,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_qs_user ON quiz_sessions (user_id);
CREATE INDEX idx_qs_guest ON quiz_sessions (guest_id);
CREATE INDEX idx_qs_created ON quiz_sessions (created_at);

-- Individual quiz answers
CREATE TABLE quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  bird_id UUID NOT NULL REFERENCES birds(id),
  chosen_bird_id UUID REFERENCES birds(id),
  is_correct BOOLEAN NOT NULL,
  response_time_ms INTEGER,
  mode TEXT NOT NULL, -- photo, name
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qa_session ON quiz_answers (session_id);
CREATE INDEX idx_qa_bird ON quiz_answers (bird_id);

-- Materialized per-bird difficulty metrics
CREATE TABLE bird_difficulty_stats (
  bird_id UUID PRIMARY KEY REFERENCES birds(id) ON DELETE CASCADE,
  times_shown INTEGER NOT NULL DEFAULT 0,
  times_correct INTEGER NOT NULL DEFAULT 0,
  difficulty_score REAL, -- computed: 1 - (correct / shown)
  avg_response_ms REAL,
  most_confused_with UUID REFERENCES birds(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ADMIN TABLES
-- ============================================================

-- Audit log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- e.g., bird.create, image.approve
  entity_type TEXT NOT NULL, -- bird, image, group, profile, distractor
  entity_id TEXT, -- UUID as text for flexibility
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_entity ON audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_log (created_at);
CREATE INDEX idx_audit_user ON audit_log (user_id);

-- Manual distractor overrides
CREATE TABLE distractor_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bird_id UUID NOT NULL REFERENCES birds(id) ON DELETE CASCADE,
  target_bird_id UUID NOT NULL REFERENCES birds(id) ON DELETE CASCADE,
  rule TEXT NOT NULL, -- 'include' or 'exclude'
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bird_id, target_bird_id)
);

-- ============================================================
-- PAYMENT TABLES
-- ============================================================

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'inactive', -- active, canceled, past_due, inactive
  plan TEXT, -- monthly, yearly
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sub_user ON subscriptions (user_id);
CREATE INDEX idx_sub_stripe ON subscriptions (stripe_subscription_id);

CREATE TABLE payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  data JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER tr_birds_updated BEFORE UPDATE ON birds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_similarity_groups_updated BEFORE UPDATE ON similarity_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_bird_images_updated BEFORE UPDATE ON bird_images
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_ubw_updated BEFORE UPDATE ON user_bird_weights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_subscriptions_updated BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, role, tier)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), 'user', 'free');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Refresh bird difficulty stats
CREATE OR REPLACE FUNCTION refresh_bird_difficulty_stats()
RETURNS void AS $$
BEGIN
  -- Upsert aggregated stats from quiz_answers
  INSERT INTO bird_difficulty_stats (bird_id, times_shown, times_correct, difficulty_score, avg_response_ms, updated_at)
  SELECT
    qa.bird_id,
    COUNT(*) AS times_shown,
    COUNT(*) FILTER (WHERE qa.is_correct) AS times_correct,
    1.0 - (COUNT(*) FILTER (WHERE qa.is_correct)::real / NULLIF(COUNT(*), 0)) AS difficulty_score,
    AVG(qa.response_time_ms)::real AS avg_response_ms,
    now()
  FROM quiz_answers qa
  GROUP BY qa.bird_id
  ON CONFLICT (bird_id) DO UPDATE SET
    times_shown = EXCLUDED.times_shown,
    times_correct = EXCLUDED.times_correct,
    difficulty_score = EXCLUDED.difficulty_score,
    avg_response_ms = EXCLUDED.avg_response_ms,
    updated_at = EXCLUDED.updated_at;

  -- Update most_confused_with for each bird
  UPDATE bird_difficulty_stats bds
  SET most_confused_with = sub.confused_with
  FROM (
    SELECT DISTINCT ON (qa.bird_id)
      qa.bird_id,
      qa.chosen_bird_id AS confused_with
    FROM quiz_answers qa
    WHERE NOT qa.is_correct AND qa.chosen_bird_id IS NOT NULL
    GROUP BY qa.bird_id, qa.chosen_bird_id
    ORDER BY qa.bird_id, COUNT(*) DESC
  ) sub
  WHERE bds.bird_id = sub.bird_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE birds ENABLE ROW LEVEL SECURITY;
ALTER TABLE similarity_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE bird_similarity_group ENABLE ROW LEVEL SECURITY;
ALTER TABLE bird_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bird_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bird_difficulty_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE distractor_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- Birds: readable by all, writable by admins
CREATE POLICY birds_select ON birds FOR SELECT USING (true);
CREATE POLICY birds_admin ON birds FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Similarity groups: readable by all, writable by admins
CREATE POLICY sg_select ON similarity_groups FOR SELECT USING (true);
CREATE POLICY sg_admin ON similarity_groups FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Bird similarity group junction: readable by all, writable by admins
CREATE POLICY bsg_select ON bird_similarity_group FOR SELECT USING (true);
CREATE POLICY bsg_admin ON bird_similarity_group FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Bird images: readable by all, writable by admins
CREATE POLICY bi_select ON bird_images FOR SELECT USING (true);
CREATE POLICY bi_admin ON bird_images FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Profiles: users can read/update their own, admins can read all
CREATE POLICY profiles_own_select ON profiles FOR SELECT USING (
  id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY profiles_own_update ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY profiles_admin ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- User bird weights: users own their own data
CREATE POLICY ubw_own ON user_bird_weights FOR ALL USING (user_id = auth.uid());

-- Quiz sessions: users own their sessions, admins can read all
CREATE POLICY qs_insert ON quiz_sessions FOR INSERT WITH CHECK (
  user_id = auth.uid() OR user_id IS NULL
);
CREATE POLICY qs_own_select ON quiz_sessions FOR SELECT USING (
  user_id = auth.uid() OR user_id IS NULL OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY qs_own_update ON quiz_sessions FOR UPDATE USING (
  user_id = auth.uid() OR user_id IS NULL
);

-- Quiz answers: insert by session owner, readable by owner + admins
CREATE POLICY qa_insert ON quiz_answers FOR INSERT WITH CHECK (true);
CREATE POLICY qa_select ON quiz_answers FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM quiz_sessions qs
    WHERE qs.id = quiz_answers.session_id
    AND (qs.user_id = auth.uid() OR qs.user_id IS NULL)
  ) OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Bird difficulty stats: readable by all
CREATE POLICY bds_select ON bird_difficulty_stats FOR SELECT USING (true);
CREATE POLICY bds_admin ON bird_difficulty_stats FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Audit log: admin read-only
CREATE POLICY audit_admin ON audit_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY audit_insert ON audit_log FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Distractor overrides: readable by all, writable by admins
CREATE POLICY do_select ON distractor_overrides FOR SELECT USING (true);
CREATE POLICY do_admin ON distractor_overrides FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Subscriptions: users own their subscription
CREATE POLICY sub_own ON subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY sub_admin ON subscriptions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Payment events: admin only
CREATE POLICY pe_admin ON payment_events FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
