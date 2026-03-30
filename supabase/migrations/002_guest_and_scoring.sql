-- Add guest_name and points columns to quiz_sessions
ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS points INTEGER;

-- Leaderboard index: fast queries by difficulty/mode/points
CREATE INDEX IF NOT EXISTS idx_qs_leaderboard
  ON quiz_sessions (difficulty, mode, points DESC NULLS LAST)
  WHERE completed = true;

-- Index for time-based leaderboard queries
CREATE INDEX IF NOT EXISTS idx_qs_leaderboard_time
  ON quiz_sessions (completed_at DESC NULLS LAST)
  WHERE completed = true;

-- Public leaderboard read access (completed sessions only)
CREATE POLICY qs_public_leaderboard ON quiz_sessions
  FOR SELECT USING (completed = true);
