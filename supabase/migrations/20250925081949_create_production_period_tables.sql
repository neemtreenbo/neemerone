-- Migration: Create Production Period Tables
-- Description: Creates foundation tables for production monitoring (Systems closing periods and Contest periods)
-- Author: Claude Code
-- Date: 2025-09-25

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. Systems Closing Periods Table
-- ============================================================================
CREATE TABLE public.cal_systems_closing_periods (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    period_year integer NOT NULL,
    period_month integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,

    -- Constraints
    CONSTRAINT cal_systems_closing_periods_year_valid CHECK (period_year >= 2000 AND period_year <= 2100),
    CONSTRAINT cal_systems_closing_periods_month_valid CHECK (period_month >= 1 AND period_month <= 12),
    CONSTRAINT cal_systems_closing_periods_dates_valid CHECK (end_date > start_date),
    CONSTRAINT cal_systems_closing_periods_unique_period UNIQUE (period_year, period_month)
);

-- Add comments for systems closing periods
COMMENT ON TABLE public.cal_systems_closing_periods IS 'Systems closing periods for production monitoring with custom date ranges';
COMMENT ON COLUMN public.cal_systems_closing_periods.period_year IS 'The year this period belongs to';
COMMENT ON COLUMN public.cal_systems_closing_periods.period_month IS 'The month this period represents (1-12)';
COMMENT ON COLUMN public.cal_systems_closing_periods.start_date IS 'Start date of the systems closing period';
COMMENT ON COLUMN public.cal_systems_closing_periods.end_date IS 'End date of the systems closing period';

-- ============================================================================
-- 2. Contest Periods Table
-- ============================================================================
CREATE TABLE public.cal_contest_periods (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    contest_name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    description text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,

    -- Constraints
    CONSTRAINT cal_contest_periods_dates_valid CHECK (end_date > start_date),
    CONSTRAINT cal_contest_periods_name_not_empty CHECK (length(trim(contest_name)) > 0)
);

-- Add comments for contest periods
COMMENT ON TABLE public.cal_contest_periods IS 'Contest periods for dynamic production tracking and competitions';
COMMENT ON COLUMN public.cal_contest_periods.contest_name IS 'Name of the contest or promotional period';
COMMENT ON COLUMN public.cal_contest_periods.start_date IS 'Start date of the contest period';
COMMENT ON COLUMN public.cal_contest_periods.end_date IS 'End date of the contest period';
COMMENT ON COLUMN public.cal_contest_periods.description IS 'Optional description of the contest goals or rules';

-- ============================================================================
-- 3. Create Update Triggers
-- ============================================================================
CREATE TRIGGER update_cal_systems_closing_periods_updated_at
    BEFORE UPDATE ON public.cal_systems_closing_periods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cal_contest_periods_updated_at
    BEFORE UPDATE ON public.cal_contest_periods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. Create Indexes for Performance
-- ============================================================================

-- Systems closing periods indexes
CREATE INDEX idx_cal_systems_closing_periods_year ON public.cal_systems_closing_periods(period_year);
CREATE INDEX idx_cal_systems_closing_periods_month ON public.cal_systems_closing_periods(period_month);
CREATE INDEX idx_cal_systems_closing_periods_start_date ON public.cal_systems_closing_periods(start_date);
CREATE INDEX idx_cal_systems_closing_periods_end_date ON public.cal_systems_closing_periods(end_date);
CREATE INDEX idx_cal_systems_closing_periods_created_at ON public.cal_systems_closing_periods(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_cal_systems_closing_periods_year_month ON public.cal_systems_closing_periods(period_year, period_month);
CREATE INDEX idx_cal_systems_closing_periods_date_range ON public.cal_systems_closing_periods(start_date, end_date);

-- Contest periods indexes
CREATE INDEX idx_cal_contest_periods_name ON public.cal_contest_periods(contest_name);
CREATE INDEX idx_cal_contest_periods_start_date ON public.cal_contest_periods(start_date);
CREATE INDEX idx_cal_contest_periods_end_date ON public.cal_contest_periods(end_date);
CREATE INDEX idx_cal_contest_periods_created_at ON public.cal_contest_periods(created_at);

-- Composite index for date range queries
CREATE INDEX idx_cal_contest_periods_date_range ON public.cal_contest_periods(start_date, end_date);

-- ============================================================================
-- 5. Enable Row Level Security (RLS)
-- ============================================================================
ALTER TABLE public.cal_systems_closing_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cal_contest_periods ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. Create RLS Policies
-- ============================================================================

-- Systems closing periods - view only with app_role
CREATE POLICY "authenticated_users_with_app_role_can_view_systems_periods"
ON public.cal_systems_closing_periods FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.app_role IS NOT NULL
    )
);

-- Contest periods - view only with app_role
CREATE POLICY "authenticated_users_with_app_role_can_view_contest_periods"
ON public.cal_contest_periods FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.app_role IS NOT NULL
    )
);

-- ============================================================================
-- 7. Grant Permissions
-- ============================================================================
GRANT SELECT ON public.cal_systems_closing_periods TO authenticated;
GRANT SELECT ON public.cal_contest_periods TO authenticated;

GRANT INSERT, UPDATE, DELETE ON public.cal_systems_closing_periods TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.cal_contest_periods TO service_role;