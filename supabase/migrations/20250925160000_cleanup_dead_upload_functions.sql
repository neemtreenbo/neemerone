-- Cleanup dead RPC functions from upload system
-- Removes unused functions that were replaced by table-specific implementations
-- Date: 2025-09-25
-- Purpose: Performance optimization and code cleanup

-- Drop the old generic upload function (replaced by table-specific functions)
DROP FUNCTION IF EXISTS upload_with_deduplication(text, jsonb, text[]);

-- Drop the batch duplicate removal function (functionality now integrated into upload functions)
DROP FUNCTION IF EXISTS remove_duplicates_from_tables(text[]);

-- Drop the duplicate statistics function (no longer used in UI)
DROP FUNCTION IF EXISTS get_duplicate_statistics(text[]);

-- Add comment for documentation
COMMENT ON SCHEMA public IS 'Upload system now uses table-specific functions: upload_submitted_apps_with_dedup, upload_settled_apps_with_dedup, upload_fy_commission_with_dedup, upload_rn_commission_with_dedup';