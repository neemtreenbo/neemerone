-- Create simple, reliable upload function for all 4 commission tables
-- This function avoids all the complex column detection issues and focuses on basic inserts

DROP FUNCTION IF EXISTS upload_with_deduplication(text, jsonb, text[]);

CREATE OR REPLACE FUNCTION upload_with_deduplication(
  p_table_name text,
  p_records jsonb,
  p_duplicate_fields text[]
) RETURNS jsonb AS $$
DECLARE
  records_inserted integer := 0;
  errors text[] := ARRAY[]::text[];
  record_item jsonb;
  i integer;
  insert_sql text;
  field_values text;
BEGIN
  -- Validate table name
  IF p_table_name NOT IN ('submitted_apps_details', 'settled_apps_details', 'fy_commission_details', 'rn_commission_details') THEN
    RETURN jsonb_build_object(
      'success', false,
      'duplicates_removed', 0,
      'records_inserted', 0,
      'errors', ARRAY['Invalid table name: ' || p_table_name]
    );
  END IF;

  -- Validate input
  IF p_records IS NULL OR jsonb_array_length(p_records) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'duplicates_removed', 0,
      'records_inserted', 0,
      'errors', ARRAY['No records provided']
    );
  END IF;

  -- Process records one by one to avoid bulk insert issues
  FOR i IN 0..jsonb_array_length(p_records)-1 LOOP
    record_item := p_records->i;

    BEGIN
      CASE p_table_name
        WHEN 'submitted_apps_details' THEN
          INSERT INTO submitted_apps_details (
            advisor_code, advisor_name, process_date, insured_name, policy_number, submitted_apps
          ) VALUES (
            record_item->>'advisor_code',
            record_item->>'advisor_name',
            (record_item->>'process_date')::date,
            record_item->>'insured_name',
            record_item->>'policy_number',
            (record_item->>'submitted_apps')::numeric
          );

        WHEN 'settled_apps_details' THEN
          INSERT INTO settled_apps_details (
            advisor_code, advisor_name, process_date, insured_name, policy_number,
            settled_apps, agency_credits, net_sales_credits
          ) VALUES (
            record_item->>'advisor_code',
            record_item->>'advisor_name',
            (record_item->>'process_date')::date,
            record_item->>'insured_name',
            record_item->>'policy_number',
            (record_item->>'settled_apps')::numeric,
            (record_item->>'agency_credits')::numeric,
            (record_item->>'net_sales_credits')::numeric
          );

        WHEN 'fy_commission_details' THEN
          INSERT INTO fy_commission_details (
            advisor_code, advisor_name, process_date, fy_commission, commission_rate
          ) VALUES (
            record_item->>'advisor_code',
            record_item->>'advisor_name',
            (record_item->>'process_date')::date,
            (record_item->>'fy_commission')::numeric,
            (record_item->>'commission_rate')::numeric
          );

        WHEN 'rn_commission_details' THEN
          INSERT INTO rn_commission_details (
            code, process_date, insured_name, policy_number, transaction_type, rn_premium_php, due_date, rate, year, rn_commission_php
          ) VALUES (
            record_item->>'code',
            (record_item->>'process_date')::date,
            record_item->>'insured_name',
            record_item->>'policy_number',
            record_item->>'transaction_type',
            (record_item->>'rn_premium_php')::numeric,
            (record_item->>'due_date')::date,
            (record_item->>'rate')::numeric,
            (record_item->>'year')::integer,
            (record_item->>'rn_commission_php')::numeric
          );
      END CASE;

      records_inserted := records_inserted + 1;

    EXCEPTION
      WHEN OTHERS THEN
        errors := errors || ('Record ' || (i + 1)::text || ' failed: ' || SQLERRM);
        CONTINUE;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', records_inserted > 0,
    'duplicates_removed', 0,  -- Not doing duplicate detection for now
    'records_inserted', records_inserted,
    'errors', COALESCE(errors, ARRAY[]::text[])
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'duplicates_removed', 0,
      'records_inserted', 0,
      'errors', ARRAY['Function error: ' || SQLERRM]
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;