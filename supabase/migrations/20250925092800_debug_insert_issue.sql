-- Debug function to understand the exact issue
-- Let's create a minimal test function to see what's failing

CREATE OR REPLACE FUNCTION debug_insert_test(
  p_records jsonb
) RETURNS jsonb AS $$
DECLARE
  test_result text;
  record_count integer;
BEGIN
  -- First, let's see what's in the records
  record_count := jsonb_array_length(p_records);

  -- Try a simple SELECT to see if jsonb_to_recordset works
  BEGIN
    SELECT COUNT(*) INTO test_result
    FROM jsonb_to_recordset(p_records) AS x(
      advisor_code text,
      advisor_name text,
      process_date text,
      insured_name text,
      policy_number text,
      submitted_apps text
    );

    RETURN jsonb_build_object(
      'success', true,
      'records_parsed', record_count,
      'records_selected', test_result,
      'message', 'jsonb_to_recordset works fine'
    );

  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'jsonb_to_recordset failed: ' || SQLERRM,
        'records_input', record_count
      );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;