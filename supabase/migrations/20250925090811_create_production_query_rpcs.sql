-- Migration: Create Production Query RPC Functions
-- Description: Flexible RPC functions for querying monthly production summary data
-- Author: Claude Code
-- Date: 2025-09-25

-- ============================================================================
-- 1. Main RPC: Get Monthly Production Data with Flexible Parameters
-- ============================================================================
CREATE OR REPLACE FUNCTION get_monthly_production_data(
    p_start_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE) - 2,
    p_end_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE),
    p_period_type text DEFAULT 'calendar', -- 'calendar', 'systems', or 'both'
    p_advisor_codes text[] DEFAULT NULL,
    p_manager_ids text[] DEFAULT NULL,
    p_unit_codes text[] DEFAULT NULL,
    p_start_month integer DEFAULT NULL,
    p_end_month integer DEFAULT NULL
) RETURNS TABLE (
    advisor_code text,
    advisor_name text,
    unit_code text,
    unit_name text,
    manager_id text,
    photo_url text,
    period_year integer,
    period_month integer,
    period_type text,
    period_start date,
    period_end date,
    total_settled_apps numeric,
    total_agency_credits numeric,
    total_net_sales_credits numeric,
    total_rn_commission_php numeric,
    total_submitted_apps numeric,
    transaction_count integer,
    last_updated timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        mps.advisor_code,
        mps.advisor_name,
        mps.unit_code,
        mps.unit_name,
        mps.manager_id,
        mps.photo_url,
        mps.period_year,
        mps.period_month,
        mps.period_type,
        mps.period_start,
        mps.period_end,
        mps.total_settled_apps,
        mps.total_agency_credits,
        mps.total_net_sales_credits,
        mps.total_rn_commission_php,
        mps.total_submitted_apps,
        mps.transaction_count,
        mps.last_updated
    FROM public.monthly_production_summary mps
    WHERE
        -- Year filtering
        mps.period_year >= p_start_year
        AND mps.period_year <= p_end_year

        -- Period type filtering
        AND (
            p_period_type = 'both'
            OR mps.period_type = p_period_type
        )

        -- Month filtering (optional)
        AND (
            p_start_month IS NULL
            OR mps.period_month >= p_start_month
        )
        AND (
            p_end_month IS NULL
            OR mps.period_month <= p_end_month
        )

        -- Advisor filtering (optional)
        AND (
            p_advisor_codes IS NULL
            OR mps.advisor_code = ANY(p_advisor_codes)
        )

        -- Manager filtering (optional)
        AND (
            p_manager_ids IS NULL
            OR mps.manager_id = ANY(p_manager_ids)
        )

        -- Unit filtering (optional)
        AND (
            p_unit_codes IS NULL
            OR mps.unit_code = ANY(p_unit_codes)
        )
    ORDER BY
        mps.advisor_code,
        mps.period_year,
        mps.period_month,
        mps.period_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. RPC: Get Team Production Summary
-- ============================================================================
CREATE OR REPLACE FUNCTION get_team_production_summary(
    p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE),
    p_period_type text DEFAULT 'calendar',
    p_aggregation_level text DEFAULT 'manager' -- 'manager', 'unit', or 'overall'
) RETURNS TABLE (
    grouping_key text,
    grouping_name text,
    advisor_count integer,
    total_settled_apps numeric,
    total_agency_credits numeric,
    total_net_sales_credits numeric,
    total_rn_commission_php numeric,
    total_submitted_apps numeric,
    avg_settled_apps_per_advisor numeric,
    avg_agency_credits_per_advisor numeric,
    avg_net_sales_credits_per_advisor numeric,
    avg_rn_commission_per_advisor numeric,
    avg_submitted_apps_per_advisor numeric
) AS $$
BEGIN
    IF p_aggregation_level = 'manager' THEN
        RETURN QUERY
        SELECT
            mps.manager_id as grouping_key,
            COALESCE(m.advisor_name, 'Unknown Manager') as grouping_name,
            COUNT(DISTINCT mps.advisor_code)::integer as advisor_count,
            SUM(mps.total_settled_apps) as total_settled_apps,
            SUM(mps.total_agency_credits) as total_agency_credits,
            SUM(mps.total_net_sales_credits) as total_net_sales_credits,
            SUM(mps.total_rn_commission_php) as total_rn_commission_php,
            SUM(mps.total_submitted_apps) as total_submitted_apps,
            AVG(mps.total_settled_apps) as avg_settled_apps_per_advisor,
            AVG(mps.total_agency_credits) as avg_agency_credits_per_advisor,
            AVG(mps.total_net_sales_credits) as avg_net_sales_credits_per_advisor,
            AVG(mps.total_rn_commission_php) as avg_rn_commission_per_advisor,
            AVG(mps.total_submitted_apps) as avg_submitted_apps_per_advisor
        FROM public.monthly_production_summary mps
        LEFT JOIN public.manpower m ON mps.manager_id = m.code_number
        WHERE
            mps.period_year = p_year
            AND mps.period_type = p_period_type
        GROUP BY mps.manager_id, m.advisor_name
        ORDER BY SUM(mps.total_net_sales_credits) DESC;

    ELSIF p_aggregation_level = 'unit' THEN
        RETURN QUERY
        SELECT
            mps.unit_code as grouping_key,
            COALESCE(mps.unit_name, mps.unit_code) as grouping_name,
            COUNT(DISTINCT mps.advisor_code)::integer as advisor_count,
            SUM(mps.total_settled_apps) as total_settled_apps,
            SUM(mps.total_agency_credits) as total_agency_credits,
            SUM(mps.total_net_sales_credits) as total_net_sales_credits,
            SUM(mps.total_rn_commission_php) as total_rn_commission_php,
            SUM(mps.total_submitted_apps) as total_submitted_apps,
            AVG(mps.total_settled_apps) as avg_settled_apps_per_advisor,
            AVG(mps.total_agency_credits) as avg_agency_credits_per_advisor,
            AVG(mps.total_net_sales_credits) as avg_net_sales_credits_per_advisor,
            AVG(mps.total_rn_commission_php) as avg_rn_commission_per_advisor,
            AVG(mps.total_submitted_apps) as avg_submitted_apps_per_advisor
        FROM public.monthly_production_summary mps
        WHERE
            mps.period_year = p_year
            AND mps.period_type = p_period_type
        GROUP BY mps.unit_code, mps.unit_name
        ORDER BY SUM(mps.total_net_sales_credits) DESC;
    ELSE
        -- Overall summary
        RETURN QUERY
        SELECT
            'overall'::text as grouping_key,
            'Organization Total'::text as grouping_name,
            COUNT(DISTINCT mps.advisor_code)::integer as advisor_count,
            SUM(mps.total_settled_apps) as total_settled_apps,
            SUM(mps.total_agency_credits) as total_agency_credits,
            SUM(mps.total_net_sales_credits) as total_net_sales_credits,
            SUM(mps.total_rn_commission_php) as total_rn_commission_php,
            SUM(mps.total_submitted_apps) as total_submitted_apps,
            AVG(mps.total_settled_apps) as avg_settled_apps_per_advisor,
            AVG(mps.total_agency_credits) as avg_agency_credits_per_advisor,
            AVG(mps.total_net_sales_credits) as avg_net_sales_credits_per_advisor,
            AVG(mps.total_rn_commission_php) as avg_rn_commission_per_advisor,
            AVG(mps.total_submitted_apps) as avg_submitted_apps_per_advisor
        FROM public.monthly_production_summary mps
        WHERE
            mps.period_year = p_year
            AND mps.period_type = p_period_type;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Grant Permissions for RPC Functions
-- ============================================================================
GRANT EXECUTE ON FUNCTION get_monthly_production_data(integer, integer, text, text[], text[], text[], integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_production_summary(integer, text, text) TO authenticated;

GRANT EXECUTE ON FUNCTION populate_monthly_production_summary(integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_production_summaries() TO service_role;

-- ============================================================================
-- 4. Add Comments for Documentation
-- ============================================================================
COMMENT ON FUNCTION get_monthly_production_data(integer, integer, text, text[], text[], text[], integer, integer) IS
'Main RPC function for querying monthly production data with flexible filtering options';

COMMENT ON FUNCTION get_team_production_summary(integer, text, text) IS
'RPC function for aggregated team/manager/unit production summaries with averages';