import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkAdminAccess } from '@/lib/auth';
import { ManpowerRecord } from '@/lib/types/database';
import UnifiedManpowerTable from '@/components/shared/unified-manpower-table';

// This page requires admin authentication and database queries, so it cannot be statically generated
export const dynamic = 'force-dynamic';

export default async function AdminManpower() {
  try {
    // Check admin access
    const { isAdmin } = await checkAdminAccess();
    if (!isAdmin) {
      redirect('/auth/login');
    }

    const supabase = await createClient();

  // Fetch manpower data
  const { data: manpowerData, error: dataError } = await supabase
    .from('manpower')
    .select('*')
    .order('advisor_name', { ascending: true });

  // Handle database errors
  if (dataError) {
    console.error('Error fetching manpower data:', dataError);
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin: Manpower Management</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Manage advisor records in the manpower database
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-center text-red-600 dark:text-red-400">
              <p>Error loading manpower data. Please try again later.</p>
              <p className="text-sm mt-2 text-gray-500 dark:text-gray-400">
                {dataError.message}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const manpower = (manpowerData || []) as ManpowerRecord[];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin: Manpower Management</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Manage advisor records in the manpower database. Add, edit, or delete advisor information.
          </p>
        </div>

        <UnifiedManpowerTable
          data={manpower}
          mode="admin"
          title="Manpower Management"
          description="Manage advisor records, update information, and maintain the advisor database."
        />
      </div>
    </div>
  );
  } catch (error) {
    console.error('Admin manpower page error:', error);
    throw new Error('Failed to load admin manpower page');
  }
}