'use client';

import { useState } from 'react';
import { ManpowerRecord } from '@/lib/types/database';
import { ManpowerDataTable } from './manpower-data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
// Using custom collapsible implementation

interface TeamGroup {
  teamName: string;
  unitCode?: string;
  members: (ManpowerRecord & { hierarchy_level?: string; team_name?: string })[];
  totalActive: number;
  totalCancelled: number;
}

interface TeamGroupedViewProps {
  data: (ManpowerRecord & { hierarchy_level?: string; team_name?: string })[];
  mode?: 'admin' | 'regular';
  searchQuery?: string;
  statusFilter?: string;
}

export function TeamGroupedView({
  data,
  mode = 'regular',
  searchQuery = '',
  statusFilter = 'all'
}: TeamGroupedViewProps) {
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set());

  // Group data by teams
  const teamGroups: TeamGroup[] = data.reduce((groups, record) => {
    const teamName = record.team_name || record.unit_code || 'Unassigned Team';

    let existingGroup = groups.find(g => g.teamName === teamName);

    if (!existingGroup) {
      existingGroup = {
        teamName,
        unitCode: record.unit_code,
        members: [],
        totalActive: 0,
        totalCancelled: 0
      };
      groups.push(existingGroup);
    }

    existingGroup.members.push(record);

    if (record.status === 'active') {
      existingGroup.totalActive++;
    } else if (record.status === 'cancelled') {
      existingGroup.totalCancelled++;
    }

    return groups;
  }, [] as TeamGroup[]);

  // Sort teams by name
  teamGroups.sort((a, b) => a.teamName.localeCompare(b.teamName));

  const toggleTeamCollapse = (teamName: string) => {
    const newCollapsed = new Set(collapsedTeams);
    if (newCollapsed.has(teamName)) {
      newCollapsed.delete(teamName);
    } else {
      newCollapsed.add(teamName);
    }
    setCollapsedTeams(newCollapsed);
  };

  const toggleAllTeams = () => {
    if (collapsedTeams.size === teamGroups.length) {
      // All teams are collapsed, expand all
      setCollapsedTeams(new Set());
    } else {
      // Some or no teams are collapsed, collapse all
      setCollapsedTeams(new Set(teamGroups.map(g => g.teamName)));
    }
  };

  if (teamGroups.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No team data available
      </div>
    );
  }

  const allCollapsed = collapsedTeams.size === teamGroups.length;
  const allExpanded = collapsedTeams.size === 0;

  return (
    <div className="space-y-4">
      {/* Team Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {teamGroups.length} Team{teamGroups.length !== 1 ? 's' : ''}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleAllTeams}
          className="flex items-center gap-2"
        >
          {allExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Collapse All
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Expand All
            </>
          )}
        </Button>
      </div>

      {/* Team Groups */}
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
                    <CardTitle className="text-lg">
                      {group.teamName}
                    </CardTitle>
                  </div>
                  {group.unitCode && group.unitCode !== group.teamName && (
                    <Badge variant="outline" className="text-xs">
                      {group.unitCode}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {group.members.length}
                  </Badge>
                  {group.totalActive > 0 && (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                      {group.totalActive} Active
                    </Badge>
                  )}
                  {group.totalCancelled > 0 && (
                    <Badge variant="destructive">
                      {group.totalCancelled} Cancelled
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            {!isCollapsed && (
              <CardContent className="pt-0">
                <ManpowerDataTable
                  data={group.members}
                  mode={mode}
                  searchQuery={searchQuery}
                  statusFilter={statusFilter}
                />
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}