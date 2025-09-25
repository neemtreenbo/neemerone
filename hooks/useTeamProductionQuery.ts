'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TeamProductionTotals } from '@/components/production/team-production-cards';

type PeriodType = 'calendar' | 'systems';
type TimeFrame = 'monthly' | 'annual';

interface UseTeamProductionQueryOptions {
  timeFrame: TimeFrame;
  periodType: PeriodType;
  year: number;
  month?: number; // Required for monthly, ignored for annual
  enabled?: boolean;
}

interface ProductionRecord {
  advisor_code: string;
  advisor_name: string;
  unit_code: string;
  manager_id: string;
  total_submitted_apps: number;
  total_settled_apps: number;
  total_agency_credits: number;
  total_net_sales_credits: number;
  team_name?: string;
}

interface UseTeamProductionQueryResult {
  data: ProductionRecord[] | null;
  aggregatedTotals: TeamProductionTotals | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useTeamProductionQuery(
  options: UseTeamProductionQueryOptions
): UseTeamProductionQueryResult {
  const {
    timeFrame,
    periodType,
    year,
    month,
    enabled = true
  } = options;

  const [data, setData] = useState<ProductionRecord[] | null>(null);
  const [aggregatedTotals, setAggregatedTotals] = useState<TeamProductionTotals | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchProductionData = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      // Determine which table to query
      const tableName = timeFrame === 'monthly'
        ? 'monthly_production_summary'
        : 'annual_production_summary';

      // Build query based on timeframe
      let query = supabase
        .from(tableName)
        .select(`
          advisor_code,
          advisor_name,
          unit_code,
          manager_id,
          total_submitted_apps,
          total_settled_apps,
          total_agency_credits,
          total_net_sales_credits
        `)
        .eq('period_type', periodType)
        .eq('period_year', year);

      // Add month filter for monthly queries
      if (timeFrame === 'monthly' && month) {
        query = query.eq('period_month', month);
      }

      const { data: productionData, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(`Failed to fetch ${timeFrame} production data: ${fetchError.message}`);
      }

      // Get current user's context to determine which records to include
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user's advisor code by finding their manpower record linked to their profile
      const { data: manpowerRecord, error: manpowerError } = await supabase
        .from('manpower')
        .select('code_number')
        .eq('profile_user_id', user.id)
        .single();

      if (manpowerError) {
        // If no manpower record is linked to this user, provide a helpful message
        if (manpowerError.code === 'PGRST116') {
          throw new Error('Your user account is not linked to any advisor record. Please contact your administrator to link your account.');
        }
        throw new Error('Failed to get user manpower record: ' + manpowerError.message);
      }

      // Get manpower hierarchy to determine reporting relationships
      const { data: manpowerData, error: hierarchyError } = await supabase
        .from('manpower')
        .select(`
          code_number,
          advisor_name,
          manager_id,
          status
        `)
        .eq('status', 'active');

      if (hierarchyError) {
        throw new Error('Failed to get manpower data');
      }

      // Build team hierarchy for current user
      const userAdvisorCode = manpowerRecord?.code_number;
      if (!userAdvisorCode) {
        throw new Error('User advisor code not found');
      }

      // Define interface for manpower data
      interface ManpowerRecord {
        code_number: string;
        advisor_name: string;
        manager_id: string;
        status: string;
      }

      // Find all advisors who report to the current user (direct and indirect)
      const findSubordinates = (managerCode: string, allManpower: ManpowerRecord[]): string[] => {
        const directReports = allManpower
          .filter((emp: ManpowerRecord) => emp.manager_id === managerCode)
          .map((emp: ManpowerRecord) => emp.code_number);

        const indirectReports = directReports.flatMap((reportCode: string) =>
          findSubordinates(reportCode, allManpower)
        );

        return [...directReports, ...indirectReports];
      };

      const teamMemberCodes = [
        userAdvisorCode, // Include the manager themselves
        ...findSubordinates(userAdvisorCode, manpowerData as ManpowerRecord[] || [])
      ];

      // Filter production data to include only team members
      const filteredData = (productionData || []).filter((record: ProductionRecord) =>
        teamMemberCodes.includes(record.advisor_code)
      );

      // Fetch team names from teams table to enrich the data
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('unit_code, unit_name');

      if (teamsError) {
        console.warn('Could not fetch teams data:', teamsError.message);
      }

      // Enrich filtered data with team names
      const enrichedData = filteredData.map((record: ProductionRecord) => {
        const teamRecord = teamsData?.find(team => team.unit_code === record.unit_code);
        return {
          ...record,
          team_name: teamRecord?.unit_name || record.unit_code || 'Unassigned Team'
        };
      });

      // Calculate aggregated totals
      const totals: TeamProductionTotals = enrichedData.reduce(
        (acc: TeamProductionTotals, record: ProductionRecord) => {
          return {
            totalSubmittedApps: acc.totalSubmittedApps + (Number(record.total_submitted_apps) || 0),
            totalLives: acc.totalLives + (Number(record.total_settled_apps) || 0),
            totalAC: acc.totalAC + (Number(record.total_agency_credits) || 0),
            totalNSC: acc.totalNSC + (Number(record.total_net_sales_credits) || 0),
          };
        },
        {
          totalSubmittedApps: 0,
          totalLives: 0,
          totalAC: 0,
          totalNSC: 0,
        }
      );

      setData(enrichedData);
      setAggregatedTotals(totals);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch team production data');
      setError(error);
      setData(null);
      setAggregatedTotals(null);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, timeFrame, periodType, year, month, supabase]);

  const refetch = useCallback(async () => {
    await fetchProductionData();
  }, [fetchProductionData]);

  useEffect(() => {
    fetchProductionData();
  }, [fetchProductionData]);

  return {
    data,
    aggregatedTotals,
    isLoading,
    error,
    refetch
  };
}