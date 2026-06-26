-- Track the UI language a session was played in (da/en), now that the EN
-- version exists. Nullable; historic rows stay blank.
ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS language TEXT;
