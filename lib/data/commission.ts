'use server';

import { createClient } from '@/lib/supabase/server';
import { FYCommissionDetails, RNCommissionDetails, SubmittedAppsDetails, SettledAppsDetails } from '@/lib/types/database';

export interface CommissionDataResult<T> {
  data: T[] | null;
  error: Error | null;
}

/**
 * Fetch First Year Commission data
 * RLS automatically filters based on user's app_role
 */
export async function fetchFYCommissionData(): Promise<CommissionDataResult<FYCommissionDetails>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('fy_commission_details')
      .select('*')
      .order('process_date', { ascending: false });

    if (error) {
      console.error('Error fetching FY commission data:', error);
      return {
        data: null,
        error: new Error(`Database error: ${error.message}`)
      };
    }

    return {
      data: data || [],
      error: null
    };
  } catch (error) {
    console.error('Unexpected error fetching FY commission data:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error occurred')
    };
  }
}

/**
 * Fetch Renewal Commission data
 * RLS automatically filters based on user's app_role
 */
export async function fetchRNCommissionData(): Promise<CommissionDataResult<RNCommissionDetails>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('rn_commission_details')
      .select('*')
      .order('process_date', { ascending: false });

    if (error) {
      console.error('Error fetching RN commission data:', error);
      return {
        data: null,
        error: new Error(`Database error: ${error.message}`)
      };
    }

    return {
      data: data || [],
      error: null
    };
  } catch (error) {
    console.error('Unexpected error fetching RN commission data:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error occurred')
    };
  }
}

/**
 * Fetch Submitted Applications data
 * RLS automatically filters based on user's app_role
 */
export async function fetchSubmittedAppsData(): Promise<CommissionDataResult<SubmittedAppsDetails>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('submitted_apps_details')
      .select('*')
      .order('process_date', { ascending: false });

    if (error) {
      console.error('Error fetching submitted apps data:', error);
      return {
        data: null,
        error: new Error(`Database error: ${error.message}`)
      };
    }

    return {
      data: data || [],
      error: null
    };
  } catch (error) {
    console.error('Unexpected error fetching submitted apps data:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error occurred')
    };
  }
}

/**
 * Fetch Settled Applications data
 * RLS automatically filters based on user's app_role
 */
export async function fetchSettledAppsData(): Promise<CommissionDataResult<SettledAppsDetails>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('settled_apps_details')
      .select('*')
      .order('process_date', { ascending: false });

    if (error) {
      console.error('Error fetching settled apps data:', error);
      return {
        data: null,
        error: new Error(`Database error: ${error.message}`)
      };
    }

    return {
      data: data || [],
      error: null
    };
  } catch (error) {
    console.error('Unexpected error fetching settled apps data:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error occurred')
    };
  }
}

/**
 * Fetch comprehensive sales and commission summary by advisor code
 */
export async function fetchCommissionSummary(advisorCode?: string) {
  try {
    const supabase = await createClient();

    // Build query conditions
    let fyQuery = supabase
      .from('fy_commission_details')
      .select('code, fy_commission_php, process_date');

    let rnQuery = supabase
      .from('rn_commission_details')
      .select('code, rn_commission_php, year, process_date');

    let submittedAppsQuery = supabase
      .from('submitted_apps_details')
      .select('advisor_code, submitted_apps, process_date');

    let settledAppsQuery = supabase
      .from('settled_apps_details')
      .select('advisor_code, settled_apps, agency_credits, net_sales_credits, process_date');

    // Apply advisor filter if provided
    if (advisorCode) {
      fyQuery = fyQuery.eq('code', advisorCode);
      rnQuery = rnQuery.eq('code', advisorCode);
      submittedAppsQuery = submittedAppsQuery.eq('advisor_code', advisorCode);
      settledAppsQuery = settledAppsQuery.eq('advisor_code', advisorCode);
    }

    const [fyResult, rnResult, submittedAppsResult, settledAppsResult] = await Promise.all([
      fyQuery,
      rnQuery,
      submittedAppsQuery,
      settledAppsQuery
    ]);

    if (fyResult.error || rnResult.error || submittedAppsResult.error || settledAppsResult.error) {
      const errors = [fyResult.error, rnResult.error, submittedAppsResult.error, settledAppsResult.error]
        .filter(Boolean)
        .map(e => e!.message)
        .join(', ');

      return {
        data: null,
        error: new Error(`Database errors: ${errors}`)
      };
    }

    // Calculate totals
    const fyTotal = fyResult.data?.reduce((sum, item) => sum + (item.fy_commission_php || 0), 0) || 0;
    const rnTotal = rnResult.data?.reduce((sum, item) => sum + (item.rn_commission_php || 0), 0) || 0;
    const totalSubmittedApps = submittedAppsResult.data?.reduce((sum, item) => sum + (item.submitted_apps || 0), 0) || 0;
    const totalSettledApps = settledAppsResult.data?.reduce((sum, item) => sum + (item.settled_apps || 0), 0) || 0;
    const totalAgencyCredits = settledAppsResult.data?.reduce((sum, item) => sum + (item.agency_credits || 0), 0) || 0;
    const totalNetSalesCredits = settledAppsResult.data?.reduce((sum, item) => sum + (item.net_sales_credits || 0), 0) || 0;

    return {
      data: {
        // Commission totals
        fyCommissionTotal: fyTotal,
        rnCommissionTotal: rnTotal,
        totalCommission: fyTotal + rnTotal,

        // Application totals
        totalSubmittedApps: totalSubmittedApps,
        totalSettledApps: totalSettledApps,

        // Credit totals
        totalAgencyCredits: totalAgencyCredits,
        totalNetSalesCredits: totalNetSalesCredits,

        // Record counts
        fyRecords: fyResult.data?.length || 0,
        rnRecords: rnResult.data?.length || 0,
        submittedAppRecords: submittedAppsResult.data?.length || 0,
        settledAppRecords: settledAppsResult.data?.length || 0,

        // Conversion rate
        conversionRate: totalSubmittedApps > 0 ? (totalSettledApps / totalSubmittedApps) * 100 : 0
      },
      error: null
    };
  } catch (error) {
    console.error('Unexpected error fetching commission summary:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error occurred')
    };
  }
}