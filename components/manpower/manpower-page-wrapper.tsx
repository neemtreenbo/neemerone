import { ManpowerRecord } from '@/lib/types/database';
import UnifiedManpowerTable from '@/components/shared/unified-manpower-table';

interface ManpowerPageConfig {
  mode: 'admin' | 'regular';
  pageTitle: string;
  pageDescription: string;
  tableTitle: string;
  tableDescription: string;
}

interface ManpowerPageWrapperProps {
  data: (ManpowerRecord & { hierarchy_level?: string })[];
  config: ManpowerPageConfig;
}

interface ManpowerErrorPageProps {
  error: Error;
  config: ManpowerPageConfig;
}

export function ManpowerPageWrapper({ data, config }: ManpowerPageWrapperProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {config.pageTitle}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            {config.pageDescription}
          </p>
        </div>

        <UnifiedManpowerTable
          data={data}
          mode={config.mode}
          title={config.tableTitle}
          description={config.tableDescription}
        />
      </div>
    </div>
  );
}

export function ManpowerErrorPage({ error, config }: ManpowerErrorPageProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {config.pageTitle}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            {config.pageDescription}
          </p>
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

// Predefined configurations for each page type
export const MANPOWER_PAGE_CONFIGS = {
  regular: {
    mode: 'regular' as const,
    pageTitle: 'Manpower',
    pageDescription: '',
    tableTitle: 'Advisor Directory',
    tableDescription: ''
  },
  admin: {
    mode: 'admin' as const,
    pageTitle: 'Manpower',
    pageDescription: '',
    tableTitle: 'Manpower Management',
    tableDescription: ''
  }
} as const;