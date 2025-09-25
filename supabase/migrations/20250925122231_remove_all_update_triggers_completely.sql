-- Remove all possible update triggers from commission tables
-- This is a comprehensive cleanup to remove any remaining triggers that might be causing the updated_at errors

-- ============================================================================
-- Drop all possible trigger variations for all 4 commission tables
-- ============================================================================

-- submitted_apps_details triggers
DROP TRIGGER IF EXISTS update_submitted_apps_details_updated_at ON public.submitted_apps_details;
DROP TRIGGER IF EXISTS tr_submitted_apps_updated_at ON public.submitted_apps_details;
DROP TRIGGER IF EXISTS submitted_apps_details_updated_at ON public.submitted_apps_details;
DROP TRIGGER IF EXISTS tr_submitted_apps_details_updated_at ON public.submitted_apps_details;

-- settled_apps_details triggers
DROP TRIGGER IF EXISTS update_settled_apps_details_updated_at ON public.settled_apps_details;
DROP TRIGGER IF EXISTS tr_settled_apps_updated_at ON public.settled_apps_details;
DROP TRIGGER IF EXISTS settled_apps_details_updated_at ON public.settled_apps_details;
DROP TRIGGER IF EXISTS tr_settled_apps_details_updated_at ON public.settled_apps_details;

-- fy_commission_details triggers
DROP TRIGGER IF EXISTS update_fy_commission_details_updated_at ON public.fy_commission_details;
DROP TRIGGER IF EXISTS tr_fy_commission_updated_at ON public.fy_commission_details;
DROP TRIGGER IF EXISTS fy_commission_details_updated_at ON public.fy_commission_details;
DROP TRIGGER IF EXISTS tr_fy_commission_details_updated_at ON public.fy_commission_details;

-- rn_commission_details triggers
DROP TRIGGER IF EXISTS update_rn_commission_details_updated_at ON public.rn_commission_details;
DROP TRIGGER IF EXISTS tr_rn_commission_updated_at ON public.rn_commission_details;
DROP TRIGGER IF EXISTS rn_commission_details_updated_at ON public.rn_commission_details;
DROP TRIGGER IF EXISTS tr_rn_commission_details_updated_at ON public.rn_commission_details;

-- ============================================================================
-- Create a safe version of update_updated_at_column that checks if column exists
-- (Don't drop the function since other tables depend on it, just replace it)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the updated_at column exists in NEW record
  IF to_jsonb(NEW) ? 'updated_at' THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If there's any error, just return NEW without modification
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Also create a safe version of touch_updated_at
-- (Don't drop since other tables might depend on it, just replace it)
-- ============================================================================

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the updated_at column exists in NEW record
  IF to_jsonb(NEW) ? 'updated_at' THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If there's any error, just return NEW without modification
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;