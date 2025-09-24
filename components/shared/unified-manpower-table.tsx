'use client';

import { useState } from 'react';
import { ManpowerRecord } from '@/lib/types/database';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ManpowerSummaryCards } from '../manpower/manpower-summary-cards';
import { ManpowerSearchFilter } from '../manpower/manpower-search-filter';
import { ManpowerDataTable } from '../manpower/manpower-data-table';

interface UnifiedManpowerTableProps {
  data: (ManpowerRecord & { hierarchy_level?: string })[];
  mode?: 'admin' | 'regular';
  title?: string;
  description?: string;
}

type StatusFilter = 'active' | 'cancelled' | 'all';

export default function UnifiedManpowerTable({
  data,
  mode = 'regular',
  title = 'Manpower',
  description
}: UnifiedManpowerTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const isAdminMode = mode === 'admin';

  // Helper function to determine if status is active or cancelled
  const isActiveStatus = (status?: string): boolean => status === 'active';
  const isCancelledStatus = (status?: string): boolean => status === 'cancelled';

  // Filter data based on search query and status filter
  const filteredData = data.filter(record => {
    // Apply status filter first
    let statusMatch = true;
    if (statusFilter === 'active') {
      statusMatch = isActiveStatus(record.status);
    } else if (statusFilter === 'cancelled') {
      statusMatch = isCancelledStatus(record.status);
    }
    if (!statusMatch) return false;

    // Apply search filter
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      record.advisor_name?.toLowerCase().includes(query) ||
      record.nickname?.toLowerCase().includes(query) ||
      record.code_number.toLowerCase().includes(query) ||
      record.advisor_email?.toLowerCase().includes(query) ||
      record.status?.toLowerCase().includes(query) ||
      record.class?.toLowerCase().includes(query)
    );
  });

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
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {description}
            </p>
          )}
        </div>
        {isAdminMode && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Advisor
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <ManpowerSummaryCards data={filteredData} />

      {/* Search and Filter Bar */}
      <ManpowerSearchFilter
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        onSearchChange={handleSearchChange}
        onStatusFilterChange={handleStatusFilterChange}
        onClearSearch={handleClearSearch}
        onClearFilters={handleClearFilters}
      />

      {/* Results Count */}
      {data.length > 0 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredData.length} of {data.length} advisor{data.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Data Table */}
      <ManpowerDataTable
        data={data}
        mode={mode}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
      />
    </div>
  );
}