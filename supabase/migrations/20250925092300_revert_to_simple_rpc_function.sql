-- Revert to simpler, working RPC function
-- The complex field validation was causing issues
-- This version focuses on core functionality that was working before

CREATE OR REPLACE FUNCTION upload_with_deduplication(
  p_table_name text,
  p_records jsonb,
  p_duplicate_fields text[]
) RETURNS jsonb AS $$
DECLARE
  duplicates_removed integer := 0;
  records_inserted integer := 0;
  errors text[] := ARRAY[]::text[];
  record_item jsonb;
  duplicate_query text;
  delete_query text;
  insert_query text;
  existing_ids uuid[];
  field_name text;
  where_conditions text[] := ARRAY[]::text[];
  field_value text;
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

  -- Process each record for duplicate detection and removal
  FOR i IN 0..jsonb_array_length(p_records)-1 LOOP
    record_item := p_records->i;
    where_conditions := ARRAY[]::text[];

    -- Build WHERE conditions for duplicate detection
    FOREACH field_name IN ARRAY p_duplicate_fields LOOP
      IF record_item ? field_name THEN
        field_value := record_item->>field_name;
        IF field_value IS NULL OR field_value = '' THEN
          where_conditions := where_conditions || (field_name || ' IS NULL');
        ELSE
          where_conditions := where_conditions || (field_name || ' = ' || quote_literal(field_value));
        END IF;
      END IF;
    END LOOP;

    -- Find and delete existing duplicates
    IF array_length(where_conditions, 1) > 0 THEN
      duplicate_query := 'SELECT array_agg(id) FROM ' || quote_ident(p_table_name) ||
                        ' WHERE ' || array_to_string(where_conditions, ' AND ');

      BEGIN
        EXECUTE duplicate_query INTO existing_ids;

        IF existing_ids IS NOT NULL AND array_length(existing_ids, 1) > 0 THEN
          delete_query := 'DELETE FROM ' || quote_ident(p_table_name) ||
                         ' WHERE id = ANY($1)';
          EXECUTE delete_query USING existing_ids;

          duplicates_removed := duplicates_removed + array_length(existing_ids, 1);
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          errors := errors || ('Duplicate detection failed for record ' || (i + 1)::text || ': ' || SQLERRM);
          CONTINUE;
      END;
    END IF;
  END LOOP;

  -- Simple bulk insert using jsonb_to_recordset
  BEGIN
    CASE p_table_name
      WHEN 'submitted_apps_details' THEN
        insert_query := '
          INSERT INTO submitted_apps_details (advisor_code, advisor_name, process_date, insured_name, policy_number, submitted_apps)
          SELECT advisor_code, advisor_name, process_date::date, insured_name, policy_number, submitted_apps::numeric
          FROM jsonb_to_recordset($1) AS x(
            advisor_code text,
            advisor_name text,
            process_date text,
            insured_name text,
            policy_number text,
            submitted_apps text
          )';
      WHEN 'settled_apps_details' THEN
        insert_query := '
          INSERT INTO settled_apps_details (advisor_code, advisor_name, process_date, insured_name, policy_number, settled_apps, agency_credits, net_sales_credits)
          SELECT advisor_code, advisor_name, process_date::date, insured_name, policy_number, settled_apps::numeric, agency_credits::numeric, net_sales_credits::numeric
          FROM jsonb_to_recordset($1) AS x(
            advisor_code text,
            advisor_name text,
            process_date text,
            insured_name text,
            policy_number text,
            settled_apps text,
            agency_credits text,
            net_sales_credits text
          )';
      WHEN 'fy_commission_details' THEN
        insert_query := '
          INSERT INTO fy_commission_details (code, process_date, insured_name, policy_number, transaction_type, fy_premium_php, due_date, rate, fy_commission_php)
          SELECT code, process_date::date, insured_name, policy_number, transaction_type, fy_premium_php::numeric, due_date::date, rate::numeric, fy_commission_php::numeric
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
          )';
      WHEN 'rn_commission_details' THEN
        insert_query := '
          INSERT INTO rn_commission_details (code, process_date, insured_name, policy_number, transaction_type, rn_premium_php, due_date, rate, year, rn_commission_php)
          SELECT code, process_date::date, insured_name, policy_number, transaction_type, rn_premium_php::numeric, due_date::date, rate::numeric, year::integer, rn_commission_php::numeric
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
          )';
    END CASE;

    EXECUTE insert_query USING p_records;
    records_inserted := jsonb_array_length(p_records);

  EXCEPTION
    WHEN OTHERS THEN
      errors := errors || ('Insert failed: ' || SQLERRM);
      records_inserted := 0;
  END;

  RETURN jsonb_build_object(
    'success', (array_length(errors, 1) IS NULL OR array_length(errors, 1) = 0) AND records_inserted > 0,
    'duplicates_removed', duplicates_removed,
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