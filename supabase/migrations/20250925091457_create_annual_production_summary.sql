-- Migration: Create Annual Production Summary Table
-- Description: Annual production summary with calendar and systems closing support
-- Author: Claude Code
-- Date: 2025-09-25

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. Annual Production Summary Table
-- ============================================================================
CREATE TABLE public.annual_production_summary (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    advisor_code text NOT NULL,
    period_year integer NOT NULL,
    period_type text NOT NULL, -- 'calendar' or 'systems'
    period_start date NOT NULL,
    period_end date NOT NULL,

    -- Advisor info (denormalized for performance)
    advisor_name text,
    unit_code text,
    unit_name text,
    manager_id text,
    photo_url text,

    -- Annual production metrics from settled_apps_details
    total_settled_apps numeric(10,2) DEFAULT 0,
    total_agency_credits numeric(12,2) DEFAULT 0,
    total_net_sales_credits numeric(12,2) DEFAULT 0,

    -- Annual commission metrics from rn_commission_details
    total_rn_commission_php numeric(12,2) DEFAULT 0,

    -- Annual application metrics from submitted_apps_details
    total_submitted_apps numeric(10,2) DEFAULT 0,

    -- Additional annual-specific metrics
    months_with_activity integer DEFAULT 0, -- Number of months with production
    avg_monthly_settled_apps numeric(10,2) DEFAULT 0,
    avg_monthly_agency_credits numeric(12,2) DEFAULT 0,
    avg_monthly_net_sales_credits numeric(12,2) DEFAULT 0,
    avg_monthly_rn_commission_php numeric(12,2) DEFAULT 0,
    avg_monthly_submitted_apps numeric(10,2) DEFAULT 0,

    -- Peak performance tracking
    peak_month_settled_apps numeric(10,2) DEFAULT 0,
    peak_month_agency_credits numeric(12,2) DEFAULT 0,
    peak_month_net_sales_credits numeric(12,2) DEFAULT 0,
    peak_month_rn_commission_php numeric(12,2) DEFAULT 0,
    peak_month_submitted_apps numeric(10,2) DEFAULT 0,

    -- Metadata
    transaction_count integer DEFAULT 0,
    last_updated timestamptz DEFAULT now() NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,

    -- Constraints
    CONSTRAINT annual_production_summary_year_valid CHECK (period_year >= 2000 AND period_year <= 2100),
    CONSTRAINT annual_production_summary_type_valid CHECK (period_type IN ('calendar', 'systems')),
    CONSTRAINT annual_production_summary_dates_valid CHECK (period_end > period_start),
    CONSTRAINT annual_production_summary_months_valid CHECK (months_with_activity >= 0 AND months_with_activity <= 12),
    CONSTRAINT annual_production_summary_unique_period UNIQUE (advisor_code, period_year, period_type),

    -- 3-year rolling window constraint (auto-cleanup)
    CONSTRAINT annual_production_summary_3year_window CHECK (
        period_year >= EXTRACT(year FROM CURRENT_DATE) - 2 AND
        period_year <= EXTRACT(year FROM CURRENT_DATE)
    )
);

-- Add foreign key constraint to manpower table
ALTER TABLE public.annual_production_summary
ADD CONSTRAINT annual_production_summary_advisor_code_fkey
FOREIGN KEY (advisor_code) REFERENCES public.manpower(code_number) ON DELETE CASCADE;

-- Add comments
COMMENT ON TABLE public.annual_production_summary IS 'Pre-aggregated annual production data for fast dashboard queries with 3-year rolling window';
COMMENT ON COLUMN public.annual_production_summary.advisor_code IS 'Reference to advisor code in manpower table';
COMMENT ON COLUMN public.annual_production_summary.period_type IS 'Calendar (Jan-Dec) or Systems (custom closing periods)';
COMMENT ON COLUMN public.annual_production_summary.total_settled_apps IS 'Sum of settled applications for the year';
COMMENT ON COLUMN public.annual_production_summary.total_agency_credits IS 'Sum of agency credits for the year';
COMMENT ON COLUMN public.annual_production_summary.total_net_sales_credits IS 'Sum of net sales credits for the year';
COMMENT ON COLUMN public.annual_production_summary.total_rn_commission_php IS 'Sum of renewal commission in PHP for the year';
COMMENT ON COLUMN public.annual_production_summary.total_submitted_apps IS 'Sum of submitted applications for the year';
COMMENT ON COLUMN public.annual_production_summary.months_with_activity IS 'Number of months with any production activity';
COMMENT ON COLUMN public.annual_production_summary.peak_month_settled_apps IS 'Highest monthly settled apps in the year';
COMMENT ON COLUMN public.annual_production_summary.avg_monthly_settled_apps IS 'Average monthly settled apps (total/12)';

-- ============================================================================
-- 2. Create Performance Indexes
-- ============================================================================

-- Primary query indexes
CREATE INDEX idx_annual_production_summary_advisor_code ON public.annual_production_summary(advisor_code);
CREATE INDEX idx_annual_production_summary_period_year ON public.annual_production_summary(period_year);
CREATE INDEX idx_annual_production_summary_period_type ON public.annual_production_summary(period_type);
CREATE INDEX idx_annual_production_summary_manager_id ON public.annual_production_summary(manager_id);
CREATE INDEX idx_annual_production_summary_unit_code ON public.annual_production_summary(unit_code);

-- Composite indexes for common dashboard queries
CREATE INDEX idx_annual_production_summary_advisor_year_type ON public.annual_production_summary(advisor_code, period_year, period_type);
CREATE INDEX idx_annual_production_summary_year_type ON public.annual_production_summary(period_year, period_type);
CREATE INDEX idx_annual_production_summary_manager_year_type ON public.annual_production_summary(manager_id, period_year, period_type);
CREATE INDEX idx_annual_production_summary_unit_year_type ON public.annual_production_summary(unit_code, period_year, period_type);

-- Date range index for period queries
CREATE INDEX idx_annual_production_summary_date_range ON public.annual_production_summary(period_start, period_end);

-- Performance ranking indexes (for top performers)
CREATE INDEX idx_annual_production_summary_net_sales_credits ON public.annual_production_summary(total_net_sales_credits DESC);
CREATE INDEX idx_annual_production_summary_agency_credits ON public.annual_production_summary(total_agency_credits DESC);
CREATE INDEX idx_annual_production_summary_settled_apps ON public.annual_production_summary(total_settled_apps DESC);

-- ============================================================================
-- 3. Create Update Trigger
-- ============================================================================
CREATE TRIGGER update_annual_production_summary_updated_at
    BEFORE UPDATE ON public.annual_production_summary
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. Enable Row Level Security (RLS)
-- ============================================================================
ALTER TABLE public.annual_production_summary ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. Create RLS Policies
-- ============================================================================

-- Allow authenticated users with app_role to view annual summary data
CREATE POLICY "authenticated_users_with_app_role_can_view_annual_summary"
ON public.annual_production_summary FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.app_role IS NOT NULL
    )
);

-- Allow admin/manager roles to manage annual summary data (for manual corrections)
CREATE POLICY "admin_manager_can_manage_annual_summary"
ON public.annual_production_summary FOR ALL
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
GRANT SELECT ON public.annual_production_summary TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.annual_production_summary TO service_role;