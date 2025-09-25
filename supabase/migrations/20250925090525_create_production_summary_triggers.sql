-- Migration: Create Production Summary Triggers and Population Functions
-- Description: Smart triggers for auto-updating monthly_production_summary table
-- Author: Claude Code
-- Date: 2025-09-25

-- ============================================================================
-- 1. Helper Function: Get Calendar Period for Date
-- ============================================================================
CREATE OR REPLACE FUNCTION get_calendar_period(p_date date)
RETURNS TABLE (
    period_year integer,
    period_month integer,
    period_start date,
    period_end date
) AS $$
BEGIN
    RETURN QUERY SELECT
        EXTRACT(year FROM p_date)::integer,
        EXTRACT(month FROM p_date)::integer,
        date_trunc('month', p_date)::date,
        (date_trunc('month', p_date) + INTERVAL '1 month' - INTERVAL '1 day')::date;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. Helper Function: Get Systems Period for Date
-- ============================================================================
CREATE OR REPLACE FUNCTION get_systems_period(p_date date)
RETURNS TABLE (
    period_year integer,
    period_month integer,
    period_start date,
    period_end date
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        scp.period_year,
        scp.period_month,
        scp.start_date,
        scp.end_date
    FROM public.cal_systems_closing_periods scp
    WHERE p_date >= scp.start_date AND p_date <= scp.end_date
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. Core Function: Recalculate Monthly Summary for Specific Advisor/Period
-- ============================================================================
CREATE OR REPLACE FUNCTION recalculate_monthly_summary(
    p_advisor_code text,
    p_period_year integer,
    p_period_month integer,
    p_period_type text,
    p_period_start date,
    p_period_end date
) RETURNS void AS $$
DECLARE
    advisor_info RECORD;
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

    -- Aggregate all production data for the period
    WITH settled_data AS (
        SELECT
            COALESCE(SUM(settled_apps), 0) as total_settled_apps,
            COALESCE(SUM(agency_credits), 0) as total_agency_credits,
            COALESCE(SUM(net_sales_credits), 0) as total_net_sales_credits,
            COUNT(*) as settled_count
        FROM public.settled_apps_details
        WHERE advisor_code = p_advisor_code
            AND process_date >= p_period_start
            AND process_date <= p_period_end
    ),
    commission_data AS (
        SELECT
            COALESCE(SUM(rn_commission_php), 0) as total_rn_commission_php,
            COUNT(*) as commission_count
        FROM public.rn_commission_details
        WHERE code = p_advisor_code
            AND process_date >= p_period_start
            AND process_date <= p_period_end
    ),
    submitted_data AS (
        SELECT
            COALESCE(SUM(submitted_apps), 0) as total_submitted_apps,
            COUNT(*) as submitted_count
        FROM public.submitted_apps_details
        WHERE advisor_code = p_advisor_code
            AND process_date >= p_period_start
            AND process_date <= p_period_end
    )
    SELECT
        sd.total_settled_apps,
        sd.total_agency_credits,
        sd.total_net_sales_credits,
        cd.total_rn_commission_php,
        sub.total_submitted_apps,
        (sd.settled_count + cd.commission_count + sub.submitted_count) as total_transactions
    INTO summary_data
    FROM settled_data sd, commission_data cd, submitted_data sub;

    -- Upsert the summary record
    INSERT INTO public.monthly_production_summary (
        advisor_code,
        period_year,
        period_month,
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
        transaction_count,
        last_updated
    )
    VALUES (
        p_advisor_code,
        p_period_year,
        p_period_month,
        p_period_type,
        p_period_start,
        p_period_end,
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
        summary_data.total_transactions,
        now()
    )
    ON CONFLICT (advisor_code, period_year, period_month, period_type)
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
        transaction_count = EXCLUDED.transaction_count,
        last_updated = EXCLUDED.last_updated;

END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. Trigger Function: Handle Settled Apps Changes
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_update_summary_settled_apps()
RETURNS TRIGGER AS $$
DECLARE
    cal_period RECORD;
    sys_period RECORD;
    affected_date date;
BEGIN
    -- Determine which date to use (NEW for INSERT/UPDATE, OLD for DELETE)
    affected_date := COALESCE(NEW.process_date, OLD.process_date);

    -- Get calendar period for this date
    SELECT * INTO cal_period FROM get_calendar_period(affected_date);

    -- Update calendar summary if period found
    IF cal_period IS NOT NULL THEN
        PERFORM recalculate_monthly_summary(
            COALESCE(NEW.advisor_code, OLD.advisor_code),
            cal_period.period_year,
            cal_period.period_month,
            'calendar',
            cal_period.period_start,
            cal_period.period_end
        );
    END IF;

    -- Get systems period for this date
    SELECT * INTO sys_period FROM get_systems_period(affected_date);

    -- Update systems summary if period found
    IF sys_period IS NOT NULL THEN
        PERFORM recalculate_monthly_summary(
            COALESCE(NEW.advisor_code, OLD.advisor_code),
            sys_period.period_year,
            sys_period.period_month,
            'systems',
            sys_period.period_start,
            sys_period.period_end
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. Trigger Function: Handle Commission Changes
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_update_summary_commission()
RETURNS TRIGGER AS $$
DECLARE
    cal_period RECORD;
    sys_period RECORD;
    affected_date date;
BEGIN
    affected_date := COALESCE(NEW.process_date, OLD.process_date);

    -- Update calendar summary
    SELECT * INTO cal_period FROM get_calendar_period(affected_date);
    IF cal_period IS NOT NULL THEN
        PERFORM recalculate_monthly_summary(
            COALESCE(NEW.code, OLD.code),
            cal_period.period_year,
            cal_period.period_month,
            'calendar',
            cal_period.period_start,
            cal_period.period_end
        );
    END IF;

    -- Update systems summary
    SELECT * INTO sys_period FROM get_systems_period(affected_date);
    IF sys_period IS NOT NULL THEN
        PERFORM recalculate_monthly_summary(
            COALESCE(NEW.code, OLD.code),
            sys_period.period_year,
            sys_period.period_month,
            'systems',
            sys_period.period_start,
            sys_period.period_end
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. Trigger Function: Handle Submitted Apps Changes
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_update_summary_submitted_apps()
RETURNS TRIGGER AS $$
DECLARE
    cal_period RECORD;
    sys_period RECORD;
    affected_date date;
BEGIN
    affected_date := COALESCE(NEW.process_date, OLD.process_date);

    -- Update calendar summary
    SELECT * INTO cal_period FROM get_calendar_period(affected_date);
    IF cal_period IS NOT NULL THEN
        PERFORM recalculate_monthly_summary(
            COALESCE(NEW.advisor_code, OLD.advisor_code),
            cal_period.period_year,
            cal_period.period_month,
            'calendar',
            cal_period.period_start,
            cal_period.period_end
        );
    END IF;

    -- Update systems summary
    SELECT * INTO sys_period FROM get_systems_period(affected_date);
    IF sys_period IS NOT NULL THEN
        PERFORM recalculate_monthly_summary(
            COALESCE(NEW.advisor_code, OLD.advisor_code),
            sys_period.period_year,
            sys_period.period_month,
            'systems',
            sys_period.period_start,
            sys_period.period_end
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. Create Triggers on Source Tables
-- ============================================================================

-- Settled apps triggers
DROP TRIGGER IF EXISTS tr_update_summary_settled_apps ON public.settled_apps_details;
CREATE TRIGGER tr_update_summary_settled_apps
    AFTER INSERT OR UPDATE OR DELETE ON public.settled_apps_details
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_summary_settled_apps();

-- Commission triggers
DROP TRIGGER IF EXISTS tr_update_summary_commission ON public.rn_commission_details;
CREATE TRIGGER tr_update_summary_commission
    AFTER INSERT OR UPDATE OR DELETE ON public.rn_commission_details
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_summary_commission();

-- Submitted apps triggers
DROP TRIGGER IF EXISTS tr_update_summary_submitted_apps ON public.submitted_apps_details;
CREATE TRIGGER tr_update_summary_submitted_apps
    AFTER INSERT OR UPDATE OR DELETE ON public.submitted_apps_details
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_summary_submitted_apps();

-- ============================================================================
-- 8. Initial Population Function
-- ============================================================================
CREATE OR REPLACE FUNCTION populate_monthly_production_summary(
    p_start_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE) - 2,
    p_end_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)
) RETURNS text AS $$
DECLARE
    advisor_rec RECORD;
    cal_period RECORD;
    sys_period RECORD;
    processed_count integer := 0;
BEGIN
    -- Clear existing data for the year range
    DELETE FROM public.monthly_production_summary
    WHERE period_year >= p_start_year AND period_year <= p_end_year;

    -- Loop through all advisors
    FOR advisor_rec IN
        SELECT code_number FROM public.manpower
        WHERE code_number IS NOT NULL
    LOOP
        -- Generate calendar periods for each advisor
        FOR cal_period IN
            SELECT
                EXTRACT(year FROM month_date)::integer as period_year,
                EXTRACT(month FROM month_date)::integer as period_month,
                month_date::date as period_start,
                (date_trunc('month', month_date) + INTERVAL '1 month' - INTERVAL '1 day')::date as period_end
            FROM generate_series(
                make_date(p_start_year, 1, 1)::timestamp,
                make_date(p_end_year, 12, 31)::timestamp,
                '1 month'::interval
            ) month_date
        LOOP
            PERFORM recalculate_monthly_summary(
                advisor_rec.code_number,
                cal_period.period_year,
                cal_period.period_month,
                'calendar',
                cal_period.period_start,
                cal_period.period_end
            );
            processed_count := processed_count + 1;
        END LOOP;

        -- Generate systems periods for each advisor (if any exist)
        FOR sys_period IN
            SELECT
                period_year,
                period_month,
                start_date,
                end_date
            FROM public.cal_systems_closing_periods
            WHERE period_year >= p_start_year AND period_year <= p_end_year
        LOOP
            PERFORM recalculate_monthly_summary(
                advisor_rec.code_number,
                sys_period.period_year,
                sys_period.period_month,
                'systems',
                sys_period.start_date,
                sys_period.end_date
            );
            processed_count := processed_count + 1;
        END LOOP;
    END LOOP;

    RETURN 'Populated monthly production summary for ' || p_start_year || '-' || p_end_year ||
           '. Processed ' || processed_count || ' advisor-period combinations.';
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION populate_monthly_production_summary(integer, integer) IS
'Populates monthly_production_summary table for specified year range. Used for initial setup and maintenance.';

COMMENT ON FUNCTION recalculate_monthly_summary(text, integer, integer, text, date, date) IS
'Core function to recalculate monthly summary for a specific advisor and period. Used by triggers and population function.';

-- ============================================================================
-- 9. Maintenance Function: Cleanup Old Data
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_old_production_summaries()
RETURNS text AS $$
DECLARE
    deleted_count integer;
    cutoff_year integer;
BEGIN
    -- Calculate cutoff year (3 years ago)
    cutoff_year := EXTRACT(year FROM CURRENT_DATE) - 2;

    -- Delete old records outside 3-year window
    DELETE FROM public.monthly_production_summary
    WHERE period_year < cutoff_year;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN 'Cleaned up ' || deleted_count || ' old production summary records before year ' || cutoff_year;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_production_summaries() IS
'Removes production summary records outside the 3-year rolling window. Should be run periodically.';