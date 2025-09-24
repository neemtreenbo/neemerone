/**
 * ManpowerQuery Component Usage Examples
 *
 * This file contains practical examples of how to use the ManpowerQuery component
 * across different pages in the Neem Tree insurance advisor portal.
 */

'use client';

import { useState } from 'react';
import { ManpowerRecord } from '@/lib/types/database';
import {
  ManpowerQuery,
  ManpowerFullTable,
  ManpowerStatsCards
} from '@/components/manpower/manpower-query';
import { useManpowerQuery, useManpowerStats } from '@/hooks/useManpowerQuery';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// =============================================================================
// Example 1: Dashboard Page - Stats Overview
// =============================================================================
export function DashboardExample() {
  const { data, isLoading, error } = useManpowerQuery();
  const { stats } = useManpowerStats();

  if (isLoading) return <div>Loading manpower data...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Quick stats cards only */}
      {data && <ManpowerStatsCards data={data} />}

      {/* Display individual stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <div>Total Active: {stats.totalActive}</div>
          <div>Direct Reports: {stats.direct}</div>
        </div>
      )}

      {/* Other dashboard content */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2>Recent Activity</h2>
        <p>Other dashboard widgets here...</p>
      </div>
    </div>
  );
}

// =============================================================================
// Example 2: Production Page - Compact Table for Selection
// =============================================================================
export function ProductionPageExample() {
  const { data } = useManpowerQuery();
  const [selectedAdvisor, setSelectedAdvisor] = useState<ManpowerRecord | null>(null);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Production Analysis</h1>

      {data && (
        <ManpowerQuery
          data={data}
          config={{
            mode: 'compact',
            customTitle: "Select Advisor for Production Report",
            customDescription: "Choose an advisor to view their production metrics",
            onRecordSelect: (advisor: ManpowerRecord & { hierarchy_level?: string }) => {
              setSelectedAdvisor(advisor as ManpowerRecord);
              console.log('Selected advisor for production:', advisor);
            }
          }}
        />
      )}

      {selectedAdvisor && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3>Selected Advisor: {selectedAdvisor.advisor_name}</h3>
          <p>Code: {selectedAdvisor.code_number}</p>
          <p>Unit: {selectedAdvisor.unit_code}</p>
          {/* Production metrics would go here */}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Example 3: Bonus Page - Multi-Select with Filtering
// =============================================================================
export function BonusPageExample() {
  const { data } = useManpowerQuery();
  const [selectedAdvisors, setSelectedAdvisors] = useState<ManpowerRecord[]>([]);

  // Filter for active advisors only
  const activeAdvisors = data?.filter((advisor: ManpowerRecord & { hierarchy_level?: string }) =>
    advisor.status === 'active' &&
    advisor.class !== 'Individual' // Only managers eligible for certain bonuses
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Bonus Calculation</h1>

      {activeAdvisors && (
        <ManpowerQuery
          data={activeAdvisors}
          config={{
            mode: 'selector',
            customTitle: "Select Advisors for Bonus Calculation",
            customDescription: "Choose active managers eligible for bonus",
            visibleColumns: ['profile', 'name', 'hierarchy', 'code', 'unit_code', 'class'],
            onRecordMultiSelect: setSelectedAdvisors
          }}
        />
      )}

      <div className="bg-green-50 p-4 rounded-lg">
        <h3>Selected for Bonus: {selectedAdvisors.length} advisors</h3>
        {selectedAdvisors.map(advisor => (
          <div key={advisor.code_number} className="text-sm">
            • {advisor.advisor_name} ({advisor.code_number})
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Example 4: Modal Selection Dialog
// =============================================================================
interface AdvisorSelectModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (advisor: ManpowerRecord & { hierarchy_level?: string }) => void;
}

export function AdvisorSelectModal({ open, onClose, onSelect }: AdvisorSelectModalProps) {
  const { data } = useManpowerQuery();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Advisor</DialogTitle>
        </DialogHeader>

        {data && (
          <ManpowerQuery
            data={data}
            config={{
              mode: 'selector',
              showSearchFilter: true,
              visibleColumns: ['profile', 'name', 'code', 'unit_code', 'status'],
              onRecordSelect: (advisor) => {
                onSelect(advisor);
                onClose();
              }
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// Usage of the modal
export function PageUsingModal() {
  const [showModal, setShowModal] = useState(false);
  const [selectedAdvisor, setSelectedAdvisor] = useState<ManpowerRecord | null>(null);

  return (
    <div className="p-6">
      <Button onClick={() => setShowModal(true)}>
        Select Advisor
      </Button>

      {selectedAdvisor && (
        <div className="mt-4 p-4 bg-gray-50 rounded">
          Selected: {selectedAdvisor.advisor_name}
        </div>
      )}

      <AdvisorSelectModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSelect={setSelectedAdvisor}
      />
    </div>
  );
}

// =============================================================================
// Example 5: Custom Configuration for Specific Use Case
// =============================================================================
export function TeamManagementExample() {
  const { data, refetch, isRefetching } = useManpowerQuery({
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    cacheTime: 60000       // Cache for 1 minute
  });

  // Filter for direct reports only
  const directReports = data?.filter((advisor: ManpowerRecord & { hierarchy_level?: string }) =>
    advisor.hierarchy_level === 'Direct'
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Team Management</h1>
        <Button
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          {isRefetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {directReports && (
        <ManpowerQuery
          data={directReports}
          config={{
            mode: 'full',
            customTitle: "Direct Reports",
            customDescription: "Manage your direct team members",
            showSummaryCards: true,
            allowAdminActions: true, // Enable edit/delete actions
            visibleColumns: ['profile', 'name', 'code', 'unit_code', 'status', 'class', 'date_hired']
          }}
        />
      )}
    </div>
  );
}

// =============================================================================
// Example 6: Embedded Widget for Another Page
// =============================================================================
export function EmbeddedManpowerWidget() {
  const { data } = useManpowerQuery();

  // Show only recent hires
  const recentHires = data?.filter((advisor: ManpowerRecord & { hierarchy_level?: string }) => {
    if (!advisor.date_hired) return false;
    const hireDate = new Date(advisor.date_hired);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return hireDate > threeMonthsAgo;
  }).slice(0, 5); // Show only first 5

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="font-semibold mb-4">Recent Hires (Last 3 Months)</h3>

      {recentHires && recentHires.length > 0 ? (
        <ManpowerQuery
          data={recentHires}
          config={{
            mode: 'minimal',
            visibleColumns: ['name', 'code', 'date_hired'],
            showSearchFilter: false
          }}
        />
      ) : (
        <p className="text-gray-500 text-sm">No recent hires</p>
      )}
    </div>
  );
}

// =============================================================================
// Example 7: Performance Optimization for Large Datasets
// =============================================================================
export function LargeDatasetExample() {
  const { data } = useManpowerQuery({
    cacheTime: 600000, // Cache for 10 minutes (longer for large datasets)
  });

  // Paginate large datasets
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const paginatedData = data?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-6">
      <h1>Large Dataset View ({data?.length} total records)</h1>

      {paginatedData && (
        <ManpowerQuery
          data={paginatedData}
          config={{
            mode: 'compact',
            customDescription: `Showing ${paginatedData.length} of ${data?.length} records`,
            showResultsCount: true
          }}
        />
      )}

      {/* Pagination controls */}
      <div className="flex justify-center space-x-2">
        <Button
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <span className="px-4 py-2">Page {currentPage}</span>
        <Button
          onClick={() => setCurrentPage(p => p + 1)}
          disabled={!data || (currentPage * pageSize) >= data.length}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Export all examples for easy import
// =============================================================================
export {
  DashboardExample as ManpowerDashboard,
  ProductionPageExample as ManpowerProduction,
  BonusPageExample as ManpowerBonus,
  TeamManagementExample as ManpowerTeamManagement,
  EmbeddedManpowerWidget as ManpowerWidget,
  LargeDatasetExample as ManpowerLargeDataset,
  PageUsingModal as ManpowerModalExample
};