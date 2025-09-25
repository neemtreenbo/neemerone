-- Migration: Create Commission and Sales Tracking Tables
-- Description: Creates improved commission and sales tracking tables with UUID, timestamps, and proper RLS
-- Author: Claude Code
-- Date: 2025-09-25

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (in input schema)
DROP TABLE IF EXISTS input.fy_commission_details CASCADE;
DROP TABLE IF EXISTS input.rn_commission_details CASCADE;
DROP TABLE IF EXISTS input.submitted_apps_details CASCADE;

-- Create updated_at trigger function (reusable)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- 1. First Year Commission Details Table
-- ============================================================================
CREATE TABLE public.fy_commission_details (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    code text NULL,
    process_date date NULL,
    insured_name text NULL,
    policy_number text NULL,
    transaction_type text NULL,
    fy_premium_php numeric(12, 2) NULL,
    due_date date NULL,
    rate numeric(5, 4) NULL,
    fy_commission_php numeric(12, 2) NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,

    -- Constraints
    CONSTRAINT fy_commission_details_premium_positive CHECK (fy_premium_php >= 0),
    CONSTRAINT fy_commission_details_commission_positive CHECK (fy_commission_php >= 0),
    CONSTRAINT fy_commission_details_rate_valid CHECK (rate >= 0 AND rate <= 1),
    CONSTRAINT fy_commission_details_process_date_valid CHECK (process_date <= CURRENT_DATE)
);

-- Add foreign key constraint to manpower table
ALTER TABLE public.fy_commission_details
ADD CONSTRAINT fy_commission_details_code_fkey
FOREIGN KEY (code) REFERENCES public.manpower(code_number) ON DELETE SET NULL;

-- Add comments
COMMENT ON TABLE public.fy_commission_details IS 'First Year commission details for advisors';
COMMENT ON COLUMN public.fy_commission_details.code IS 'Reference to advisor code in manpower table';
COMMENT ON COLUMN public.fy_commission_details.fy_premium_php IS 'First year premium in Philippine Peso';
COMMENT ON COLUMN public.fy_commission_details.fy_commission_php IS 'First year commission in Philippine Peso';

-- ============================================================================
-- 2. Renewal Commission Details Table
-- ============================================================================
CREATE TABLE public.rn_commission_details (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    code text NULL,
    process_date date NULL,
    insured_name text NULL,
    policy_number text NULL,
    transaction_type text NULL,
    rn_premium_php numeric(12, 2) NULL,
    due_date date NULL,
    rate numeric(5, 4) NULL,
    year integer NULL,
    rn_commission_php numeric(12, 2) NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,

    -- Constraints
    CONSTRAINT rn_commission_details_premium_positive CHECK (rn_premium_php >= 0),
    CONSTRAINT rn_commission_details_commission_positive CHECK (rn_commission_php >= 0),
    CONSTRAINT rn_commission_details_rate_valid CHECK (rate >= 0 AND rate <= 1),
    CONSTRAINT rn_commission_details_year_valid CHECK (year >= 2000 AND year <= 2100),
    CONSTRAINT rn_commission_details_process_date_valid CHECK (process_date <= CURRENT_DATE)
);

-- Add foreign key constraint to manpower table
ALTER TABLE public.rn_commission_details
ADD CONSTRAINT rn_commission_details_code_fkey
FOREIGN KEY (code) REFERENCES public.manpower(code_number) ON DELETE SET NULL;

-- Add comments
COMMENT ON TABLE public.rn_commission_details IS 'Renewal commission details for advisors';
COMMENT ON COLUMN public.rn_commission_details.code IS 'Reference to advisor code in manpower table';
COMMENT ON COLUMN public.rn_commission_details.rn_premium_php IS 'Renewal premium in Philippine Peso';
COMMENT ON COLUMN public.rn_commission_details.rn_commission_php IS 'Renewal commission in Philippine Peso';
COMMENT ON COLUMN public.rn_commission_details.year IS 'Commission year';

-- ============================================================================
-- 3. Submitted Applications Details Table
-- ============================================================================
CREATE TABLE public.submitted_apps_details (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    advisor_code text NULL,
    advisor_name text NULL,
    process_date date NULL,
    insured_name text NULL,
    policy_number text NULL,
    submitted_apps numeric(10, 2) NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,

    -- Constraints
    CONSTRAINT submitted_apps_details_apps_positive CHECK (submitted_apps >= 0),
    CONSTRAINT submitted_apps_details_process_date_valid CHECK (process_date <= CURRENT_DATE)
);

-- Add foreign key constraint to manpower table
ALTER TABLE public.submitted_apps_details
ADD CONSTRAINT submitted_apps_details_advisor_code_fkey
FOREIGN KEY (advisor_code) REFERENCES public.manpower(code_number) ON DELETE SET NULL;

-- Add comments
COMMENT ON TABLE public.submitted_apps_details IS 'Submitted applications tracking for advisors';
COMMENT ON COLUMN public.submitted_apps_details.advisor_code IS 'Reference to advisor code in manpower table';
COMMENT ON COLUMN public.submitted_apps_details.submitted_apps IS 'Number of submitted applications';

-- ============================================================================
-- 4. Create Update Triggers
-- ============================================================================
CREATE TRIGGER update_fy_commission_details_updated_at
    BEFORE UPDATE ON public.fy_commission_details
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rn_commission_details_updated_at
    BEFORE UPDATE ON public.rn_commission_details
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submitted_apps_details_updated_at
    BEFORE UPDATE ON public.submitted_apps_details
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. Create Indexes for Performance
-- ============================================================================

-- FY Commission Details Indexes
CREATE INDEX idx_fy_commission_details_code ON public.fy_commission_details(code);
CREATE INDEX idx_fy_commission_details_process_date ON public.fy_commission_details(process_date);
CREATE INDEX idx_fy_commission_details_policy_number ON public.fy_commission_details(policy_number);
CREATE INDEX idx_fy_commission_details_due_date ON public.fy_commission_details(due_date);
CREATE INDEX idx_fy_commission_details_created_at ON public.fy_commission_details(created_at);

-- RN Commission Details Indexes
CREATE INDEX idx_rn_commission_details_code ON public.rn_commission_details(code);
CREATE INDEX idx_rn_commission_details_process_date ON public.rn_commission_details(process_date);
CREATE INDEX idx_rn_commission_details_policy_number ON public.rn_commission_details(policy_number);
CREATE INDEX idx_rn_commission_details_year ON public.rn_commission_details(year);
CREATE INDEX idx_rn_commission_details_due_date ON public.rn_commission_details(due_date);
CREATE INDEX idx_rn_commission_details_created_at ON public.rn_commission_details(created_at);

-- Submitted Apps Details Indexes
CREATE INDEX idx_submitted_apps_details_advisor_code ON public.submitted_apps_details(advisor_code);
CREATE INDEX idx_submitted_apps_details_process_date ON public.submitted_apps_details(process_date);
CREATE INDEX idx_submitted_apps_details_created_at ON public.submitted_apps_details(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_fy_commission_code_process_date ON public.fy_commission_details(code, process_date);
CREATE INDEX idx_rn_commission_code_year ON public.rn_commission_details(code, year);
CREATE INDEX idx_submitted_apps_code_process_date ON public.submitted_apps_details(advisor_code, process_date);

-- ============================================================================
-- 6. Enable Row Level Security (RLS)
-- ============================================================================
ALTER TABLE public.fy_commission_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rn_commission_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submitted_apps_details ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. Create RLS Policies
-- ============================================================================

-- FY Commission Details Policies
CREATE POLICY "authenticated_users_with_app_role_can_view_fy_commission"
ON public.fy_commission_details FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.app_role IS NOT NULL
    )
);

CREATE POLICY "authenticated_users_with_app_role_can_insert_fy_commission"
ON public.fy_commission_details FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.app_role IN ('admin', 'manager')
    )
);

-- RN Commission Details Policies
CREATE POLICY "authenticated_users_with_app_role_can_view_rn_commission"
ON public.rn_commission_details FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.app_role IS NOT NULL
    )
);

CREATE POLICY "authenticated_users_with_app_role_can_insert_rn_commission"
ON public.rn_commission_details FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.app_role IN ('admin', 'manager')
    )
);

-- Submitted Apps Details Policies
CREATE POLICY "authenticated_users_with_app_role_can_view_submitted_apps"
ON public.submitted_apps_details FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.app_role IS NOT NULL
    )
);

CREATE POLICY "authenticated_users_with_app_role_can_insert_submitted_apps"
ON public.submitted_apps_details FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.app_role IN ('admin', 'manager')
    )
);

-- ============================================================================
-- 8. Grant Permissions
-- ============================================================================
GRANT SELECT ON public.fy_commission_details TO authenticated;
GRANT SELECT ON public.rn_commission_details TO authenticated;
GRANT SELECT ON public.submitted_apps_details TO authenticated;

GRANT INSERT, UPDATE, DELETE ON public.fy_commission_details TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.rn_commission_details TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.submitted_apps_details TO service_role;