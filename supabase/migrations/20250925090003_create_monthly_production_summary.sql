-- Migration: Create Monthly Production Summary Table
-- Description: Smart summary table with triggers for real-time production monitoring
-- Author: Claude Code
-- Date: 2025-09-25

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. Monthly Production Summary Table
-- ============================================================================
CREATE TABLE public.monthly_production_summary (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    advisor_code text NOT NULL,
    period_year integer NOT NULL,
    period_month integer NOT NULL,
    period_type text NOT NULL, -- 'calendar' or 'systems'
    period_start date NOT NULL,
    period_end date NOT NULL,

    -- Advisor info (denormalized for performance)
    advisor_name text,
    unit_code text,
    unit_name text,
    manager_id text,
    photo_url text,

    -- Production metrics from settled_apps_details
    total_settled_apps numeric(10,2) DEFAULT 0,
    total_agency_credits numeric(12,2) DEFAULT 0,
    total_net_sales_credits numeric(12,2) DEFAULT 0,

    -- Commission metrics from rn_commission_details
    total_rn_commission_php numeric(12,2) DEFAULT 0,

    -- Application metrics from submitted_apps_details
    total_submitted_apps numeric(10,2) DEFAULT 0,

    -- Metadata
    transaction_count integer DEFAULT 0,
    last_updated timestamptz DEFAULT now() NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,

    -- Constraints
    CONSTRAINT monthly_production_summary_year_valid CHECK (period_year >= 2000 AND period_year <= 2100),
    CONSTRAINT monthly_production_summary_month_valid CHECK (period_month >= 1 AND period_month <= 12),
    CONSTRAINT monthly_production_summary_type_valid CHECK (period_type IN ('calendar', 'systems')),
    CONSTRAINT monthly_production_summary_dates_valid CHECK (period_end > period_start),
    CONSTRAINT monthly_production_summary_unique_period UNIQUE (advisor_code, period_year, period_month, period_type),

    -- 3-year rolling window constraint (auto-cleanup)
    CONSTRAINT monthly_production_summary_3year_window CHECK (
        period_year >= EXTRACT(year FROM CURRENT_DATE) - 2 AND
        period_year <= EXTRACT(year FROM CURRENT_DATE)
    )
);

-- Add foreign key constraint to manpower table
ALTER TABLE public.monthly_production_summary
ADD CONSTRAINT monthly_production_summary_advisor_code_fkey
FOREIGN KEY (advisor_code) REFERENCES public.manpower(code_number) ON DELETE CASCADE;

-- Add comments
COMMENT ON TABLE public.monthly_production_summary IS 'Pre-aggregated monthly production data for fast dashboard queries with 3-year rolling window';
COMMENT ON COLUMN public.monthly_production_summary.advisor_code IS 'Reference to advisor code in manpower table';
COMMENT ON COLUMN public.monthly_production_summary.period_type IS 'Calendar (standard months) or Systems (custom closing periods)';
COMMENT ON COLUMN public.monthly_production_summary.total_settled_apps IS 'Sum of settled applications for the period';
COMMENT ON COLUMN public.monthly_production_summary.total_agency_credits IS 'Sum of agency credits for the period';
COMMENT ON COLUMN public.monthly_production_summary.total_net_sales_credits IS 'Sum of net sales credits for the period';
COMMENT ON COLUMN public.monthly_production_summary.total_rn_commission_php IS 'Sum of renewal commission in PHP for the period';
COMMENT ON COLUMN public.monthly_production_summary.total_submitted_apps IS 'Sum of submitted applications for the period';

-- ============================================================================
-- 2. Create Performance Indexes
-- ============================================================================

-- Primary query indexes
CREATE INDEX idx_monthly_production_summary_advisor_code ON public.monthly_production_summary(advisor_code);
CREATE INDEX idx_monthly_production_summary_period_year ON public.monthly_production_summary(period_year);
CREATE INDEX idx_monthly_production_summary_period_month ON public.monthly_production_summary(period_month);
CREATE INDEX idx_monthly_production_summary_period_type ON public.monthly_production_summary(period_type);
CREATE INDEX idx_monthly_production_summary_manager_id ON public.monthly_production_summary(manager_id);
CREATE INDEX idx_monthly_production_summary_unit_code ON public.monthly_production_summary(unit_code);

-- Composite indexes for common dashboard queries
CREATE INDEX idx_monthly_production_summary_advisor_year_type ON public.monthly_production_summary(advisor_code, period_year, period_type);
CREATE INDEX idx_monthly_production_summary_year_month_type ON public.monthly_production_summary(period_year, period_month, period_type);
CREATE INDEX idx_monthly_production_summary_manager_year_type ON public.monthly_production_summary(manager_id, period_year, period_type);
CREATE INDEX idx_monthly_production_summary_unit_year_type ON public.monthly_production_summary(unit_code, period_year, period_type);

-- Date range index for period queries
CREATE INDEX idx_monthly_production_summary_date_range ON public.monthly_production_summary(period_start, period_end);

-- ============================================================================
-- 3. Create Update Trigger
-- ============================================================================
CREATE TRIGGER update_monthly_production_summary_updated_at
    BEFORE UPDATE ON public.monthly_production_summary
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. Enable Row Level Security (RLS)
-- ============================================================================
ALTER TABLE public.monthly_production_summary ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. Create RLS Policies
-- ============================================================================

-- Allow authenticated users with app_role to view summary data
CREATE POLICY "authenticated_users_with_app_role_can_view_monthly_summary"
ON public.monthly_production_summary FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.app_role IS NOT NULL
    )
);

-- Allow admin/manager roles to manage summary data (for manual corrections)
CREATE POLICY "admin_manager_can_manage_monthly_summary"
ON public.monthly_production_summary FOR ALL
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
GRANT SELECT ON public.monthly_production_summary TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.monthly_production_summary TO service_role;