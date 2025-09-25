-- Add consistency constraints and triggers between manpower and teams tables
-- This migration ensures manpower.unit_code stays in sync with teams.unit_code

-- 1. Add foreign key constraint from manpower.team_id to teams.id
-- Handle existing data gracefully
DO $$
BEGIN
  -- Only add constraint if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_manpower_team_id'
    AND table_name = 'manpower'
  ) THEN
    ALTER TABLE public.manpower
    ADD CONSTRAINT fk_manpower_team_id
    FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON CONSTRAINT fk_manpower_team_id ON public.manpower IS
'Ensures manpower.team_id references valid teams.id. ON DELETE SET NULL preserves manpower records.';

-- 2. Create trigger function for manpower: sync unit_code from teams when team_id changes
CREATE OR REPLACE FUNCTION public.sync_manpower_unit_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if team_id has changed or this is an INSERT with team_id
  IF (TG_OP = 'INSERT' AND NEW.team_id IS NOT NULL) OR
     (TG_OP = 'UPDATE' AND (OLD.team_id IS DISTINCT FROM NEW.team_id) AND NEW.team_id IS NOT NULL) THEN

    -- Fetch unit_code from teams table
    SELECT unit_code INTO NEW.unit_code
    FROM public.teams
    WHERE id = NEW.team_id;

    -- Update the updated_at timestamp (this will be handled by existing trigger)
  END IF;

  -- If team_id is set to NULL, clear unit_code
  IF TG_OP = 'UPDATE' AND NEW.team_id IS NULL AND OLD.team_id IS NOT NULL THEN
    NEW.unit_code = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION public.sync_manpower_unit_code() IS
'Automatically syncs manpower.unit_code from teams.unit_code when team_id changes';

-- 3. Create trigger on manpower for unit_code sync
DROP TRIGGER IF EXISTS tr_sync_manpower_unit_code ON public.manpower;
CREATE TRIGGER tr_sync_manpower_unit_code
  BEFORE INSERT OR UPDATE OF team_id ON public.manpower
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_manpower_unit_code();

-- 4. Create trigger function for teams: cascade unit_code updates to manpower
CREATE OR REPLACE FUNCTION public.sync_teams_unit_code_to_manpower()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if unit_code has actually changed
  IF TG_OP = 'UPDATE' AND OLD.unit_code IS DISTINCT FROM NEW.unit_code THEN

    -- Update all manpower records linked to this team
    UPDATE public.manpower
    SET
      unit_code = NEW.unit_code,
      updated_at = now()  -- Explicitly update timestamp for cascade changes
    WHERE team_id = NEW.id;

    -- Log the number of affected records (optional - can be removed in production)
    RAISE NOTICE 'Updated % manpower records with new unit_code: %',
      ROW_COUNT, COALESCE(NEW.unit_code, 'NULL');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION public.sync_teams_unit_code_to_manpower() IS
'Cascades teams.unit_code changes to all linked manpower records';

-- 5. Create trigger on teams for cascading unit_code updates
DROP TRIGGER IF EXISTS tr_sync_teams_unit_code ON public.teams;
CREATE TRIGGER tr_sync_teams_unit_code
  AFTER UPDATE OF unit_code ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_teams_unit_code_to_manpower();

-- 6. One-time sync of existing data to ensure consistency
-- Update manpower records that have team_id but mismatched unit_code
DO $$
DECLARE
  sync_count INTEGER;
BEGIN
  UPDATE public.manpower m
  SET
    unit_code = t.unit_code,
    updated_at = now()
  FROM public.teams t
  WHERE m.team_id = t.id
    AND (m.unit_code IS DISTINCT FROM t.unit_code);

  GET DIAGNOSTICS sync_count = ROW_COUNT;
  RAISE NOTICE 'One-time sync completed: % manpower records updated', sync_count;
END $$;

-- 7. Create indexes for performance (if they don't exist)
DO $$
BEGIN
  -- Index on manpower.team_id already exists from original migration

  -- Ensure we have index on teams.unit_code for cascade performance
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_teams_unit_code'
    AND tablename = 'teams'
  ) THEN
    CREATE INDEX idx_teams_unit_code ON public.teams USING btree (unit_code);
  END IF;
END $$;