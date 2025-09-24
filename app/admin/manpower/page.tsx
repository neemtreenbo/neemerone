import { authenticateAdminManpower } from '@/lib/auth/manpower-auth';
import { fetchManpowerData } from '@/lib/data/manpower';
import { ManpowerPageWrapper, ManpowerErrorPage, MANPOWER_PAGE_CONFIGS } from '@/components/manpower/manpower-page-wrapper';

// This page requires admin authentication and database queries, so it cannot be statically generated
export const dynamic = 'force-dynamic';

export default async function AdminManpower() {
  try {
    // Handle admin authentication
    await authenticateAdminManpower();

    // Fetch manpower data
    const { data, error } = await fetchManpowerData();

    // Handle database errors
    if (error || !data) {
      return (
        <ManpowerErrorPage
          error={error || new Error('Failed to load data')}
          config={MANPOWER_PAGE_CONFIGS.admin}
        />
      );
    }

    // Render success page
    return (
      <ManpowerPageWrapper
        data={data}
        config={MANPOWER_PAGE_CONFIGS.admin}
      />
    );
  } catch (error) {
    console.error('Admin manpower page error:', error);
    throw new Error('Failed to load admin manpower page');
  }
}