'use server';

import { createClient } from '@/lib/supabase/server';
import { ManpowerRecord } from '@/lib/types/database';

export interface ManpowerDataResult {
  data: ManpowerRecord[] | null;
  error: Error | null;
}

/**
 * Fetch manpower data from Supabase
 * RLS policies automatically filter records based on user hierarchy
 */
export async function fetchManpowerData(): Promise<ManpowerDataResult> {
  try {
    const supabase = await createClient();

    const { data: manpowerData, error: dataError } = await supabase
      .from('manpower')
      .select('*')
      .order('advisor_name', { ascending: true });

    if (dataError) {
      console.error('Error fetching manpower data:', dataError);
      return {
        data: null,
        error: new Error(`Database error: ${dataError.message}`)
      };
    }

    return {
      data: (manpowerData || []) as ManpowerRecord[],
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