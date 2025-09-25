-- Fix RN Commission year constraint to allow policy years (1-50) instead of calendar years
-- Description: Update year constraint to accept policy year numbers
-- Author: Claude Code
-- Date: 2025-09-25

-- Drop the existing year constraint
ALTER TABLE public.rn_commission_details
DROP CONSTRAINT rn_commission_details_year_valid;

-- Add new year constraint for policy years (1-50)
ALTER TABLE public.rn_commission_details
ADD CONSTRAINT rn_commission_details_year_valid
CHECK (year >= 1 AND year <= 50);

-- Update the comment to reflect policy years
COMMENT ON COLUMN public.rn_commission_details.year IS 'Policy year (1-50)';