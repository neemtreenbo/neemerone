-- Migration: Create Settled Apps Details Table
-- Description: Creates improved settled apps tracking table with UUID, timestamps, and proper RLS
-- Author: Claude Code
-- Date: 2025-09-25

-- Drop existing table if it exists (in input schema)
DROP TABLE IF EXISTS input.settled_apps_details CASCADE;

-- ============================================================================
-- 1. Settled Apps Details Table
-- ============================================================================
CREATE TABLE public.settled_apps_details (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    advisor_code text NULL,
    advisor_name text NULL,
    process_date date NULL,
    insured_name text NULL,
    policy_number text NULL,
    settled_apps numeric(10, 2) NULL,
    agency_credits numeric(10, 2) NULL,
    net_sales_credits numeric(10, 2) NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,

    -- Constraints
    CONSTRAINT settled_apps_details_settled_apps_positive CHECK (settled_apps >= 0),
    CONSTRAINT settled_apps_details_agency_credits_positive CHECK (agency_credits >= 0),
    CONSTRAINT settled_apps_details_net_sales_credits_positive CHECK (net_sales_credits >= 0),
    CONSTRAINT settled_apps_details_process_date_valid CHECK (process_date <= CURRENT_DATE)
);

-- Add foreign key constraint to manpower table
ALTER TABLE public.settled_apps_details
ADD CONSTRAINT settled_apps_details_advisor_code_fkey
FOREIGN KEY (advisor_code) REFERENCES public.manpower(code_number) ON DELETE SET NULL;

-- Add comments
COMMENT ON TABLE public.settled_apps_details IS 'Settled applications details with agency and net sales credits';
COMMENT ON COLUMN public.settled_apps_details.advisor_code IS 'Reference to advisor code in manpower table';
COMMENT ON COLUMN public.settled_apps_details.settled_apps IS 'Number of settled applications';
COMMENT ON COLUMN public.settled_apps_details.agency_credits IS 'Credits earned by the agency';
COMMENT ON COLUMN public.settled_apps_details.net_sales_credits IS 'Net sales credits after deductions';

-- ============================================================================
-- 2. Create Update Trigger
-- ============================================================================
CREATE TRIGGER update_settled_apps_details_updated_at
    BEFORE UPDATE ON public.settled_apps_details
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. Create Indexes for Performance
-- ============================================================================
CREATE INDEX idx_settled_apps_details_advisor_code ON public.settled_apps_details(advisor_code);
CREATE INDEX idx_settled_apps_details_process_date ON public.settled_apps_details(process_date);
CREATE INDEX idx_settled_apps_details_policy_number ON public.settled_apps_details(policy_number);
CREATE INDEX idx_settled_apps_details_created_at ON public.settled_apps_details(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_settled_apps_advisor_process_date ON public.settled_apps_details(advisor_code, process_date);

-- ============================================================================
-- 4. Enable Row Level Security (RLS)
-- ============================================================================
ALTER TABLE public.settled_apps_details ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. Create RLS Policies
-- ============================================================================

-- Allow authenticated users with non-null app_role to view all settled apps data
CREATE POLICY "authenticated_users_with_app_role_can_view_settled_apps"
ON public.settled_apps_details FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.app_role IS NOT NULL
    )
);

-- Allow only admin/manager roles to insert settled apps data
CREATE POLICY "authenticated_users_with_app_role_can_insert_settled_apps"
ON public.settled_apps_details FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.app_role IN ('admin', 'manager')
    )
);

-- Allow only admin/manager roles to update settled apps data
CREATE POLICY "authenticated_users_with_app_role_can_update_settled_apps"
ON public.settled_apps_details FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.app_role IN ('admin', 'manager')
    )
);

-- Allow only admin/manager roles to delete settled apps data
CREATE POLICY "authenticated_users_with_app_role_can_delete_settled_apps"
ON public.settled_apps_details FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.app_role IN ('admin', 'manager')
    )
);

-- ============================================================================
-- 6. Grant Permissions
-- ============================================================================
GRANT SELECT ON public.settled_apps_details TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.settled_apps_details TO service_role;