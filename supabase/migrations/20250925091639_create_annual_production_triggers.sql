-- Migration: Create Annual Production Summary Triggers and Functions
-- Description: Smart triggers and functions for annual production summary updates
-- Author: Claude Code
-- Date: 2025-09-25

-- ============================================================================
-- 1. Helper Function: Get Calendar Year Period
-- ============================================================================
CREATE OR REPLACE FUNCTION get_calendar_year_period(p_year integer)
RETURNS TABLE (
    period_start date,
    period_end date
) AS $$
BEGIN
    RETURN QUERY SELECT
        make_date(p_year, 1, 1) as period_start,
        make_date(p_year, 12, 31) as period_end;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. Helper Function: Get Systems Year Period
-- ============================================================================
CREATE OR REPLACE FUNCTION get_systems_year_period(p_year integer)
RETURNS TABLE (
    period_start date,
    period_end date
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        MIN(scp.start_date) as period_start,
        MAX(scp.end_date) as period_end
    FROM public.cal_systems_closing_periods scp
    WHERE scp.period_year = p_year;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. Core Function: Recalculate Annual Summary for Specific Advisor/Year/Type
-- ============================================================================
CREATE OR REPLACE FUNCTION recalculate_annual_summary(
    p_advisor_code text,
    p_period_year integer,
    p_period_type text
) RETURNS void AS $$
DECLARE
    advisor_info RECORD;
    period_info RECORD;
    summary_data RECORD;
BEGIN
    -- Get advisor information with team details
    SELECT
        m.advisor_name,
        m.unit_code,
        m.manager_id,
        m.photo_url,
        COALESCE(t.unit_name, m.unit_code) as unit_name
    INTO advisor_info
    FROM public.manpower m
    LEFT JOIN public.teams t ON m.team_id = t.id
    WHERE m.code_number = p_advisor_code;

    -- If advisor doesn't exist, exit
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Get period boundaries based on type
    IF p_period_type = 'calendar' THEN
        SELECT * INTO period_info FROM get_calendar_year_period(p_period_year);
    ELSE
        SELECT * INTO period_info FROM get_systems_year_period(p_period_year);
    END IF;

    -- If no period found, exit
    IF period_info.period_start IS NULL OR period_info.period_end IS NULL THEN
        RETURN;
    END IF;

    -- Aggregate annual data from monthly summaries (preferred method for performance)
    WITH annual_totals AS (
        SELECT
            COALESCE(SUM(total_settled_apps), 0) as total_settled_apps,
            COALESCE(SUM(total_agency_credits), 0) as total_agency_credits,
            COALESCE(SUM(total_net_sales_credits), 0) as total_net_sales_credits,
            COALESCE(SUM(total_rn_commission_php), 0) as total_rn_commission_php,
            COALESCE(SUM(total_submitted_apps), 0) as total_submitted_apps,
            COALESCE(SUM(transaction_count), 0) as transaction_count
        FROM public.monthly_production_summary
        WHERE advisor_code = p_advisor_code
            AND period_year = p_period_year
            AND period_type = p_period_type
    ),
    monthly_activity AS (
        SELECT
            COUNT(*) as months_with_activity,
            -- Average calculations
            COALESCE(AVG(total_settled_apps), 0) as avg_monthly_settled_apps,
            COALESCE(AVG(total_agency_credits), 0) as avg_monthly_agency_credits,
            COALESCE(AVG(total_net_sales_credits), 0) as avg_monthly_net_sales_credits,
            COALESCE(AVG(total_rn_commission_php), 0) as avg_monthly_rn_commission_php,
            COALESCE(AVG(total_submitted_apps), 0) as avg_monthly_submitted_apps,
            -- Peak calculations
            COALESCE(MAX(total_settled_apps), 0) as peak_month_settled_apps,
            COALESCE(MAX(total_agency_credits), 0) as peak_month_agency_credits,
            COALESCE(MAX(total_net_sales_credits), 0) as peak_month_net_sales_credits,
            COALESCE(MAX(total_rn_commission_php), 0) as peak_month_rn_commission_php,
            COALESCE(MAX(total_submitted_apps), 0) as peak_month_submitted_apps
        FROM public.monthly_production_summary
        WHERE advisor_code = p_advisor_code
            AND period_year = p_period_year
            AND period_type = p_period_type
            AND (total_settled_apps > 0 OR total_agency_credits > 0 OR total_net_sales_credits > 0
                 OR total_rn_commission_php > 0 OR total_submitted_apps > 0)
    )
    SELECT
        at.total_settled_apps,
        at.total_agency_credits,
        at.total_net_sales_credits,
        at.total_rn_commission_php,
        at.total_submitted_apps,
        at.transaction_count,
        COALESCE(ma.months_with_activity, 0) as months_with_activity,
        ma.avg_monthly_settled_apps,
        ma.avg_monthly_agency_credits,
        ma.avg_monthly_net_sales_credits,
        ma.avg_monthly_rn_commission_php,
        ma.avg_monthly_submitted_apps,
        ma.peak_month_settled_apps,
        ma.peak_month_agency_credits,
        ma.peak_month_net_sales_credits,
        ma.peak_month_rn_commission_php,
        ma.peak_month_submitted_apps
    INTO summary_data
    FROM annual_totals at
    FULL OUTER JOIN monthly_activity ma ON true;

    -- Upsert the annual summary record
    INSERT INTO public.annual_production_summary (
        advisor_code,
        period_year,
        period_type,
        period_start,
        period_end,
        advisor_name,
        unit_code,
        unit_name,
        manager_id,
        photo_url,
        total_settled_apps,
        total_agency_credits,
        total_net_sales_credits,
        total_rn_commission_php,
        total_submitted_apps,
        months_with_activity,
        avg_monthly_settled_apps,
        avg_monthly_agency_credits,
        avg_monthly_net_sales_credits,
        avg_monthly_rn_commission_php,
        avg_monthly_submitted_apps,
        peak_month_settled_apps,
        peak_month_agency_credits,
        peak_month_net_sales_credits,
        peak_month_rn_commission_php,
        peak_month_submitted_apps,
        transaction_count,
        last_updated
    )
    VALUES (
        p_advisor_code,
        p_period_year,
        p_period_type,
        period_info.period_start,
        period_info.period_end,
        advisor_info.advisor_name,
        advisor_info.unit_code,
        advisor_info.unit_name,
        advisor_info.manager_id,
        advisor_info.photo_url,
        summary_data.total_settled_apps,
        summary_data.total_agency_credits,
        summary_data.total_net_sales_credits,
        summary_data.total_rn_commission_php,
        summary_data.total_submitted_apps,
        summary_data.months_with_activity,
        summary_data.avg_monthly_settled_apps,
        summary_data.avg_monthly_agency_credits,
        summary_data.avg_monthly_net_sales_credits,
        summary_data.avg_monthly_rn_commission_php,
        summary_data.avg_monthly_submitted_apps,
        summary_data.peak_month_settled_apps,
        summary_data.peak_month_agency_credits,
        summary_data.peak_month_net_sales_credits,
        summary_data.peak_month_rn_commission_php,
        summary_data.peak_month_submitted_apps,
        summary_data.transaction_count,
        now()
    )
    ON CONFLICT (advisor_code, period_year, period_type)
    DO UPDATE SET
        period_start = EXCLUDED.period_start,
        period_end = EXCLUDED.period_end,
        advisor_name = EXCLUDED.advisor_name,
        unit_code = EXCLUDED.unit_code,
        unit_name = EXCLUDED.unit_name,
        manager_id = EXCLUDED.manager_id,
        photo_url = EXCLUDED.photo_url,
        total_settled_apps = EXCLUDED.total_settled_apps,
        total_agency_credits = EXCLUDED.total_agency_credits,
        total_net_sales_credits = EXCLUDED.total_net_sales_credits,
        total_rn_commission_php = EXCLUDED.total_rn_commission_php,
        total_submitted_apps = EXCLUDED.total_submitted_apps,
        months_with_activity = EXCLUDED.months_with_activity,
        avg_monthly_settled_apps = EXCLUDED.avg_monthly_settled_apps,
        avg_monthly_agency_credits = EXCLUDED.avg_monthly_agency_credits,
        avg_monthly_net_sales_credits = EXCLUDED.avg_monthly_net_sales_credits,
        avg_monthly_rn_commission_php = EXCLUDED.avg_monthly_rn_commission_php,
        avg_monthly_submitted_apps = EXCLUDED.avg_monthly_submitted_apps,
        peak_month_settled_apps = EXCLUDED.peak_month_settled_apps,
        peak_month_agency_credits = EXCLUDED.peak_month_agency_credits,
        peak_month_net_sales_credits = EXCLUDED.peak_month_net_sales_credits,
        peak_month_rn_commission_php = EXCLUDED.peak_month_rn_commission_php,
        peak_month_submitted_apps = EXCLUDED.peak_month_submitted_apps,
        transaction_count = EXCLUDED.transaction_count,
        last_updated = EXCLUDED.last_updated;

END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. Trigger Function: Update Annual Summaries When Monthly Data Changes
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_update_annual_from_monthly()
RETURNS TRIGGER AS $$
BEGIN
    -- Update both calendar and systems annual summaries when monthly data changes

    -- For INSERT/UPDATE operations
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        -- Update calendar annual summary
        PERFORM recalculate_annual_summary(
            NEW.advisor_code,
            NEW.period_year,
            'calendar'
        );

        -- Update systems annual summary
        PERFORM recalculate_annual_summary(
            NEW.advisor_code,
            NEW.period_year,
            'systems'
        );
    END IF;

    -- For UPDATE/DELETE operations (handle old values)
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        -- Update annual summary for old values (if different year)
        IF TG_OP = 'DELETE' OR OLD.period_year != NEW.period_year THEN
            PERFORM recalculate_annual_summary(
                OLD.advisor_code,
                OLD.period_year,
                'calendar'
            );

            PERFORM recalculate_annual_summary(
                OLD.advisor_code,
                OLD.period_year,
                'systems'
            );
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. Create Trigger on Monthly Summary Table
-- ============================================================================
DROP TRIGGER IF EXISTS tr_update_annual_from_monthly ON public.monthly_production_summary;
CREATE TRIGGER tr_update_annual_from_monthly
    AFTER INSERT OR UPDATE OR DELETE ON public.monthly_production_summary
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_annual_from_monthly();

-- ============================================================================
-- 6. Initial Population Function
-- ============================================================================
CREATE OR REPLACE FUNCTION populate_annual_production_summary(
    p_start_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE) - 2,
    p_end_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)
) RETURNS text AS $$
DECLARE
    advisor_rec RECORD;
    year_rec RECORD;
    processed_count integer := 0;
BEGIN
    -- Clear existing annual data for the year range
    DELETE FROM public.annual_production_summary
    WHERE period_year >= p_start_year AND period_year <= p_end_year;

    -- Loop through all advisors
    FOR advisor_rec IN
        SELECT DISTINCT code_number
        FROM public.manpower
        WHERE code_number IS NOT NULL
    LOOP
        -- Loop through each year in the range
        FOR year_rec IN
            SELECT generate_series(p_start_year, p_end_year) as year_value
        LOOP
            -- Calculate calendar annual summary
            PERFORM recalculate_annual_summary(
                advisor_rec.code_number,
                year_rec.year_value,
                'calendar'
            );
            processed_count := processed_count + 1;

            -- Calculate systems annual summary (if systems periods exist for this year)
            IF EXISTS (
                SELECT 1 FROM public.cal_systems_closing_periods
                WHERE period_year = year_rec.year_value
            ) THEN
                PERFORM recalculate_annual_summary(
                    advisor_rec.code_number,
                    year_rec.year_value,
                    'systems'
                );
                processed_count := processed_count + 1;
            END IF;
        END LOOP;
    END LOOP;

    RETURN 'Populated annual production summary for ' || p_start_year || '-' || p_end_year ||
           '. Processed ' || processed_count || ' advisor-year combinations.';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. Maintenance Function: Cleanup Old Annual Data
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_old_annual_summaries()
RETURNS text AS $$
DECLARE
    deleted_count integer;
    cutoff_year integer;
BEGIN
    -- Calculate cutoff year (3 years ago)
    cutoff_year := EXTRACT(year FROM CURRENT_DATE) - 2;

    -- Delete old records outside 3-year window
    DELETE FROM public.annual_production_summary
    WHERE period_year < cutoff_year;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN 'Cleaned up ' || deleted_count || ' old annual summary records before year ' || cutoff_year;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION populate_annual_production_summary(integer, integer) IS
'Populates annual_production_summary table for specified year range. Aggregates from monthly summaries.';

COMMENT ON FUNCTION recalculate_annual_summary(text, integer, text) IS
'Core function to recalculate annual summary for a specific advisor, year, and period type. Used by triggers and population function.';

COMMENT ON FUNCTION cleanup_old_annual_summaries() IS
'Removes annual summary records outside the 3-year rolling window. Should be run periodically.';