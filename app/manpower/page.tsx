import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile } from '@/lib/auth';
import { fetchManpowerData } from '@/lib/data/manpower';
import { ManpowerPageWrapper, ManpowerErrorPage } from '@/components/manpower/manpower-page-wrapper';
import { redirect } from 'next/navigation';

// This page requires authentication and database queries, so it cannot be statically generated
export const dynamic = 'force-dynamic';

export default async function Manpower() {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: user, error: authError } = await supabase.auth.getClaims();

    if (authError || !user?.claims) {
      redirect('/auth/login');
    }

    // Get user profile to determine mode
    const { profile } = await getCurrentUserProfile();
    const isAdmin = profile?.app_role === 'admin';

    // Fetch manpower data
    const { data, error } = await fetchManpowerData();

    // Handle database errors
    if (error || !data) {
      return (
        <ManpowerErrorPage
          error={error || new Error('Failed to load data')}
        />
      );
    }

    // Render success page
    return (
      <ManpowerPageWrapper
        data={data}
        isAdmin={isAdmin}
      />
    );
  } catch (error) {
    console.error('Manpower page error:', error);
    redirect('/auth/error');
  }
}