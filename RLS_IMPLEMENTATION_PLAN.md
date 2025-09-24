# "One RLS To Rule Them All" Implementation Plan

## Project Overview
Implementation of a unified Row Level Security (RLS) system for the Neem Tree advisor performance monitoring portal with hierarchical permissions based on manpower structure, teams, and staff assignments.

## Architecture Overview

### Core Tables Structure
- **Manpower**: Advisor/manager hierarchy with recursive `manager_id` relationships
- **Teams**: Organizational units with manager heads
- **Staff**: Support personnel with flexible advisor assignments
- **Profiles**: Auth users linked to manpower/staff records

### Key Design Principles
1. **Manpower uses `code_number` as primary key** for business logic
2. **Recursive hierarchy** via `manager_id` referencing other `code_number` values
3. **Flexible staff assignments** across multiple advisors and teams
4. **Admin-controlled linking** of auth users to business records
5. **No initial constraints** for maximum flexibility during development

---

## Phase 1: Database Foundation

### 1.1 Core Table Creation

#### Manpower Table (Central Hierarchy)
```sql
create table public.manpower (
  code_number text not null primary key,
  advisor_name text null,
  nickname text null,
  advisor_email text null,
  personal_email text null,
  mobile text null,
  birthday date null,
  date_hired date null,
  date_cancelled date null,
  status text null,
  class text null,
  unit_code text null,
  team_id uuid null,
  manager_id text null,  -- References manpower.code_number (RECURSIVE)
  profile_user_id uuid null,  -- Links to auth.users when admin assigns
  photo_url text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);
```

#### Teams Table
```sql
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  unit_code text null,
  unit_name text null,
  head_manpower_code text null,  -- References manpower.code_number
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);
```

#### Staff Table
```sql
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  staff_name text null,
  email text null,
  profile_user_id uuid null,  -- Links to auth.users when admin assigns
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);
```

#### Staff-Advisor Assignments (Many-to-Many)
```sql
create table public.staff_advisor_assignments (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid null,  -- References staff.id
  advisor_code_number text null,  -- References manpower.code_number
  assigned_at timestamp with time zone default now(),
  created_by uuid null,  -- Admin who made the assignment
  active boolean default true
);
```

### 1.2 Essential Indexes
```sql
-- Performance indexes for hierarchy and lookups
CREATE INDEX idx_manpower_manager_id ON manpower(manager_id);
CREATE INDEX idx_manpower_profile_user_id ON manpower(profile_user_id);
CREATE INDEX idx_staff_profile_user_id ON staff(profile_user_id);
CREATE INDEX idx_staff_assignments_staff_id ON staff_advisor_assignments(staff_id);
CREATE INDEX idx_staff_assignments_advisor_code ON staff_advisor_assignments(advisor_code_number);
CREATE INDEX idx_teams_head_manpower_code ON teams(head_manpower_code);
```

### 1.3 Update Triggers
```sql
-- Updated_at triggers for all tables
CREATE TRIGGER tr_manpower_updated_at BEFORE UPDATE ON manpower
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER tr_teams_updated_at BEFORE UPDATE ON teams
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER tr_staff_updated_at BEFORE UPDATE ON staff
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
```

### 1.4 App Role Management
```sql
-- Update profiles to use proper enum
CREATE TYPE app_role_type AS ENUM ('admin', 'manager', 'staff', 'advisor', 'candidate');

-- Update profiles table (modify existing)
ALTER TABLE profiles
ALTER COLUMN app_role TYPE app_role_type USING app_role::app_role_type;
```

---

## Phase 2: RLS Helper Functions

### 2.1 Core Utility Functions

#### Get User's App Role
```sql
CREATE OR REPLACE FUNCTION get_user_app_role(user_uuid uuid)
RETURNS app_role_type AS $$
BEGIN
  RETURN (
    SELECT app_role
    FROM profiles
    WHERE user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Get User's Manpower Code
```sql
CREATE OR REPLACE FUNCTION get_user_manpower_code(user_uuid uuid)
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT code_number
    FROM manpower
    WHERE profile_user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Get User's Staff ID
```sql
CREATE OR REPLACE FUNCTION get_user_staff_id(user_uuid uuid)
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT id
    FROM staff
    WHERE profile_user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2.2 Hierarchy Functions

#### Get All Subordinates (Recursive)
```sql
CREATE OR REPLACE FUNCTION get_all_subordinates(manager_code text)
RETURNS TABLE(subordinate_code text, level_depth integer) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE subordinates AS (
    -- Base case: direct reports
    SELECT
      code_number as subordinate_code,
      1 as level_depth
    FROM manpower
    WHERE manager_id = manager_code

    UNION ALL

    -- Recursive case: reports of reports
    SELECT
      m.code_number as subordinate_code,
      s.level_depth + 1
    FROM manpower m
    JOIN subordinates s ON m.manager_id = s.subordinate_code
    WHERE s.level_depth < 10  -- Prevent infinite recursion
  )
  SELECT * FROM subordinates;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Get Staff Assigned Advisors
```sql
CREATE OR REPLACE FUNCTION get_staff_assigned_advisors(staff_uuid uuid)
RETURNS TABLE(advisor_code text) AS $$
BEGIN
  RETURN QUERY
  SELECT saa.advisor_code_number
  FROM staff_advisor_assignments saa
  JOIN staff s ON saa.staff_id = s.id
  WHERE s.profile_user_id = staff_uuid
    AND saa.active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2.3 Permission Check Functions

#### Can Read Manpower Record
```sql
CREATE OR REPLACE FUNCTION can_read_manpower(target_code text, current_user_id uuid)
RETURNS boolean AS $$
DECLARE
  user_role app_role_type;
  user_manpower_code text;
  user_staff_id uuid;
BEGIN
  user_role := get_user_app_role(current_user_id);

  -- Admin can read everything
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Manager can read own + subordinates
  IF user_role = 'manager' THEN
    user_manpower_code := get_user_manpower_code(current_user_id);
    IF user_manpower_code = target_code THEN
      RETURN true;
    END IF;

    -- Check if target is subordinate
    RETURN EXISTS(
      SELECT 1 FROM get_all_subordinates(user_manpower_code)
      WHERE subordinate_code = target_code
    );
  END IF;

  -- Staff can read assigned advisors
  IF user_role = 'staff' THEN
    RETURN EXISTS(
      SELECT 1 FROM get_staff_assigned_advisors(current_user_id)
      WHERE advisor_code = target_code
    );
  END IF;

  -- Advisor/Candidate can read own record
  IF user_role IN ('advisor', 'candidate') THEN
    user_manpower_code := get_user_manpower_code(current_user_id);
    RETURN user_manpower_code = target_code;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Phase 3: RLS Policy Implementation

### 3.1 Manpower Table RLS

```sql
-- Enable RLS
ALTER TABLE manpower ENABLE ROW LEVEL SECURITY;

-- READ policy
CREATE POLICY manpower_read_policy ON manpower
FOR SELECT USING (
  can_read_manpower(code_number, auth.uid())
);

-- CREATE policy (admin creates any, others create own)
CREATE POLICY manpower_create_policy ON manpower
FOR INSERT WITH CHECK (
  get_user_app_role(auth.uid()) = 'admin' OR
  profile_user_id = auth.uid()
);

-- UPDATE policy (admin updates any, others update own)
CREATE POLICY manpower_update_policy ON manpower
FOR UPDATE USING (
  get_user_app_role(auth.uid()) = 'admin' OR
  profile_user_id = auth.uid()
);

-- DELETE policy (admin only)
CREATE POLICY manpower_delete_policy ON manpower
FOR DELETE USING (
  get_user_app_role(auth.uid()) = 'admin'
);
```

### 3.2 Teams Table RLS

```sql
-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- READ policy (based on team head access)
CREATE POLICY teams_read_policy ON teams
FOR SELECT USING (
  get_user_app_role(auth.uid()) = 'admin' OR
  can_read_manpower(head_manpower_code, auth.uid())
);

-- WRITE policies (admin only for now)
CREATE POLICY teams_write_policy ON teams
FOR ALL USING (
  get_user_app_role(auth.uid()) = 'admin'
);
```

### 3.3 Staff Table RLS

```sql
-- Enable RLS
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- READ policy
CREATE POLICY staff_read_policy ON staff
FOR SELECT USING (
  get_user_app_role(auth.uid()) = 'admin' OR
  profile_user_id = auth.uid()
);

-- WRITE policies (admin creates/updates, staff updates own)
CREATE POLICY staff_write_policy ON staff
FOR ALL USING (
  get_user_app_role(auth.uid()) = 'admin' OR
  profile_user_id = auth.uid()
);
```

### 3.4 Staff Assignments RLS

```sql
-- Enable RLS
ALTER TABLE staff_advisor_assignments ENABLE ROW LEVEL SECURITY;

-- READ policy (admin, assigned staff, or assigned advisor)
CREATE POLICY assignments_read_policy ON staff_advisor_assignments
FOR SELECT USING (
  get_user_app_role(auth.uid()) = 'admin' OR
  staff_id = get_user_staff_id(auth.uid()) OR
  advisor_code_number = get_user_manpower_code(auth.uid())
);

-- WRITE policy (admin only)
CREATE POLICY assignments_write_policy ON staff_advisor_assignments
FOR ALL USING (
  get_user_app_role(auth.uid()) = 'admin'
);
```

---

## Phase 4: User-Owned Tables Pattern

### 4.1 Standard Owner Pattern for Future Tables

For any user-owned table (leads, activities, notes, etc.):

```sql
-- Example: leads table
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,  -- Standard owner pattern
  -- ... other fields
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Universal RLS patterns
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- READ: admin/manager see all, staff see assigned advisors' data, advisor sees own
CREATE POLICY leads_read_policy ON leads
FOR SELECT USING (
  get_user_app_role(auth.uid()) = 'admin' OR
  (get_user_app_role(auth.uid()) = 'manager' AND
   can_read_manpower(get_user_manpower_code(owner_user_id), auth.uid())) OR
  (get_user_app_role(auth.uid()) = 'staff' AND
   get_user_manpower_code(owner_user_id) IN (
     SELECT advisor_code FROM get_staff_assigned_advisors(auth.uid())
   )) OR
  owner_user_id = auth.uid()
);

-- CREATE: admin creates any, others create own
CREATE POLICY leads_create_policy ON leads
FOR INSERT WITH CHECK (
  get_user_app_role(auth.uid()) = 'admin' OR
  owner_user_id = auth.uid()
);

-- UPDATE/DELETE: admin updates any, others update own
CREATE POLICY leads_update_policy ON leads
FOR UPDATE USING (
  get_user_app_role(auth.uid()) = 'admin' OR
  owner_user_id = auth.uid()
);

CREATE POLICY leads_delete_policy ON leads
FOR DELETE USING (
  get_user_app_role(auth.uid()) = 'admin' OR
  owner_user_id = auth.uid()
);
```

---

## Phase 5: Integration & Administration

### 5.1 Admin Functions

#### Link User to Manpower
```sql
CREATE OR REPLACE FUNCTION admin_link_user_to_manpower(
  target_user_id uuid,
  target_code_number text
)
RETURNS boolean AS $$
BEGIN
  -- Only admin can link users
  IF get_user_app_role(auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Only admin can link users to manpower records';
  END IF;

  UPDATE manpower
  SET profile_user_id = target_user_id
  WHERE code_number = target_code_number;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Assign Staff to Advisor
```sql
CREATE OR REPLACE FUNCTION admin_assign_staff_to_advisor(
  target_staff_id uuid,
  target_advisor_code text
)
RETURNS uuid AS $$
DECLARE
  assignment_id uuid;
BEGIN
  -- Only admin can make assignments
  IF get_user_app_role(auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Only admin can assign staff to advisors';
  END IF;

  INSERT INTO staff_advisor_assignments (staff_id, advisor_code_number, created_by)
  VALUES (target_staff_id, target_advisor_code, auth.uid())
  RETURNING id INTO assignment_id;

  RETURN assignment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5.2 TypeScript Integration

#### Types Definition
```typescript
export type AppRole = 'admin' | 'manager' | 'staff' | 'advisor' | 'candidate';

export interface ManpowerRecord {
  code_number: string;
  advisor_name?: string;
  nickname?: string;
  advisor_email?: string;
  personal_email?: string;
  mobile?: string;
  birthday?: string;
  date_hired?: string;
  date_cancelled?: string;
  status?: string;
  class?: string;
  unit_code?: string;
  team_id?: string;
  manager_id?: string;
  profile_user_id?: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamRecord {
  id: string;
  unit_code?: string;
  unit_name?: string;
  head_manpower_code?: string;
  created_at: string;
  updated_at: string;
}

export interface StaffRecord {
  id: string;
  staff_name?: string;
  email?: string;
  profile_user_id?: string;
  created_at: string;
  updated_at: string;
}
```

---

## Phase 6: Testing & Validation

### 6.1 Permission Test Scenarios

1. **Admin User**
   - Can read/write all manpower records
   - Can read/write all teams
   - Can make staff assignments
   - Can link users to manpower

2. **Manager User**
   - Can read own + subordinate records
   - Cannot read unrelated advisor records
   - Cannot write others' data
   - Can read teams they head

3. **Staff User**
   - Can read assigned advisors only
   - Cannot read unassigned advisors
   - Cannot write advisor data
   - Can update own staff record

4. **Advisor User**
   - Can read own manpower record only
   - Cannot read other advisors
   - Can update own data
   - Can read own team info

### 6.2 Performance Testing

1. **Recursive Query Performance**
   - Test with deep hierarchies (5+ levels)
   - Measure query execution time
   - Validate recursion depth limits

2. **RLS Policy Performance**
   - Test with large datasets
   - Measure policy evaluation overhead
   - Optimize indexes as needed

---

## Implementation Notes

### Development Approach
1. **Start with no constraints** for flexibility
2. **Add constraints incrementally** as business rules solidify
3. **Test each phase thoroughly** before proceeding
4. **Monitor performance** at each step

### Migration Strategy
1. **Backup existing data** before RLS implementation
2. **Apply policies gradually** (start with READ-only)
3. **Test with sample data** before production rollout
4. **Have rollback plan** ready

### Security Considerations
1. **All helper functions use SECURITY DEFINER**
2. **Proper input validation** in admin functions
3. **Audit trail** for administrative actions
4. **Regular review** of permission logic

---

## References
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Recursive Queries](https://www.postgresql.org/docs/current/queries-with.html)
- [Next.js Supabase Integration](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)