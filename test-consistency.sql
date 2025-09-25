-- Test queries to verify manpower-teams consistency triggers
-- These can be run in Supabase SQL Editor to verify functionality

-- 1. Test: Insert a team and see if manpower syncs unit_code
-- First, insert a test team
INSERT INTO public.teams (unit_code, unit_name, head_manpower_code)
VALUES ('TEST001', 'Test Unit 1', null);

-- Get the team ID for testing
-- (You'll need to replace the UUID in the next queries with the actual generated ID)

-- 2. Test: Insert manpower with team_id - should auto-populate unit_code
INSERT INTO public.manpower (code_number, advisor_name, team_id)
VALUES ('TEST_ADV_001', 'Test Advisor', (SELECT id FROM public.teams WHERE unit_code = 'TEST001'));

-- 3. Verify the unit_code was automatically set
SELECT
  code_number,
  advisor_name,
  unit_code,
  team_id,
  (SELECT unit_code FROM public.teams WHERE id = manpower.team_id) as team_unit_code
FROM public.manpower
WHERE code_number = 'TEST_ADV_001';

-- 4. Test: Update team's unit_code - should cascade to manpower
UPDATE public.teams
SET unit_code = 'TEST002'
WHERE unit_code = 'TEST001';

-- 5. Verify the cascade worked
SELECT
  code_number,
  advisor_name,
  unit_code,
  team_id,
  updated_at
FROM public.manpower
WHERE code_number = 'TEST_ADV_001';

-- 6. Test: Update manpower team_id - should sync new unit_code
INSERT INTO public.teams (unit_code, unit_name)
VALUES ('TEST003', 'Test Unit 3');

UPDATE public.manpower
SET team_id = (SELECT id FROM public.teams WHERE unit_code = 'TEST003')
WHERE code_number = 'TEST_ADV_001';

-- 7. Verify the sync worked
SELECT
  code_number,
  advisor_name,
  unit_code,
  team_id,
  updated_at
FROM public.manpower
WHERE code_number = 'TEST_ADV_001';

-- 8. Test: Set team_id to NULL - should clear unit_code
UPDATE public.manpower
SET team_id = NULL
WHERE code_number = 'TEST_ADV_001';

-- 9. Verify unit_code was cleared
SELECT
  code_number,
  advisor_name,
  unit_code,
  team_id,
  updated_at
FROM public.manpower
WHERE code_number = 'TEST_ADV_001';

-- Clean up test data
-- DELETE FROM public.manpower WHERE code_number = 'TEST_ADV_001';
-- DELETE FROM public.teams WHERE unit_code IN ('TEST002', 'TEST003');