-- Force recreate submitted apps function to clear any caching issues
-- Drop and recreate to ensure the latest version is used

DROP FUNCTION IF EXISTS upload_submitted_apps_with_dedup(jsonb);

CREATE OR REPLACE FUNCTION upload_submitted_apps_with_dedup(
  p_records jsonb
) RETURNS jsonb AS $$
DECLARE
  records_inserted integer := 0;
  records_updated integer := 0;
  errors text[] := ARRAY[]::text[];
  record_item jsonb;
  i integer;
BEGIN
  -- Validate input
  IF p_records IS NULL OR jsonb_array_length(p_records) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'records_inserted', 0,
      'records_updated', 0,
      'errors', ARRAY['No records provided']
    );
  END IF;

  -- Process each record with duplicate detection
  FOR i IN 0..jsonb_array_length(p_records)-1 LOOP
    record_item := p_records->i;

    BEGIN
      -- Check if record exists with exact same values
      IF EXISTS (
        SELECT 1 FROM submitted_apps_details
        WHERE advisor_code = record_item->>'advisor_code'
        AND COALESCE(advisor_name, '') = COALESCE(record_item->>'advisor_name', '')
        AND process_date = (record_item->>'process_date')::date
        AND COALESCE(insured_name, '') = COALESCE(record_item->>'insured_name', '')
        AND COALESCE(policy_number, '') = COALESCE(record_item->>'policy_number', '')
        AND COALESCE(submitted_apps, 0) = COALESCE((record_item->>'submitted_apps')::numeric, 0)
      ) THEN
        -- Update existing record (refresh created_at to mark as latest)
        UPDATE submitted_apps_details
        SET created_at = NOW()
        WHERE advisor_code = record_item->>'advisor_code'
        AND COALESCE(advisor_name, '') = COALESCE(record_item->>'advisor_name', '')
        AND process_date = (record_item->>'process_date')::date
        AND COALESCE(insured_name, '') = COALESCE(record_item->>'insured_name', '')
        AND COALESCE(policy_number, '') = COALESCE(record_item->>'policy_number', '')
        AND COALESCE(submitted_apps, 0) = COALESCE((record_item->>'submitted_apps')::numeric, 0);

        records_updated := records_updated + 1;
      ELSE
        -- Insert new record
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

        records_inserted := records_inserted + 1;
      END IF;

    EXCEPTION
      WHEN OTHERS THEN
        errors := errors || ('Record ' || (i + 1)::text || ' failed: ' || SQLERRM);
        CONTINUE;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', (records_inserted + records_updated) > 0,
    'records_inserted', records_inserted,
    'records_updated', records_updated,
    'errors', COALESCE(errors, ARRAY[]::text[])
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'records_inserted', 0,
      'records_updated', 0,
      'errors', ARRAY['Function error: ' || SQLERRM]
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;