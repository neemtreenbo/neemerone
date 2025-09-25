'use client';

import { useState } from 'react';
import { ManpowerRecord } from '@/lib/types/database';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ManpowerQuery } from '../manpower/manpower-query';
import ManpowerForm from '@/components/admin/manpower-form';

interface UnifiedManpowerTableProps {
  data: (ManpowerRecord & { hierarchy_level?: string; team_name?: string })[];
  mode?: 'admin' | 'regular';
  title?: string;
  description?: string;
}

export default function UnifiedManpowerTable({
  data,
  mode = 'regular',
  title = 'Manpower',
  description
}: UnifiedManpowerTableProps) {
  const isAdminMode = mode === 'admin';
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header Section with Admin Actions */}
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
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Advisor
          </Button>
        )}
      </div>

      {/* Use the new ManpowerQuery component */}
      <ManpowerQuery
        data={data}
        config={{
          mode: 'full',
          showSummaryCards: true,
          showSearchFilter: true,
          showResultsCount: true,
          allowAdminActions: isAdminMode
        }}
      />

      {/* Add Advisor Form */}
      {isAdminMode && (
        <ManpowerForm
          isOpen={showAddForm}
          onOpenChange={setShowAddForm}
          mode="create"
        />
      )}
    </div>
  );
}