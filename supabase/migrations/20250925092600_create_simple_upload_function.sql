-- Create simple upload function without duplicate detection
-- This removes the problematic PostgreSQL jsonb field access that causes the "updated_at" error
-- We'll add duplicate detection back later as a separate feature

CREATE OR REPLACE FUNCTION upload_with_deduplication(
  p_table_name text,
  p_records jsonb,
  p_duplicate_fields text[]
) RETURNS jsonb AS $$
DECLARE
  records_inserted integer := 0;
  errors text[] := ARRAY[]::text[];
  insert_query text;
BEGIN
  -- Validate table name to prevent SQL injection
  IF p_table_name NOT IN ('submitted_apps_details', 'settled_apps_details', 'fy_commission_details', 'rn_commission_details') THEN
    RETURN jsonb_build_object(
      'success', false,
      'duplicates_removed', 0,
      'records_inserted', 0,
      'errors', ARRAY['Invalid table name: ' || p_table_name]
    );
  END IF;

  -- Simple insert using jsonb_to_recordset (no duplicate detection for now)
  BEGIN
    CASE p_table_name
      WHEN 'submitted_apps_details' THEN
        insert_query := '
          INSERT INTO submitted_apps_details (advisor_code, advisor_name, process_date, insured_name, policy_number, submitted_apps)
          SELECT advisor_code, advisor_name,
                 CASE WHEN process_date IS NULL OR process_date = '''' THEN NULL ELSE process_date::date END,
                 insured_name, policy_number,
                 CASE WHEN submitted_apps IS NULL OR submitted_apps = '''' THEN NULL ELSE submitted_apps::numeric END
          FROM jsonb_to_recordset($1) AS x(
            advisor_code text,
            advisor_name text,
            process_date text,
            insured_name text,
            policy_number text,
            submitted_apps text
          )
          WHERE advisor_code IS NOT NULL AND advisor_code != ''''';
      WHEN 'settled_apps_details' THEN
        insert_query := '
          INSERT INTO settled_apps_details (advisor_code, advisor_name, process_date, insured_name, policy_number, settled_apps, agency_credits, net_sales_credits)
          SELECT advisor_code, advisor_name,
                 CASE WHEN process_date IS NULL OR process_date = '''' THEN NULL ELSE process_date::date END,
                 insured_name, policy_number,
                 CASE WHEN settled_apps IS NULL OR settled_apps = '''' THEN NULL ELSE settled_apps::numeric END,
                 CASE WHEN agency_credits IS NULL OR agency_credits = '''' THEN NULL ELSE agency_credits::numeric END,
                 CASE WHEN net_sales_credits IS NULL OR net_sales_credits = '''' THEN NULL ELSE net_sales_credits::numeric END
          FROM jsonb_to_recordset($1) AS x(
            advisor_code text,
            advisor_name text,
            process_date text,
            insured_name text,
            policy_number text,
            settled_apps text,
            agency_credits text,
            net_sales_credits text
          )
          WHERE advisor_code IS NOT NULL AND advisor_code != ''''';
      WHEN 'fy_commission_details' THEN
        insert_query := '
          INSERT INTO fy_commission_details (code, process_date, insured_name, policy_number, transaction_type, fy_premium_php, due_date, rate, fy_commission_php)
          SELECT code,
                 CASE WHEN process_date IS NULL OR process_date = '''' THEN NULL ELSE process_date::date END,
                 insured_name, policy_number, transaction_type,
                 CASE WHEN fy_premium_php IS NULL OR fy_premium_php = '''' THEN NULL ELSE fy_premium_php::numeric END,
                 CASE WHEN due_date IS NULL OR due_date = '''' THEN NULL ELSE due_date::date END,
                 CASE WHEN rate IS NULL OR rate = '''' THEN NULL ELSE rate::numeric END,
                 CASE WHEN fy_commission_php IS NULL OR fy_commission_php = '''' THEN NULL ELSE fy_commission_php::numeric END
          FROM jsonb_to_recordset($1) AS x(
            code text,
            process_date text,
            insured_name text,
            policy_number text,
            transaction_type text,
            fy_premium_php text,
            due_date text,
            rate text,
            fy_commission_php text
          )
          WHERE code IS NOT NULL AND code != ''''';
      WHEN 'rn_commission_details' THEN
        insert_query := '
          INSERT INTO rn_commission_details (code, process_date, insured_name, policy_number, transaction_type, rn_premium_php, due_date, rate, year, rn_commission_php)
          SELECT code,
                 CASE WHEN process_date IS NULL OR process_date = '''' THEN NULL ELSE process_date::date END,
                 insured_name, policy_number, transaction_type,
                 CASE WHEN rn_premium_php IS NULL OR rn_premium_php = '''' THEN NULL ELSE rn_premium_php::numeric END,
                 CASE WHEN due_date IS NULL OR due_date = '''' THEN NULL ELSE due_date::date END,
                 CASE WHEN rate IS NULL OR rate = '''' THEN NULL ELSE rate::numeric END,
                 CASE WHEN year IS NULL OR year = '''' THEN NULL ELSE year::integer END,
                 CASE WHEN rn_commission_php IS NULL OR rn_commission_php = '''' THEN NULL ELSE rn_commission_php::numeric END
          FROM jsonb_to_recordset($1) AS x(
            code text,
            process_date text,
            insured_name text,
            policy_number text,
            transaction_type text,
            rn_premium_php text,
            due_date text,
            rate text,
            year text,
            rn_commission_php text
          )
          WHERE code IS NOT NULL AND code != ''''';
    END CASE;

    EXECUTE insert_query USING p_records;
    GET DIAGNOSTICS records_inserted = ROW_COUNT;

  EXCEPTION
    WHEN OTHERS THEN
      errors := errors || ('Insert failed: ' || SQLERRM);
      records_inserted := 0;
  END;

  RETURN jsonb_build_object(
    'success', (array_length(errors, 1) IS NULL OR array_length(errors, 1) = 0) AND records_inserted > 0,
    'duplicates_removed', 0, -- No duplicate detection for now
    'records_inserted', records_inserted,
    'errors', COALESCE(errors, ARRAY[]::text[])
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'duplicates_removed', 0,
      'records_inserted', 0,
      'errors', ARRAY['RPC function error: ' || SQLERRM]
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;