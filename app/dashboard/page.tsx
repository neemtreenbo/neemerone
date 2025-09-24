import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// This page requires authentication, so it cannot be statically generated
export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: user, error } = await supabase.auth.getClaims();
    if (error) {
      console.error('Dashboard auth error:', error);
      redirect('/auth/error');
    }

    if (!user?.claims) {
      redirect('/auth/login');
    }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Dashboard</h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-gray-600 dark:text-gray-300">
            Welcome to the Neem Tree advisor performance monitoring portal.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Use the navigation dropdown in the header to access different sections.
          </p>
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            <p>Logged in as: <span className="font-medium">{user.claims.email}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
  } catch (error) {
    console.error('Dashboard error:', error);
    // This will be caught by the error boundary
    throw new Error('Failed to load dashboard');
  }
}