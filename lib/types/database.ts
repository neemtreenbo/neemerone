// TypeScript types for the RLS-enabled database schema
// Generated for the Neem Tree advisor performance monitoring portal

// =============================================================================
// ENUMS
// =============================================================================

export type AppRole = 'admin' | 'manager' | 'staff' | 'advisor' | 'candidate';

// =============================================================================
// TABLE TYPES
// =============================================================================

export interface Profile {
  user_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  app_role: AppRole;
  photo_url?: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ManpowerRecord {
  code_number: string; // Primary key
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
  manager_id?: string; // References another code_number (recursive)
  profile_user_id?: string; // Links to auth.users
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  unit_code?: string;
  unit_name?: string;
  head_manpower_code?: string; // References manpower.code_number
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  staff_name?: string;
  email?: string;
  profile_user_id?: string; // Links to auth.users
  created_at: string;
  updated_at: string;
}

export interface StaffAdvisorAssignment {
  id: string;
  staff_id?: string; // References staff.id
  advisor_code_number?: string; // References manpower.code_number
  assigned_at: string;
  created_by?: string; // Admin who made the assignment
  active: boolean;
  notes?: string;
}

// =============================================================================
// COMMISSION AND SALES TRACKING TABLES
// =============================================================================

export interface FYCommissionDetails {
  id: string; // UUID
  code?: string; // References manpower.code_number
  process_date?: string; // ISO date string
  insured_name?: string;
  policy_number?: string;
  transaction_type?: string;
  fy_premium_php?: number; // First Year Premium in PHP
  due_date?: string; // ISO date string
  rate?: number; // Commission rate (0-1)
  fy_commission_php?: number; // First Year Commission in PHP
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface RNCommissionDetails {
  id: string; // UUID
  code?: string; // References manpower.code_number
  process_date?: string; // ISO date string
  insured_name?: string;
  policy_number?: string;
  transaction_type?: string;
  rn_premium_php?: number; // Renewal Premium in PHP
  due_date?: string; // ISO date string
  rate?: number; // Commission rate (0-1)
  year?: number; // Commission year
  rn_commission_php?: number; // Renewal Commission in PHP
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface SubmittedAppsDetails {
  id: string; // UUID
  advisor_code?: string; // References manpower.code_number
  advisor_name?: string;
  process_date?: string; // ISO date string
  insured_name?: string;
  policy_number?: string;
  submitted_apps?: number; // Number of submitted applications
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface SettledAppsDetails {
  id: string; // UUID
  advisor_code?: string; // References manpower.code_number
  advisor_name?: string;
  process_date?: string; // ISO date string
  insured_name?: string;
  policy_number?: string;
  settled_apps?: number; // Number of settled applications
  agency_credits?: number; // Credits earned by the agency
  net_sales_credits?: number; // Net sales credits after deductions
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// =============================================================================
// HIERARCHY TYPES
// =============================================================================

export interface SubordinateInfo {
  subordinate_code: string;
  level_depth: number;
}

export interface ManagerInfo {
  manager_code: string;
  level_depth: number;
}

export interface StaffAssignment {
  advisor_code: string;
}

export interface TeamMember {
  member_code: string;
  member_name?: string;
}

// =============================================================================
// ADMIN FUNCTION RESPONSE TYPES
// =============================================================================

export interface AdminResponse {
  success: boolean;
  message: string;
  [key: string]: unknown;
}

export interface UserLinkResponse extends AdminResponse {
  user_id: string;
  code_number?: string;
  staff_id?: string;
  linked_at: string;
}

export interface AssignmentResponse extends AdminResponse {
  assignment_id: string;
  staff_id: string;
  staff_name?: string;
  advisor_code: string;
  advisor_name?: string;
  assigned_at: string;
  notes?: string;
}

export interface BulkAssignmentResponse extends AdminResponse {
  assignment_ids: string[];
  success_count: number;
  error_count: number;
  errors: string[];
}

export interface UserDetailsResponse {
  user_id: string;
  profile: Profile;
  manpower?: ManpowerRecord;
  staff?: Staff;
  assignments: StaffAdvisorAssignment[];
}

// =============================================================================
// QUERY HELPERS
// =============================================================================

export interface HierarchyQuery {
  user_id: string;
  role: AppRole;
  manpower_code?: string;
  staff_id?: string;
}

export interface PermissionCheck {
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  reason?: string;
}

// =============================================================================
// SUPABASE DATABASE TYPE (for supabase-js)
// =============================================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Profile>;
      };
      manpower: {
        Row: ManpowerRecord;
        Insert: Omit<ManpowerRecord, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<ManpowerRecord>;
      };
      teams: {
        Row: Team;
        Insert: Omit<Team, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Team>;
      };
      staff: {
        Row: Staff;
        Insert: Omit<Staff, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Staff>;
      };
      staff_advisor_assignments: {
        Row: StaffAdvisorAssignment;
        Insert: Omit<StaffAdvisorAssignment, 'id' | 'assigned_at'> & {
          id?: string;
          assigned_at?: string;
        };
        Update: Partial<StaffAdvisorAssignment>;
      };
    };
    Functions: {
      // Utility functions
      get_user_app_role: {
        Args: { user_uuid: string };
        Returns: AppRole;
      };
      get_user_manpower_code: {
        Args: { user_uuid: string };
        Returns: string | null;
      };
      get_user_staff_id: {
        Args: { user_uuid: string };
        Returns: string | null;
      };
      is_user_active: {
        Args: { user_uuid: string };
        Returns: boolean;
      };

      // Hierarchy functions
      get_all_subordinates: {
        Args: { manager_code: string };
        Returns: SubordinateInfo[];
      };
      get_all_managers: {
        Args: { advisor_code: string };
        Returns: ManagerInfo[];
      };
      get_staff_assigned_advisors: {
        Args: { staff_uuid: string };
        Returns: StaffAssignment[];
      };
      get_advisor_assigned_staff: {
        Args: { advisor_code: string };
        Returns: { staff_id: string; staff_name?: string }[];
      };
      is_subordinate_of: {
        Args: { subordinate_code: string; manager_code: string };
        Returns: boolean;
      };
      get_team_members: {
        Args: { head_manager_code: string };
        Returns: TeamMember[];
      };

      // Permission functions
      can_read_manpower: {
        Args: { target_code: string; current_user_id: string };
        Returns: boolean;
      };
      can_write_manpower: {
        Args: { target_code: string; current_user_id: string };
        Returns: boolean;
      };
      can_read_team: {
        Args: { target_team_id: string; current_user_id: string };
        Returns: boolean;
      };
      can_read_staff_assignment: {
        Args: { target_staff_id: string; target_advisor_code: string; current_user_id: string };
        Returns: boolean;
      };
      can_access_user_owned_row: {
        Args: { owner_user_id: string; current_user_id: string; operation: string };
        Returns: boolean;
      };

      // Admin functions
      admin_link_user_to_manpower: {
        Args: { target_user_id: string; target_code_number: string };
        Returns: AdminResponse;
      };
      admin_unlink_user_from_manpower: {
        Args: { target_code_number: string };
        Returns: AdminResponse;
      };
      admin_link_user_to_staff: {
        Args: { target_user_id: string; target_staff_id: string };
        Returns: AdminResponse;
      };
      admin_assign_staff_to_advisor: {
        Args: { target_staff_id: string; target_advisor_code: string; assignment_notes?: string };
        Returns: AssignmentResponse;
      };
      admin_remove_staff_assignment: {
        Args: { assignment_id: string };
        Returns: AdminResponse;
      };
      admin_bulk_assign_staff: {
        Args: { target_staff_id: string; advisor_codes: string[]; assignment_notes?: string };
        Returns: BulkAssignmentResponse;
      };
      admin_get_user_details: {
        Args: { target_user_id: string };
        Returns: UserDetailsResponse;
      };
    };
  };
}

// =============================================================================
// UTILITY TYPES FOR COMPONENTS
// =============================================================================

export type TableName = keyof Database['public']['Tables'];

export type Row<T extends TableName> = Database['public']['Tables'][T]['Row'];
export type Insert<T extends TableName> = Database['public']['Tables'][T]['Insert'];
export type Update<T extends TableName> = Database['public']['Tables'][T]['Update'];

// Helper type for forms
export type FormData<T extends TableName> = Partial<Insert<T>>;

// Helper type for filtering
export type FilterableFields<T extends TableName> = Partial<Row<T>>;

// =============================================================================
// CONSTANTS
// =============================================================================

export const APP_ROLES: AppRole[] = ['admin', 'manager', 'staff', 'advisor', 'candidate'];

export const ROLE_PERMISSIONS = {
  admin: {
    can_read_all: true,
    can_write_all: true,
    can_delete_all: true,
    can_manage_users: true,
    can_assign_staff: true,
  },
  manager: {
    can_read_all: false,
    can_write_all: false,
    can_delete_all: false,
    can_manage_users: false,
    can_assign_staff: false,
    can_read_subordinates: true,
    can_write_own: true,
  },
  staff: {
    can_read_all: false,
    can_write_all: false,
    can_delete_all: false,
    can_manage_users: false,
    can_assign_staff: false,
    can_read_assigned: true,
    can_write_own: true,
  },
  advisor: {
    can_read_all: false,
    can_write_all: false,
    can_delete_all: false,
    can_manage_users: false,
    can_assign_staff: false,
    can_read_own: true,
    can_write_own: true,
  },
  candidate: {
    can_read_all: false,
    can_write_all: false,
    can_delete_all: false,
    can_manage_users: false,
    can_assign_staff: false,
    can_read_own: true,
    can_write_own: true,
  },
} as const;