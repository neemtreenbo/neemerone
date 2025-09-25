-- Create table-specific upload functions with exact duplicate detection
-- Each function handles its own table schema and duplicate detection rules

-- ============================================================================
-- 1. Submitted Apps Upload with Deduplication
-- ============================================================================
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
      -- Insert or update with duplicate detection based on all fields
      INSERT INTO submitted_apps_details (
        advisor_code, advisor_name, process_date, insured_name, policy_number, submitted_apps
      ) VALUES (
        record_item->>'advisor_code',
        record_item->>'advisor_name',
        (record_item->>'process_date')::date,
        record_item->>'insured_name',
        record_item->>'policy_number',
        (record_item->>'submitted_apps')::numeric
      )
      ON CONFLICT ON CONSTRAINT submitted_apps_unique_constraint
      DO UPDATE SET
        created_at = GREATEST(submitted_apps_details.created_at, EXCLUDED.created_at)
      WHERE
        submitted_apps_details.advisor_code = EXCLUDED.advisor_code AND
        submitted_apps_details.advisor_name = EXCLUDED.advisor_name AND
        submitted_apps_details.process_date = EXCLUDED.process_date AND
        COALESCE(submitted_apps_details.insured_name, '') = COALESCE(EXCLUDED.insured_name, '') AND
        COALESCE(submitted_apps_details.policy_number, '') = COALESCE(EXCLUDED.policy_number, '') AND
        COALESCE(submitted_apps_details.submitted_apps, 0) = COALESCE(EXCLUDED.submitted_apps, 0);

      -- Since we don't have unique constraints, we'll handle duplicates manually
      -- First check if record exists with exact same values
      IF EXISTS (
        SELECT 1 FROM submitted_apps_details
        WHERE advisor_code = record_item->>'advisor_code'
        AND COALESCE(advisor_name, '') = COALESCE(record_item->>'advisor_name', '')
        AND process_date = (record_item->>'process_date')::date
        AND COALESCE(insured_name, '') = COALESCE(record_item->>'insured_name', '')
        AND COALESCE(policy_number, '') = COALESCE(record_item->>'policy_number', '')
        AND COALESCE(submitted_apps, 0) = COALESCE((record_item->>'submitted_apps')::numeric, 0)
      ) THEN
        -- Update existing record if this one is newer (we'll use current timestamp as "newer")
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

-- ============================================================================
-- 2. Settled Apps Upload with Deduplication
-- ============================================================================
CREATE OR REPLACE FUNCTION upload_settled_apps_with_dedup(
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
        SELECT 1 FROM settled_apps_details
        WHERE advisor_code = record_item->>'advisor_code'
        AND COALESCE(advisor_name, '') = COALESCE(record_item->>'advisor_name', '')
        AND process_date = (record_item->>'process_date')::date
        AND COALESCE(insured_name, '') = COALESCE(record_item->>'insured_name', '')
        AND COALESCE(policy_number, '') = COALESCE(record_item->>'policy_number', '')
        AND COALESCE(settled_apps, 0) = COALESCE((record_item->>'settled_apps')::numeric, 0)
        AND COALESCE(agency_credits, 0) = COALESCE((record_item->>'agency_credits')::numeric, 0)
        AND COALESCE(net_sales_credits, 0) = COALESCE((record_item->>'net_sales_credits')::numeric, 0)
      ) THEN
        -- Update existing record (refresh created_at to mark as latest)
        UPDATE settled_apps_details
        SET created_at = NOW()
        WHERE advisor_code = record_item->>'advisor_code'
        AND COALESCE(advisor_name, '') = COALESCE(record_item->>'advisor_name', '')
        AND process_date = (record_item->>'process_date')::date
        AND COALESCE(insured_name, '') = COALESCE(record_item->>'insured_name', '')
        AND COALESCE(policy_number, '') = COALESCE(record_item->>'policy_number', '')
        AND COALESCE(settled_apps, 0) = COALESCE((record_item->>'settled_apps')::numeric, 0)
        AND COALESCE(agency_credits, 0) = COALESCE((record_item->>'agency_credits')::numeric, 0)
        AND COALESCE(net_sales_credits, 0) = COALESCE((record_item->>'net_sales_credits')::numeric, 0);

        records_updated := records_updated + 1;
      ELSE
        -- Insert new record
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

-- ============================================================================
-- 3. FY Commission Upload with Deduplication
-- ============================================================================
CREATE OR REPLACE FUNCTION upload_fy_commission_with_dedup(
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
        SELECT 1 FROM fy_commission_details
        WHERE code = record_item->>'code'
        AND process_date = (record_item->>'process_date')::date
        AND COALESCE(insured_name, '') = COALESCE(record_item->>'insured_name', '')
        AND COALESCE(policy_number, '') = COALESCE(record_item->>'policy_number', '')
        AND COALESCE(transaction_type, '') = COALESCE(record_item->>'transaction_type', '')
        AND COALESCE(fy_premium_php, 0) = COALESCE((record_item->>'fy_premium_php')::numeric, 0)
        AND COALESCE(due_date::date, '1900-01-01'::date) = COALESCE((record_item->>'due_date')::date, '1900-01-01'::date)
        AND COALESCE(rate, 0) = COALESCE((record_item->>'rate')::numeric, 0)
        AND COALESCE(fy_commission_php, 0) = COALESCE((record_item->>'fy_commission_php')::numeric, 0)
      ) THEN
        -- Update existing record (refresh created_at to mark as latest)
        UPDATE fy_commission_details
        SET created_at = NOW()
        WHERE code = record_item->>'code'
        AND process_date = (record_item->>'process_date')::date
        AND COALESCE(insured_name, '') = COALESCE(record_item->>'insured_name', '')
        AND COALESCE(policy_number, '') = COALESCE(record_item->>'policy_number', '')
        AND COALESCE(transaction_type, '') = COALESCE(record_item->>'transaction_type', '')
        AND COALESCE(fy_premium_php, 0) = COALESCE((record_item->>'fy_premium_php')::numeric, 0)
        AND COALESCE(due_date::date, '1900-01-01'::date) = COALESCE((record_item->>'due_date')::date, '1900-01-01'::date)
        AND COALESCE(rate, 0) = COALESCE((record_item->>'rate')::numeric, 0)
        AND COALESCE(fy_commission_php, 0) = COALESCE((record_item->>'fy_commission_php')::numeric, 0);

        records_updated := records_updated + 1;
      ELSE
        -- Insert new record
        INSERT INTO fy_commission_details (
          code, process_date, insured_name, policy_number, transaction_type,
          fy_premium_php, due_date, rate, fy_commission_php
        ) VALUES (
          record_item->>'code',
          (record_item->>'process_date')::date,
          record_item->>'insured_name',
          record_item->>'policy_number',
          record_item->>'transaction_type',
          (record_item->>'fy_premium_php')::numeric,
          (record_item->>'due_date')::date,
          (record_item->>'rate')::numeric,
          (record_item->>'fy_commission_php')::numeric
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

-- ============================================================================
-- 4. RN Commission Upload with Deduplication
-- ============================================================================
CREATE OR REPLACE FUNCTION upload_rn_commission_with_dedup(
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
        SELECT 1 FROM rn_commission_details
        WHERE code = record_item->>'code'
        AND process_date = (record_item->>'process_date')::date
        AND COALESCE(insured_name, '') = COALESCE(record_item->>'insured_name', '')
        AND COALESCE(policy_number, '') = COALESCE(record_item->>'policy_number', '')
        AND COALESCE(transaction_type, '') = COALESCE(record_item->>'transaction_type', '')
        AND COALESCE(rn_premium_php, 0) = COALESCE((record_item->>'rn_premium_php')::numeric, 0)
        AND COALESCE(due_date::date, '1900-01-01'::date) = COALESCE((record_item->>'due_date')::date, '1900-01-01'::date)
        AND COALESCE(rate, 0) = COALESCE((record_item->>'rate')::numeric, 0)
        AND COALESCE(year, 0) = COALESCE((record_item->>'year')::integer, 0)
        AND COALESCE(rn_commission_php, 0) = COALESCE((record_item->>'rn_commission_php')::numeric, 0)
      ) THEN
        -- Update existing record (refresh created_at to mark as latest)
        UPDATE rn_commission_details
        SET created_at = NOW()
        WHERE code = record_item->>'code'
        AND process_date = (record_item->>'process_date')::date
        AND COALESCE(insured_name, '') = COALESCE(record_item->>'insured_name', '')
        AND COALESCE(policy_number, '') = COALESCE(record_item->>'policy_number', '')
        AND COALESCE(transaction_type, '') = COALESCE(record_item->>'transaction_type', '')
        AND COALESCE(rn_premium_php, 0) = COALESCE((record_item->>'rn_premium_php')::numeric, 0)
        AND COALESCE(due_date::date, '1900-01-01'::date) = COALESCE((record_item->>'due_date')::date, '1900-01-01'::date)
        AND COALESCE(rate, 0) = COALESCE((record_item->>'rate')::numeric, 0)
        AND COALESCE(year, 0) = COALESCE((record_item->>'year')::integer, 0)
        AND COALESCE(rn_commission_php, 0) = COALESCE((record_item->>'rn_commission_php')::numeric, 0);

        records_updated := records_updated + 1;
      ELSE
        -- Insert new record
        INSERT INTO rn_commission_details (
          code, process_date, insured_name, policy_number, transaction_type,
          rn_premium_php, due_date, rate, year, rn_commission_php
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