-- Capture coarse player context for analytics: country (from Netlify geo,
-- country-level only, never the IP) and device class (from user-agent).
-- Both nullable; historic rows and any session without the data stay blank.
ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS device_type TEXT;
