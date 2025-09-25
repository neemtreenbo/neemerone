import { ManpowerRecord } from '@/lib/types/database';
import UnifiedManpowerTable from '@/components/shared/unified-manpower-table';

interface ManpowerPageWrapperProps {
  data: (ManpowerRecord & { hierarchy_level?: string; team_name?: string })[];
  isAdmin: boolean;
}

interface ManpowerErrorPageProps {
  error: Error;
}

export function ManpowerPageWrapper({ data, isAdmin }: ManpowerPageWrapperProps) {
  const pageTitle = 'Manpower';
  const tableTitle = isAdmin ? 'Manpower Management' : 'Advisor Directory';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {pageTitle}
          </h1>
        </div>

        <UnifiedManpowerTable
          data={data}
          mode={isAdmin ? 'admin' : 'regular'}
          title={tableTitle}
        />
      </div>
    </div>
  );
}

export function ManpowerErrorPage({ error }: ManpowerErrorPageProps) {
  const pageTitle = 'Manpower';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {pageTitle}
          </h1>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-center text-red-600 dark:text-red-400">
            <p>Error loading manpower data. Please try again later.</p>
            <p className="text-sm mt-2 text-gray-500 dark:text-gray-400">
              {error.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}