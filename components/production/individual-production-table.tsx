'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronUp, TrendingUp, Users } from 'lucide-react';
import { formatNumber, formatCurrency } from '@/lib/utils';

interface ProductionRecord {
  advisor_code: string;
  advisor_name: string;
  unit_code: string;
  manager_id: string;
  total_submitted_apps: number;
  total_settled_apps: number;
  total_agency_credits: number;
  total_net_sales_credits: number;
}

interface ManpowerRecord {
  code_number: string;
  advisor_name: string;
  profile_photo_url?: string;
  team_name?: string;
  unit_code?: string;
  hierarchy_level?: string;
  status: string;
}

interface IndividualProductionTableProps {
  productionData: ProductionRecord[];
  manpowerData: ManpowerRecord[];
  isLoading?: boolean;
  timeFrame: 'monthly' | 'annual';
  periodType: 'calendar' | 'systems';
}

interface EnrichedProductionRecord extends ProductionRecord {
  profile_photo_url?: string;
  display_name: string;
  team_name?: string;
  hierarchy_level?: string;
}

interface TeamGroup {
  teamName: string;
  records: EnrichedProductionRecord[];
  totalSubmitted: number;
  totalSettled: number;
  totalAC: number;
  totalNSC: number;
}

export function IndividualProductionTable({
  productionData,
  manpowerData,
  isLoading = false,
  timeFrame,
  periodType
}: IndividualProductionTableProps) {
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set());

  // Enrich production data with manpower details
  const enrichedData: EnrichedProductionRecord[] = productionData.map(record => {
    const manpowerRecord = manpowerData.find(m => m.code_number === record.advisor_code);

    return {
      ...record,
      profile_photo_url: manpowerRecord?.profile_photo_url,
      display_name: manpowerRecord?.advisor_name || record.advisor_name,
      team_name: record.team_name || manpowerRecord?.team_name || record.unit_code || 'Unassigned Team',
      hierarchy_level: manpowerRecord?.hierarchy_level
    };
  });

  // Group by teams for grouped view
  const teamGroups: TeamGroup[] = enrichedData.reduce((groups, record) => {
    const teamName = record.team_name || record.unit_code || 'Unassigned Team';

    let existingGroup = groups.find(g => g.teamName === teamName);

    if (!existingGroup) {
      existingGroup = {
        teamName,
        records: [],
        totalSubmitted: 0,
        totalSettled: 0,
        totalAC: 0,
        totalNSC: 0
      };
      groups.push(existingGroup);
    }

    existingGroup.records.push(record);
    existingGroup.totalSubmitted += Number(record.total_submitted_apps) || 0;
    existingGroup.totalSettled += Number(record.total_settled_apps) || 0;
    existingGroup.totalAC += Number(record.total_agency_credits) || 0;
    existingGroup.totalNSC += Number(record.total_net_sales_credits) || 0;

    return groups;
  }, [] as TeamGroup[]);

  // Sort teams by name
  teamGroups.sort((a, b) => a.teamName.localeCompare(b.teamName));

  // Set all teams as collapsed by default when data changes
  useEffect(() => {
    const teamNames = teamGroups.map(group => group.teamName);
    setCollapsedTeams(new Set(teamNames));
  }, [productionData, manpowerData]);

  const toggleTeamCollapse = (teamName: string) => {
    const newCollapsed = new Set(collapsedTeams);
    if (newCollapsed.has(teamName)) {
      newCollapsed.delete(teamName);
    } else {
      newCollapsed.add(teamName);
    }
    setCollapsedTeams(newCollapsed);
  };

  const ProductionTable = ({ records }: { records: EnrichedProductionRecord[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Profile</TableHead>
          <TableHead>Display Name</TableHead>
          <TableHead>Code</TableHead>
          <TableHead className="text-right">Submitted Lives</TableHead>
          <TableHead className="text-right">Settled Lives</TableHead>
          <TableHead className="text-right">Agency Credit</TableHead>
          <TableHead className="text-right">Net Sales Credit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => (
          <TableRow key={record.advisor_code}>
            <TableCell>
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={record.profile_photo_url}
                  alt={record.display_name}
                />
                <AvatarFallback>
                  {record.display_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </AvatarFallback>
              </Avatar>
            </TableCell>
            <TableCell className="font-medium">{record.display_name}</TableCell>
            <TableCell>
              <Badge variant="outline">{record.advisor_code}</Badge>
            </TableCell>
            <TableCell className="text-right">{formatNumber(record.total_submitted_apps)}</TableCell>
            <TableCell className="text-right">{formatNumber(record.total_settled_apps)}</TableCell>
            <TableCell className="text-right">{formatCurrency(record.total_agency_credits)}</TableCell>
            <TableCell className="text-right">{formatCurrency(record.total_net_sales_credits)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (enrichedData.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            No production data available for the selected period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Team Groups Data Display */}
      <div className="space-y-4">
        {teamGroups.map((group) => {
          const isCollapsed = collapsedTeams.has(group.teamName);

          return (
            <Card key={group.teamName}>
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onClick={() => toggleTeamCollapse(group.teamName)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {isCollapsed ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      )}
                      <CardTitle className="text-lg">{group.teamName}</CardTitle>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="grid grid-cols-4 gap-4 text-base font-semibold text-gray-700 dark:text-gray-300 min-w-[480px]">
                      <div className="flex items-center gap-1 justify-center w-16">
                        <Users className="h-4 w-4" />
                        <span>{group.records.length}</span>
                      </div>
                      <div className="text-right w-24">
                        {Math.round(group.totalSettled)} Lives
                      </div>
                      <div className="text-right w-32">
                        ₱{Math.round(group.totalAC).toLocaleString()} AC
                      </div>
                      <div className="text-right w-32">
                        ₱{Math.round(group.totalNSC).toLocaleString()} NSC
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {!isCollapsed && (
                <CardContent className="pt-0">
                  <ProductionTable records={group.records} />
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}