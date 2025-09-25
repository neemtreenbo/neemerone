'use server';

import { createClient } from '@/lib/supabase/server';
import { ManpowerRecord } from '@/lib/types/database';

export interface ManpowerDataResult {
  data: (ManpowerRecord & { hierarchy_level?: string; team_name?: string })[] | null;
  error: Error | null;
}

/**
 * Fetch manpower data from Supabase with hierarchy levels
 * RLS policies automatically filter records based on user hierarchy
 */
export async function fetchManpowerData(): Promise<ManpowerDataResult> {
  try {
    const supabase = await createClient();

    // Get current user info to determine hierarchy levels
    const { data: user } = await supabase.auth.getClaims();
    const userId = user?.claims?.sub || null;

    let userManpowerCode: string | null = null;

    // Get user's manpower code if they have one
    if (userId) {
      const { data: manpowerLink } = await supabase
        .from('manpower')
        .select('code_number')
        .eq('profile_user_id', userId)
        .single();

      userManpowerCode = manpowerLink?.code_number || null;
    }

    // Fetch manpower data with team names - RLS will filter automatically
    const { data: manpowerData, error: dataError } = await supabase
      .from('manpower')
      .select(`
        *,
        teams(unit_name)
      `)
      .order('advisor_name', { ascending: true });

    if (dataError) {
      console.error('Error fetching manpower data:', dataError);
      return {
        data: null,
        error: new Error(`Database error: ${dataError.message}`)
      };
    }

    // For performance, batch get all subordinates once instead of per record
    let allSubordinates: { subordinate_code: string; level_depth: number }[] = [];
    if (userManpowerCode && manpowerData && manpowerData.length > 0) {
      const { data: subordinatesData } = await supabase
        .rpc('get_all_subordinates', { manager_code: userManpowerCode });
      allSubordinates = subordinatesData || [];
    }

    // Add hierarchy levels and team names to each record efficiently
    const dataWithHierarchy = (manpowerData || []).map((record: ManpowerRecord & { teams?: { unit_name?: string } }) => {
      let hierarchyLevel = '';

      if (userManpowerCode && record.code_number !== userManpowerCode) {
        const subordinate = allSubordinates.find((sub) => sub.subordinate_code === record.code_number);

        if (subordinate) {
          const level = subordinate.level_depth;
          if (level === 1) {
            hierarchyLevel = 'Direct';
          } else if (level === 2) {
            hierarchyLevel = 'Indirect 1';
          } else {
            hierarchyLevel = 'Indirect 2';
          }
        }
      }

      // Extract team name from the joined teams data
      const teamName = record.teams?.unit_name || null;

      // Remove the teams object from the record to keep it clean
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { teams, ...cleanRecord } = record;

      return {
        ...cleanRecord,
        hierarchy_level: hierarchyLevel,
        team_name: teamName
      };
    });

    return {
      data: dataWithHierarchy as (ManpowerRecord & { hierarchy_level?: string; team_name?: string })[],
      error: null
    };
  } catch (error) {
    console.error('Unexpected error fetching manpower data:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error occurred')
    };
  }
}