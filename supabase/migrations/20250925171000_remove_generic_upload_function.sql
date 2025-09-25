-- Remove the generic upload_with_deduplication function - it's not the right one
-- The correct function is upload_submitted_apps_with_dedup
-- Date: 2025-09-25

DROP FUNCTION IF EXISTS upload_with_deduplication(text, jsonb, text[]);