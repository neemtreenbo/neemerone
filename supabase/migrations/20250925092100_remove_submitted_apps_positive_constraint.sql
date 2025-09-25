-- Remove positive-only constraint from submitted_apps_details table
-- This constraint was preventing negative values from being inserted
-- which are valid in accounting notation for reversals/cancellations

-- Remove positive-only constraint from submitted_apps_details
-- Negative submitted_apps can represent application reversals or cancellations
ALTER TABLE public.submitted_apps_details
DROP CONSTRAINT IF EXISTS submitted_apps_details_apps_positive;