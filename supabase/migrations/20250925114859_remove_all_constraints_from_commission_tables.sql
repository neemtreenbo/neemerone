-- Remove all constraints from rn_commission_details table
ALTER TABLE public.rn_commission_details
DROP CONSTRAINT IF EXISTS "rn_commission_details_process_date_valid",
DROP CONSTRAINT IF EXISTS "rn_commission_details_rate_valid",
DROP CONSTRAINT IF EXISTS "rn_commission_details_year_valid",
DROP CONSTRAINT IF EXISTS "rn_commission_details_code_fkey";

-- Remove all constraints from submitted_apps_details table
-- Note: Keeping primary key for data integrity, removing other constraints if any exist

-- Remove all constraints from fy_commission_details table
ALTER TABLE public.fy_commission_details
DROP CONSTRAINT IF EXISTS "fy_commission_details_process_date_valid",
DROP CONSTRAINT IF EXISTS "fy_commission_details_rate_valid",
DROP CONSTRAINT IF EXISTS "fy_commission_details_code_fkey";

-- Remove all constraints from settled_apps_details table
ALTER TABLE public.settled_apps_details
DROP CONSTRAINT IF EXISTS "settled_apps_details_process_date_valid",
DROP CONSTRAINT IF EXISTS "settled_apps_details_settled_apps_positive",
DROP CONSTRAINT IF EXISTS "settled_apps_details_advisor_code_fkey";