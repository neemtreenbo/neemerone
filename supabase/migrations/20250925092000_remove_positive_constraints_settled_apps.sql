-- Remove positive-only constraints from financial tables
-- These constraints were preventing negative values from being inserted
-- which are valid in accounting notation (parentheses format)

-- Remove positive-only constraints from settled_apps_details
ALTER TABLE public.settled_apps_details
DROP CONSTRAINT IF EXISTS settled_apps_details_agency_credits_positive;

ALTER TABLE public.settled_apps_details
DROP CONSTRAINT IF EXISTS settled_apps_details_net_sales_credits_positive;

-- Remove positive-only constraints from fy_commission_details
ALTER TABLE public.fy_commission_details
DROP CONSTRAINT IF EXISTS fy_commission_details_premium_positive;

ALTER TABLE public.fy_commission_details
DROP CONSTRAINT IF EXISTS fy_commission_details_commission_positive;

-- Remove positive-only constraints from rn_commission_details
ALTER TABLE public.rn_commission_details
DROP CONSTRAINT IF EXISTS rn_commission_details_premium_positive;

ALTER TABLE public.rn_commission_details
DROP CONSTRAINT IF EXISTS rn_commission_details_commission_positive;

-- Keep constraints for:
-- - settled_apps (number of apps can't be negative)
-- - submitted_apps (number of apps can't be negative)
-- - rate constraints (rates should still be 0-1)
-- Only remove financial amount constraints that can be negative in accounting