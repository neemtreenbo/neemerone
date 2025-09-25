-- Remove ALL constraints and triggers from submitted_apps_details table
-- Fuck the constraints - they're causing more problems than they solve

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS update_submitted_apps_details_updated_at ON public.submitted_apps_details;

-- Drop all check constraints
ALTER TABLE public.submitted_apps_details
DROP CONSTRAINT IF EXISTS submitted_apps_details_apps_positive;

ALTER TABLE public.submitted_apps_details
DROP CONSTRAINT IF EXISTS submitted_apps_details_process_date_valid;

-- Drop foreign key constraint (we can add it back later if needed)
ALTER TABLE public.submitted_apps_details
DROP CONSTRAINT IF EXISTS submitted_apps_details_advisor_code_fkey;

-- List what's left (for debugging)
-- The table should now have minimal constraints