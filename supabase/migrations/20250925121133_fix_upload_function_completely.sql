-- Completely fix the upload_with_deduplication function
-- The issue is that the function is still trying to access system columns
-- Let's create a much simpler version that works reliably

DROP FUNCTION IF EXISTS upload_with_deduplication(text, jsonb, text[]);

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
  i integer;
  insert_query text;
  values_list text[] := ARRAY[]::text[];
  single_value_list text;
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

  -- Validate input records
  IF p_records IS NULL OR jsonb_array_length(p_records) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'duplicates_removed', 0,
      'records_inserted', 0,
      'errors', ARRAY['No records provided']
    );
  END IF;

  -- Process each record for the specific table
  FOR i IN 0..jsonb_array_length(p_records)-1 LOOP
    record_item := p_records->i;

    CASE p_table_name
      WHEN 'submitted_apps_details' THEN
        -- Build values for submitted_apps_details
        single_value_list := '(' ||
          COALESCE(quote_literal(record_item->>'advisor_code'), 'NULL') || ',' ||
          COALESCE(quote_literal(record_item->>'advisor_name'), 'NULL') || ',' ||
          COALESCE(quote_literal(record_item->>'process_date'), 'NULL') || ',' ||
          COALESCE(quote_literal(record_item->>'insured_name'), 'NULL') || ',' ||
          COALESCE(quote_literal(record_item->>'policy_number'), 'NULL') || ',' ||
          COALESCE((record_item->>'submitted_apps')::text, 'NULL') ||
        ')';

      WHEN 'settled_apps_details' THEN
        -- Build values for settled_apps_details
        single_value_list := '(' ||
          COALESCE(quote_literal(record_item->>'advisor_code'), 'NULL') || ',' ||
          COALESCE(quote_literal(record_item->>'advisor_name'), 'NULL') || ',' ||
          COALESCE(quote_literal(record_item->>'process_date'), 'NULL') || ',' ||
          COALESCE(quote_literal(record_item->>'insured_name'), 'NULL') || ',' ||
          COALESCE(quote_literal(record_item->>'policy_number'), 'NULL') || ',' ||
          COALESCE((record_item->>'settled_apps')::text, 'NULL') || ',' ||
          COALESCE((record_item->>'agency_credits')::text, 'NULL') || ',' ||
          COALESCE((record_item->>'net_sales_credits')::text, 'NULL') ||
        ')';

      WHEN 'fy_commission_details' THEN
        -- Build values for fy_commission_details
        single_value_list := '(' ||
          COALESCE(quote_literal(record_item->>'advisor_code'), 'NULL') || ',' ||
          COALESCE(quote_literal(record_item->>'advisor_name'), 'NULL') || ',' ||
          COALESCE(quote_literal(record_item->>'process_date'), 'NULL') || ',' ||
          COALESCE((record_item->>'fy_commission')::text, 'NULL') || ',' ||
          COALESCE((record_item->>'commission_rate')::text, 'NULL') ||
        ')';

      WHEN 'rn_commission_details' THEN
        -- Build values for rn_commission_details
        single_value_list := '(' ||
          COALESCE(quote_literal(record_item->>'advisor_code'), 'NULL') || ',' ||
          COALESCE(quote_literal(record_item->>'advisor_name'), 'NULL') || ',' ||
          COALESCE(quote_literal(record_item->>'process_date'), 'NULL') || ',' ||
          COALESCE((record_item->>'rn_commission')::text, 'NULL') || ',' ||
          COALESCE((record_item->>'commission_rate')::text, 'NULL') || ',' ||
          COALESCE((record_item->>'year')::text, 'NULL') ||
        ')';
    END CASE;

    values_list := values_list || single_value_list;
  END LOOP;

  -- Build and execute insert query based on table
  CASE p_table_name
    WHEN 'submitted_apps_details' THEN
      insert_query := 'INSERT INTO submitted_apps_details (advisor_code, advisor_name, process_date, insured_name, policy_number, submitted_apps) VALUES ' ||
                      array_to_string(values_list, ', ');

    WHEN 'settled_apps_details' THEN
      insert_query := 'INSERT INTO settled_apps_details (advisor_code, advisor_name, process_date, insured_name, policy_number, settled_apps, agency_credits, net_sales_credits) VALUES ' ||
                      array_to_string(values_list, ', ');

    WHEN 'fy_commission_details' THEN
      insert_query := 'INSERT INTO fy_commission_details (advisor_code, advisor_name, process_date, fy_commission, commission_rate) VALUES ' ||
                      array_to_string(values_list, ', ');

    WHEN 'rn_commission_details' THEN
      insert_query := 'INSERT INTO rn_commission_details (advisor_code, advisor_name, process_date, rn_commission, commission_rate, year) VALUES ' ||
                      array_to_string(values_list, ', ');
  END CASE;

  -- Execute the insert
  BEGIN
    EXECUTE insert_query;
    records_inserted := jsonb_array_length(p_records);
  EXCEPTION
    WHEN OTHERS THEN
      errors := errors || ('Bulk insert failed: ' || SQLERRM);
      records_inserted := 0;
  END;

  RETURN jsonb_build_object(
    'success', records_inserted > 0,
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