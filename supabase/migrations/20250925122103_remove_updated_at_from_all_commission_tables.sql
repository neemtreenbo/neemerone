-- Remove updated_at columns and triggers from all 4 commission tables
-- This will eliminate the "record 'new' has no field 'updated_at'" errors

-- ============================================================================
-- 1. Remove triggers for all 4 tables
-- ============================================================================

-- Drop triggers for submitted_apps_details
DROP TRIGGER IF EXISTS update_submitted_apps_details_updated_at ON public.submitted_apps_details;

-- Drop triggers for settled_apps_details
DROP TRIGGER IF EXISTS update_settled_apps_details_updated_at ON public.settled_apps_details;

-- Drop triggers for fy_commission_details
DROP TRIGGER IF EXISTS update_fy_commission_details_updated_at ON public.fy_commission_details;

-- Drop triggers for rn_commission_details
DROP TRIGGER IF EXISTS update_rn_commission_details_updated_at ON public.rn_commission_details;

-- ============================================================================
-- 2. Remove updated_at columns from all 4 tables
-- ============================================================================

-- Remove updated_at from submitted_apps_details
ALTER TABLE public.submitted_apps_details
DROP COLUMN IF EXISTS updated_at;

-- Remove updated_at from settled_apps_details
ALTER TABLE public.settled_apps_details
DROP COLUMN IF EXISTS updated_at;

-- Remove updated_at from fy_commission_details
ALTER TABLE public.fy_commission_details
DROP COLUMN IF EXISTS updated_at;

-- Remove updated_at from rn_commission_details
ALTER TABLE public.rn_commission_details
DROP COLUMN IF EXISTS updated_at;

-- ============================================================================
-- Note: We keep created_at for audit purposes
-- ============================================================================