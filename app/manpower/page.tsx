import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ManpowerRecord } from '@/lib/types/database';
import UnifiedManpowerTable from '@/components/shared/unified-manpower-table';
import { getCurrentUserProfile } from '@/lib/auth';

// This page requires authentication and database queries, so it cannot be statically generated
export const dynamic = 'force-dynamic';

export default async function Manpower() {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: user, error: authError } = await supabase.auth.getClaims();
    if (authError) {
      console.error('Manpower auth error:', authError);
      redirect('/auth/error');
    }

    if (!user?.claims) {
      redirect('/auth/login');
    }

    // Smart routing: If user is admin, redirect to admin manpower page
    const { profile } = await getCurrentUserProfile();
    if (profile?.app_role === 'admin') {
      redirect('/admin/manpower');
    }

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
          <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Manpower</h1>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manpower</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            View advisor information from the manpower database.
          </p>
        </div>

        <UnifiedManpowerTable
          data={manpower}
          mode="regular"
          title="Advisor Directory"
          description="Browse and search through advisor profiles, contact information, and key dates."
        />
      </div>
    </div>
  );
  } catch (error) {
    console.error('Manpower page error:', error);
    throw new Error('Failed to load manpower data');
  }
}