-- Restore the working upload_with_deduplication function that was mistakenly removed
-- This function was actually being used by submitted apps upload and was working correctly
-- Date: 2025-09-25
-- Purpose: Fix submitted apps upload that broke after "dead code" cleanup

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
  insert_columns text[] := ARRAY[]::text[];
  insert_values text[] := ARRAY[]::text[];
  record_values text[] := ARRAY[]::text[];
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

  -- Get column names from the first record for insert
  -- CRITICAL: Exclude updated_at column to prevent errors
  IF jsonb_array_length(p_records) > 0 THEN
    SELECT array_agg(key) INTO insert_columns
    FROM jsonb_object_keys(p_records->0) AS key
    WHERE key NOT IN ('id', 'created_at', 'updated_at');
  END IF;

  -- Process each record
  FOR i IN 0..jsonb_array_length(p_records)-1 LOOP
    record_item := p_records->i;
    where_conditions := ARRAY[]::text[];

    -- Build WHERE conditions for duplicate detection
    FOREACH field_name IN ARRAY p_duplicate_fields LOOP
      IF record_item ? field_name THEN
        IF record_item->>field_name IS NULL OR record_item->>field_name = '' THEN
          where_conditions := where_conditions || (field_name || ' IS NULL');
        ELSE
          where_conditions := where_conditions || (field_name || ' = ' || quote_literal(record_item->>field_name));
        END IF;
      END IF;
    END LOOP;

    -- Find and delete existing duplicates
    IF array_length(where_conditions, 1) > 0 THEN
      duplicate_query := 'SELECT array_agg(id) FROM ' || quote_ident(p_table_name) ||
                        ' WHERE ' || array_to_string(where_conditions, ' AND ');

      EXECUTE duplicate_query INTO existing_ids;

      IF existing_ids IS NOT NULL AND array_length(existing_ids, 1) > 0 THEN
        delete_query := 'DELETE FROM ' || quote_ident(p_table_name) ||
                       ' WHERE id = ANY($1)';
        EXECUTE delete_query USING existing_ids;

        duplicates_removed := duplicates_removed + array_length(existing_ids, 1);
      END IF;
    END IF;

    -- Prepare values for this record
    record_values := ARRAY[]::text[];
    FOREACH field_name IN ARRAY insert_columns LOOP
      IF record_item ? field_name AND record_item->>field_name IS NOT NULL AND record_item->>field_name != '' THEN
        record_values := record_values || quote_literal(record_item->>field_name);
      ELSE
        record_values := record_values || 'NULL';
      END IF;
    END LOOP;

    insert_values := insert_values || ('(' || array_to_string(record_values, ', ') || ')');
  END LOOP;

  -- Bulk insert all records
  IF array_length(insert_values, 1) > 0 THEN
    insert_query := 'INSERT INTO ' || quote_ident(p_table_name) ||
                   ' (' || array_to_string(insert_columns, ', ') || ') VALUES ' ||
                   array_to_string(insert_values, ', ');

    BEGIN
      EXECUTE insert_query;
      records_inserted := jsonb_array_length(p_records);
    EXCEPTION
      WHEN OTHERS THEN
        errors := errors || ('Bulk insert failed: ' || SQLERRM);
        records_inserted := 0;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', array_length(errors, 1) = 0 OR errors IS NULL,
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