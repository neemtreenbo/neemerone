'use client';

import { useState, useMemo } from 'react';
import { ManpowerRecord } from '@/lib/types/database';
import { ManpowerSummaryCards } from './manpower-summary-cards';
import { ManpowerSearchFilter } from './manpower-search-filter';
import { ManpowerDataTable } from './manpower-data-table';
import {
  ClassCategory,
  MonthFilter,
  classMatchesCategory,
  dateMatchesMonth,
  recordMatchesTeam,
  getUniqueTeams,
} from '@/lib/utils/manpower-filters';

type StatusFilter = 'active' | 'cancelled' | 'all';

export type ManpowerQueryMode =
  | 'full'           // Complete table with all features (default manpower page)
  | 'compact'        // Essential columns only (for dashboards)
  | 'stats-only'     // Only summary cards (for quick insights)
  | 'selector'       // Optimized for selection (for dropdowns/modals)
  | 'minimal';       // Basic table without extras

export interface ManpowerQueryConfig {
  mode: ManpowerQueryMode;
  showSummaryCards?: boolean;
  showSearchFilter?: boolean;
  showResultsCount?: boolean;
  allowAdminActions?: boolean;
  customTitle?: string;
  customDescription?: string;
  visibleColumns?: Array<'profile' | 'name' | 'hierarchy' | 'code' | 'unit_code' | 'status' | 'class' | 'date_hired' | 'birthday'>;
  onRecordSelect?: (record: ManpowerRecord & { hierarchy_level?: string; team_name?: string }) => void;
  onRecordMultiSelect?: (records: (ManpowerRecord & { hierarchy_level?: string; team_name?: string })[]) => void;
}

interface ManpowerQueryProps {
  data: (ManpowerRecord & { hierarchy_level?: string; team_name?: string })[];
  config?: Partial<ManpowerQueryConfig>;
  className?: string;
}

const DEFAULT_CONFIGS: Record<ManpowerQueryMode, ManpowerQueryConfig> = {
  full: {
    mode: 'full',
    showSummaryCards: true,
    showSearchFilter: true,
    showResultsCount: true,
    allowAdminActions: false,
    visibleColumns: ['profile', 'name', 'hierarchy', 'code', 'unit_code', 'status', 'class', 'date_hired', 'birthday']
  },
  compact: {
    mode: 'compact',
    showSummaryCards: false,
    showSearchFilter: true,
    showResultsCount: true,
    allowAdminActions: false,
    visibleColumns: ['profile', 'name', 'hierarchy', 'code', 'status']
  },
  'stats-only': {
    mode: 'stats-only',
    showSummaryCards: true,
    showSearchFilter: false,
    showResultsCount: false,
    allowAdminActions: false,
    visibleColumns: []
  },
  selector: {
    mode: 'selector',
    showSummaryCards: false,
    showSearchFilter: true,
    showResultsCount: false,
    allowAdminActions: false,
    visibleColumns: ['profile', 'name', 'hierarchy', 'code', 'unit_code']
  },
  minimal: {
    mode: 'minimal',
    showSummaryCards: false,
    showSearchFilter: false,
    showResultsCount: false,
    allowAdminActions: false,
    visibleColumns: ['name', 'code', 'status']
  }
};

export function ManpowerQuery({
  data,
  config = {},
  className = ""
}: ManpowerQueryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [classFilter, setClassFilter] = useState<ClassCategory>('all');
  const [dateHiredMonthFilter, setDateHiredMonthFilter] = useState<MonthFilter>('all');
  const [birthdayMonthFilter, setBirthdayMonthFilter] = useState<MonthFilter>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');

  // Merge config with defaults
  const finalConfig: ManpowerQueryConfig = {
    ...DEFAULT_CONFIGS[config.mode || 'full'],
    ...config
  };

  // Calculate available teams
  const availableTeams = useMemo(() => getUniqueTeams(data), [data]);

  // Helper functions for filtering
  const isActiveStatus = (status?: string): boolean => status === 'active';
  const isCancelledStatus = (status?: string): boolean => status === 'cancelled';

  // Filter data based on all filters
  const filteredData = useMemo(() => {
    return data.filter(record => {
      // Apply status filter
      let statusMatch = true;
      if (statusFilter === 'active') {
        statusMatch = isActiveStatus(record.status);
      } else if (statusFilter === 'cancelled') {
        statusMatch = isCancelledStatus(record.status);
      }
      if (!statusMatch) return false;

      // Apply class filter
      if (!classMatchesCategory(classFilter, record.class)) return false;

      // Apply date hired month filter
      if (!dateMatchesMonth(dateHiredMonthFilter, record.date_hired)) return false;

      // Apply birthday month filter
      if (!dateMatchesMonth(birthdayMonthFilter, record.birthday)) return false;

      // Apply team filter
      if (!recordMatchesTeam(teamFilter, record.team_name)) return false;

      // Apply search filter
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        record.advisor_name?.toLowerCase().includes(query) ||
        record.nickname?.toLowerCase().includes(query) ||
        record.code_number.toLowerCase().includes(query) ||
        record.advisor_email?.toLowerCase().includes(query) ||
        record.unit_code?.toLowerCase().includes(query) ||
        record.team_name?.toLowerCase().includes(query) ||
        record.status?.toLowerCase().includes(query) ||
        record.class?.toLowerCase().includes(query)
      );
    });
  }, [data, searchQuery, statusFilter, classFilter, dateHiredMonthFilter, birthdayMonthFilter, teamFilter]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleStatusFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setClassFilter('all');
    setDateHiredMonthFilter('all');
    setBirthdayMonthFilter('all');
    setTeamFilter('all');
  };

  // Stats-only mode - just return the summary cards
  if (finalConfig.mode === 'stats-only') {
    return (
      <div className={className}>
        <ManpowerSummaryCards data={filteredData} />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Section */}
      {(finalConfig.customTitle || finalConfig.customDescription) && (
        <div className="flex flex-col gap-2">
          {finalConfig.customTitle && (
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {finalConfig.customTitle}
            </h2>
          )}
          {finalConfig.customDescription && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {finalConfig.customDescription}
            </p>
          )}
        </div>
      )}

      {/* Summary Cards */}
      {finalConfig.showSummaryCards && (
        <ManpowerSummaryCards data={filteredData} />
      )}

      {/* Search and Filter Bar */}
      {finalConfig.showSearchFilter && (
        <ManpowerSearchFilter
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          classFilter={classFilter}
          dateHiredMonthFilter={dateHiredMonthFilter}
          birthdayMonthFilter={birthdayMonthFilter}
          teamFilter={teamFilter}
          availableTeams={availableTeams}
          onSearchChange={handleSearchChange}
          onStatusFilterChange={handleStatusFilterChange}
          onClassFilterChange={setClassFilter}
          onDateHiredMonthFilterChange={setDateHiredMonthFilter}
          onBirthdayMonthFilterChange={setBirthdayMonthFilter}
          onTeamFilterChange={setTeamFilter}
          onClearSearch={handleClearSearch}
          onClearFilters={handleClearFilters}
        />
      )}

      {/* Results Count */}
      {finalConfig.showResultsCount && data.length > 0 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredData.length} of {data.length} advisor{data.length !== 1 ? 's' : ''}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
        </div>
      )}

      {/* Data Table */}
      <ManpowerDataTable
        data={data}
        mode={finalConfig.allowAdminActions ? 'admin' : 'regular'}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
      />
    </div>
  );
}

// Export pre-configured components for common use cases
export const ManpowerFullTable = (props: Omit<ManpowerQueryProps, 'config'>) => (
  <ManpowerQuery {...props} config={{ mode: 'full' }} />
);

export const ManpowerCompactTable = (props: Omit<ManpowerQueryProps, 'config'>) => (
  <ManpowerQuery {...props} config={{ mode: 'compact' }} />
);

export const ManpowerStatsCards = (props: Omit<ManpowerQueryProps, 'config'>) => (
  <ManpowerQuery {...props} config={{ mode: 'stats-only' }} />
);

export const ManpowerSelector = (props: Omit<ManpowerQueryProps, 'config'> & {
  onSelect?: (record: ManpowerRecord & { hierarchy_level?: string }) => void
}) => (
  <ManpowerQuery
    {...props}
    config={{
      mode: 'selector',
      onRecordSelect: props.onSelect
    }}
  />
);

export const ManpowerMinimalTable = (props: Omit<ManpowerQueryProps, 'config'>) => (
  <ManpowerQuery {...props} config={{ mode: 'minimal' }} />
);