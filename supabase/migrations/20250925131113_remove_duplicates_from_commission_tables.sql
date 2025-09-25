-- Create comprehensive duplicate removal system for all commission tables
-- Identifies exact field matches and keeps the latest record based on created_at

CREATE OR REPLACE FUNCTION remove_duplicates_from_tables(p_table_names text[])
RETURNS jsonb AS $$
DECLARE
  table_name text;
  duplicates_removed integer := 0;
  total_duplicates_removed integer := 0;
  errors text[] := ARRAY[]::text[];
  table_results jsonb := '{}';
BEGIN
  -- Process each requested table
  FOREACH table_name IN ARRAY p_table_names
  LOOP
    duplicates_removed := 0;

    BEGIN
      CASE table_name
        WHEN 'submitted_apps_details' THEN
          -- Remove duplicates keeping latest created_at
          WITH duplicate_groups AS (
            SELECT
              advisor_code, advisor_name, process_date, insured_name, policy_number, submitted_apps,
              COUNT(*) as cnt,
              array_agg(id ORDER BY created_at DESC) as ids
            FROM submitted_apps_details
            WHERE advisor_code IS NOT NULL
            GROUP BY advisor_code, advisor_name, process_date, insured_name, policy_number, submitted_apps
            HAVING COUNT(*) > 1
          )
          DELETE FROM submitted_apps_details
          WHERE id IN (
            SELECT unnest(ids[2:]) FROM duplicate_groups
          );

          GET DIAGNOSTICS duplicates_removed = ROW_COUNT;

        WHEN 'settled_apps_details' THEN
          -- Remove duplicates keeping latest created_at
          WITH duplicate_groups AS (
            SELECT
              advisor_code, advisor_name, process_date, insured_name, policy_number, settled_apps, agency_credits, net_sales_credits,
              COUNT(*) as cnt,
              array_agg(id ORDER BY created_at DESC) as ids
            FROM settled_apps_details
            WHERE advisor_code IS NOT NULL
            GROUP BY advisor_code, advisor_name, process_date, insured_name, policy_number, settled_apps, agency_credits, net_sales_credits
            HAVING COUNT(*) > 1
          )
          DELETE FROM settled_apps_details
          WHERE id IN (
            SELECT unnest(ids[2:]) FROM duplicate_groups
          );

          GET DIAGNOSTICS duplicates_removed = ROW_COUNT;

        WHEN 'fy_commission_details' THEN
          -- Remove duplicates keeping latest created_at
          WITH duplicate_groups AS (
            SELECT
              advisor_code, advisor_name, process_date, fy_commission, commission_rate,
              COUNT(*) as cnt,
              array_agg(id ORDER BY created_at DESC) as ids
            FROM fy_commission_details
            WHERE advisor_code IS NOT NULL
            GROUP BY advisor_code, advisor_name, process_date, fy_commission, commission_rate
            HAVING COUNT(*) > 1
          )
          DELETE FROM fy_commission_details
          WHERE id IN (
            SELECT unnest(ids[2:]) FROM duplicate_groups
          );

          GET DIAGNOSTICS duplicates_removed = ROW_COUNT;

        WHEN 'rn_commission_details' THEN
          -- Remove duplicates keeping latest created_at
          WITH duplicate_groups AS (
            SELECT
              code, process_date, insured_name, policy_number, transaction_type, rn_premium_php, due_date, rate, year, rn_commission_php,
              COUNT(*) as cnt,
              array_agg(id ORDER BY created_at DESC) as ids
            FROM rn_commission_details
            WHERE code IS NOT NULL
            GROUP BY code, process_date, insured_name, policy_number, transaction_type, rn_premium_php, due_date, rate, year, rn_commission_php
            HAVING COUNT(*) > 1
          )
          DELETE FROM rn_commission_details
          WHERE id IN (
            SELECT unnest(ids[2:]) FROM duplicate_groups
          );

          GET DIAGNOSTICS duplicates_removed = ROW_COUNT;

        ELSE
          errors := errors || ('Invalid table name: ' || table_name);
          CONTINUE;
      END CASE;

      -- Store results for this table
      table_results := table_results || jsonb_build_object(
        table_name, jsonb_build_object(
          'duplicates_removed', duplicates_removed,
          'success', true
        )
      );

      -- Add to totals
      total_duplicates_removed := total_duplicates_removed + duplicates_removed;

    EXCEPTION
      WHEN OTHERS THEN
        errors := errors || (table_name || ' error: ' || SQLERRM);
        table_results := table_results || jsonb_build_object(
          table_name, jsonb_build_object(
            'duplicates_removed', 0,
            'success', false,
            'error', SQLERRM
          )
        );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', array_length(errors, 1) IS NULL,
    'total_duplicates_removed', total_duplicates_removed,
    'tables_processed', array_length(p_table_names, 1),
    'table_results', table_results,
    'errors', COALESCE(errors, ARRAY[]::text[])
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'total_duplicates_removed', 0,
      'tables_processed', 0,
      'table_results', '{}',
      'errors', ARRAY['Function error: ' || SQLERRM]
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a helper function to get duplicate statistics without removal
CREATE OR REPLACE FUNCTION get_duplicate_statistics(p_table_names text[])
RETURNS jsonb AS $$
DECLARE
  table_name text;
  duplicate_count integer := 0;
  total_records integer := 0;
  table_results jsonb := '{}';
BEGIN
  FOREACH table_name IN ARRAY p_table_names
  LOOP
    BEGIN
      CASE table_name
        WHEN 'submitted_apps_details' THEN
          WITH duplicate_groups AS (
            SELECT COUNT(*) as cnt
            FROM submitted_apps_details
            WHERE advisor_code IS NOT NULL
            GROUP BY advisor_code, advisor_name, process_date, insured_name, policy_number, submitted_apps
            HAVING COUNT(*) > 1
          )
          SELECT
            COALESCE(SUM(cnt - 1), 0),
            (SELECT COUNT(*) FROM submitted_apps_details)
          INTO duplicate_count, total_records;

        WHEN 'settled_apps_details' THEN
          WITH duplicate_groups AS (
            SELECT COUNT(*) as cnt
            FROM settled_apps_details
            WHERE advisor_code IS NOT NULL
            GROUP BY advisor_code, advisor_name, process_date, insured_name, policy_number, settled_apps, agency_credits, net_sales_credits
            HAVING COUNT(*) > 1
          )
          SELECT
            COALESCE(SUM(cnt - 1), 0),
            (SELECT COUNT(*) FROM settled_apps_details)
          INTO duplicate_count, total_records;

        WHEN 'fy_commission_details' THEN
          WITH duplicate_groups AS (
            SELECT COUNT(*) as cnt
            FROM fy_commission_details
            WHERE advisor_code IS NOT NULL
            GROUP BY advisor_code, advisor_name, process_date, fy_commission, commission_rate
            HAVING COUNT(*) > 1
          )
          SELECT
            COALESCE(SUM(cnt - 1), 0),
            (SELECT COUNT(*) FROM fy_commission_details)
          INTO duplicate_count, total_records;

        WHEN 'rn_commission_details' THEN
          WITH duplicate_groups AS (
            SELECT COUNT(*) as cnt
            FROM rn_commission_details
            WHERE code IS NOT NULL
            GROUP BY code, process_date, insured_name, policy_number, transaction_type, rn_premium_php, due_date, rate, year, rn_commission_php
            HAVING COUNT(*) > 1
          )
          SELECT
            COALESCE(SUM(cnt - 1), 0),
            (SELECT COUNT(*) FROM rn_commission_details)
          INTO duplicate_count, total_records;

        ELSE
          duplicate_count := 0;
          total_records := 0;
      END CASE;

      table_results := table_results || jsonb_build_object(
        table_name, jsonb_build_object(
          'total_records', total_records,
          'duplicate_records', duplicate_count,
          'unique_records', total_records - duplicate_count
        )
      );

    EXCEPTION
      WHEN OTHERS THEN
        table_results := table_results || jsonb_build_object(
          table_name, jsonb_build_object(
            'total_records', 0,
            'duplicate_records', 0,
            'unique_records', 0,
            'error', SQLERRM
          )
        );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'table_statistics', table_results
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'table_statistics', '{}',
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;