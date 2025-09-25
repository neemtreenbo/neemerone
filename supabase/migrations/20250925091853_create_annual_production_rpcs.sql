-- Migration: Create Annual Production RPC Functions
-- Description: Flexible RPC functions for querying annual production summary data
-- Author: Claude Code
-- Date: 2025-09-25

-- ============================================================================
-- 1. Main RPC: Get Annual Production Data with Flexible Parameters
-- ============================================================================
CREATE OR REPLACE FUNCTION get_annual_production_data(
    p_start_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE) - 2,
    p_end_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE),
    p_period_type text DEFAULT 'calendar', -- 'calendar', 'systems', or 'both'
    p_advisor_codes text[] DEFAULT NULL,
    p_manager_ids text[] DEFAULT NULL,
    p_unit_codes text[] DEFAULT NULL
) RETURNS TABLE (
    advisor_code text,
    advisor_name text,
    unit_code text,
    unit_name text,
    manager_id text,
    photo_url text,
    period_year integer,
    period_type text,
    period_start date,
    period_end date,
    total_settled_apps numeric,
    total_agency_credits numeric,
    total_net_sales_credits numeric,
    total_rn_commission_php numeric,
    total_submitted_apps numeric,
    months_with_activity integer,
    avg_monthly_settled_apps numeric,
    avg_monthly_agency_credits numeric,
    avg_monthly_net_sales_credits numeric,
    avg_monthly_rn_commission_php numeric,
    avg_monthly_submitted_apps numeric,
    peak_month_settled_apps numeric,
    peak_month_agency_credits numeric,
    peak_month_net_sales_credits numeric,
    peak_month_rn_commission_php numeric,
    peak_month_submitted_apps numeric,
    transaction_count integer,
    last_updated timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        aps.advisor_code,
        aps.advisor_name,
        aps.unit_code,
        aps.unit_name,
        aps.manager_id,
        aps.photo_url,
        aps.period_year,
        aps.period_type,
        aps.period_start,
        aps.period_end,
        aps.total_settled_apps,
        aps.total_agency_credits,
        aps.total_net_sales_credits,
        aps.total_rn_commission_php,
        aps.total_submitted_apps,
        aps.months_with_activity,
        aps.avg_monthly_settled_apps,
        aps.avg_monthly_agency_credits,
        aps.avg_monthly_net_sales_credits,
        aps.avg_monthly_rn_commission_php,
        aps.avg_monthly_submitted_apps,
        aps.peak_month_settled_apps,
        aps.peak_month_agency_credits,
        aps.peak_month_net_sales_credits,
        aps.peak_month_rn_commission_php,
        aps.peak_month_submitted_apps,
        aps.transaction_count,
        aps.last_updated
    FROM public.annual_production_summary aps
    WHERE
        -- Year filtering
        aps.period_year >= p_start_year
        AND aps.period_year <= p_end_year

        -- Period type filtering
        AND (
            p_period_type = 'both'
            OR aps.period_type = p_period_type
        )

        -- Advisor filtering (optional)
        AND (
            p_advisor_codes IS NULL
            OR aps.advisor_code = ANY(p_advisor_codes)
        )

        -- Manager filtering (optional)
        AND (
            p_manager_ids IS NULL
            OR aps.manager_id = ANY(p_manager_ids)
        )

        -- Unit filtering (optional)
        AND (
            p_unit_codes IS NULL
            OR aps.unit_code = ANY(p_unit_codes)
        )
    ORDER BY
        aps.advisor_code,
        aps.period_year,
        aps.period_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. RPC: Get Annual Team/Manager Performance Summary
-- ============================================================================
CREATE OR REPLACE FUNCTION get_annual_team_summary(
    p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE),
    p_period_type text DEFAULT 'calendar',
    p_aggregation_level text DEFAULT 'manager' -- 'manager', 'unit', or 'overall'
) RETURNS TABLE (
    grouping_key text,
    grouping_name text,
    advisor_count integer,
    active_advisor_count integer, -- Advisors with production
    total_settled_apps numeric,
    total_agency_credits numeric,
    total_net_sales_credits numeric,
    total_rn_commission_php numeric,
    total_submitted_apps numeric,
    avg_settled_apps_per_advisor numeric,
    avg_agency_credits_per_advisor numeric,
    avg_net_sales_credits_per_advisor numeric,
    avg_rn_commission_per_advisor numeric,
    avg_submitted_apps_per_advisor numeric,
    avg_months_active numeric,
    top_performer_code text,
    top_performer_name text,
    top_performer_net_sales numeric
) AS $$
BEGIN
    IF p_aggregation_level = 'manager' THEN
        RETURN QUERY
        WITH manager_performance AS (
            SELECT
                aps.manager_id,
                COALESCE(m.advisor_name, 'Unknown Manager') as manager_name,
                COUNT(*) as advisor_count,
                COUNT(CASE WHEN aps.total_net_sales_credits > 0 THEN 1 END) as active_advisor_count,
                SUM(aps.total_settled_apps) as total_settled_apps,
                SUM(aps.total_agency_credits) as total_agency_credits,
                SUM(aps.total_net_sales_credits) as total_net_sales_credits,
                SUM(aps.total_rn_commission_php) as total_rn_commission_php,
                SUM(aps.total_submitted_apps) as total_submitted_apps,
                AVG(aps.total_settled_apps) as avg_settled_apps_per_advisor,
                AVG(aps.total_agency_credits) as avg_agency_credits_per_advisor,
                AVG(aps.total_net_sales_credits) as avg_net_sales_credits_per_advisor,
                AVG(aps.total_rn_commission_php) as avg_rn_commission_per_advisor,
                AVG(aps.total_submitted_apps) as avg_submitted_apps_per_advisor,
                AVG(aps.months_with_activity::numeric) as avg_months_active
            FROM public.annual_production_summary aps
            LEFT JOIN public.manpower m ON aps.manager_id = m.code_number
            WHERE aps.period_year = p_year AND aps.period_type = p_period_type
            GROUP BY aps.manager_id, m.advisor_name
        ),
        top_performers AS (
            SELECT DISTINCT ON (aps.manager_id)
                aps.manager_id,
                aps.advisor_code,
                aps.advisor_name,
                aps.total_net_sales_credits
            FROM public.annual_production_summary aps
            WHERE aps.period_year = p_year AND aps.period_type = p_period_type
            ORDER BY aps.manager_id, aps.total_net_sales_credits DESC
        )
        SELECT
            mp.manager_id as grouping_key,
            mp.manager_name as grouping_name,
            mp.advisor_count::integer,
            mp.active_advisor_count::integer,
            mp.total_settled_apps,
            mp.total_agency_credits,
            mp.total_net_sales_credits,
            mp.total_rn_commission_php,
            mp.total_submitted_apps,
            mp.avg_settled_apps_per_advisor,
            mp.avg_agency_credits_per_advisor,
            mp.avg_net_sales_credits_per_advisor,
            mp.avg_rn_commission_per_advisor,
            mp.avg_submitted_apps_per_advisor,
            mp.avg_months_active,
            tp.advisor_code,
            tp.advisor_name,
            tp.total_net_sales_credits
        FROM manager_performance mp
        LEFT JOIN top_performers tp ON mp.manager_id = tp.manager_id
        ORDER BY mp.total_net_sales_credits DESC;

    ELSIF p_aggregation_level = 'unit' THEN
        RETURN QUERY
        WITH unit_performance AS (
            SELECT
                aps.unit_code,
                COALESCE(aps.unit_name, aps.unit_code) as unit_name,
                COUNT(*) as advisor_count,
                COUNT(CASE WHEN aps.total_net_sales_credits > 0 THEN 1 END) as active_advisor_count,
                SUM(aps.total_settled_apps) as total_settled_apps,
                SUM(aps.total_agency_credits) as total_agency_credits,
                SUM(aps.total_net_sales_credits) as total_net_sales_credits,
                SUM(aps.total_rn_commission_php) as total_rn_commission_php,
                SUM(aps.total_submitted_apps) as total_submitted_apps,
                AVG(aps.total_settled_apps) as avg_settled_apps_per_advisor,
                AVG(aps.total_agency_credits) as avg_agency_credits_per_advisor,
                AVG(aps.total_net_sales_credits) as avg_net_sales_credits_per_advisor,
                AVG(aps.total_rn_commission_php) as avg_rn_commission_per_advisor,
                AVG(aps.total_submitted_apps) as avg_submitted_apps_per_advisor,
                AVG(aps.months_with_activity::numeric) as avg_months_active
            FROM public.annual_production_summary aps
            WHERE aps.period_year = p_year AND aps.period_type = p_period_type
            GROUP BY aps.unit_code, aps.unit_name
        ),
        top_performers AS (
            SELECT DISTINCT ON (aps.unit_code)
                aps.unit_code,
                aps.advisor_code,
                aps.advisor_name,
                aps.total_net_sales_credits
            FROM public.annual_production_summary aps
            WHERE aps.period_year = p_year AND aps.period_type = p_period_type
            ORDER BY aps.unit_code, aps.total_net_sales_credits DESC
        )
        SELECT
            up.unit_code as grouping_key,
            up.unit_name as grouping_name,
            up.advisor_count::integer,
            up.active_advisor_count::integer,
            up.total_settled_apps,
            up.total_agency_credits,
            up.total_net_sales_credits,
            up.total_rn_commission_php,
            up.total_submitted_apps,
            up.avg_settled_apps_per_advisor,
            up.avg_agency_credits_per_advisor,
            up.avg_net_sales_credits_per_advisor,
            up.avg_rn_commission_per_advisor,
            up.avg_submitted_apps_per_advisor,
            up.avg_months_active,
            tp.advisor_code,
            tp.advisor_name,
            tp.total_net_sales_credits
        FROM unit_performance up
        LEFT JOIN top_performers tp ON up.unit_code = tp.unit_code
        ORDER BY up.total_net_sales_credits DESC;
    ELSE
        -- Overall summary
        RETURN QUERY
        WITH overall_performance AS (
            SELECT
                COUNT(*) as advisor_count,
                COUNT(CASE WHEN aps.total_net_sales_credits > 0 THEN 1 END) as active_advisor_count,
                SUM(aps.total_settled_apps) as total_settled_apps,
                SUM(aps.total_agency_credits) as total_agency_credits,
                SUM(aps.total_net_sales_credits) as total_net_sales_credits,
                SUM(aps.total_rn_commission_php) as total_rn_commission_php,
                SUM(aps.total_submitted_apps) as total_submitted_apps,
                AVG(aps.total_settled_apps) as avg_settled_apps_per_advisor,
                AVG(aps.total_agency_credits) as avg_agency_credits_per_advisor,
                AVG(aps.total_net_sales_credits) as avg_net_sales_credits_per_advisor,
                AVG(aps.total_rn_commission_php) as avg_rn_commission_per_advisor,
                AVG(aps.total_submitted_apps) as avg_submitted_apps_per_advisor,
                AVG(aps.months_with_activity::numeric) as avg_months_active
            FROM public.annual_production_summary aps
            WHERE aps.period_year = p_year AND aps.period_type = p_period_type
        ),
        top_performer AS (
            SELECT
                aps.advisor_code,
                aps.advisor_name,
                aps.total_net_sales_credits
            FROM public.annual_production_summary aps
            WHERE aps.period_year = p_year AND aps.period_type = p_period_type
            ORDER BY aps.total_net_sales_credits DESC
            LIMIT 1
        )
        SELECT
            'overall'::text as grouping_key,
            'Organization Total'::text as grouping_name,
            op.advisor_count::integer,
            op.active_advisor_count::integer,
            op.total_settled_apps,
            op.total_agency_credits,
            op.total_net_sales_credits,
            op.total_rn_commission_php,
            op.total_submitted_apps,
            op.avg_settled_apps_per_advisor,
            op.avg_agency_credits_per_advisor,
            op.avg_net_sales_credits_per_advisor,
            op.avg_rn_commission_per_advisor,
            op.avg_submitted_apps_per_advisor,
            op.avg_months_active,
            tp.advisor_code,
            tp.advisor_name,
            tp.total_net_sales_credits
        FROM overall_performance op
        CROSS JOIN top_performer tp;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Grant Permissions for RPC Functions
-- ============================================================================
GRANT EXECUTE ON FUNCTION get_annual_production_data(integer, integer, text, text[], text[], text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_annual_team_summary(integer, text, text) TO authenticated;

GRANT EXECUTE ON FUNCTION populate_annual_production_summary(integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_annual_summaries() TO service_role;

-- ============================================================================
-- 4. Add Comments for Documentation
-- ============================================================================
COMMENT ON FUNCTION get_annual_production_data(integer, integer, text, text[], text[], text[]) IS
'Main RPC function for querying annual production data with flexible filtering options';

COMMENT ON FUNCTION get_annual_team_summary(integer, text, text) IS
'RPC function for aggregated annual team/manager/unit summaries with top performer identification';