import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DataUploadInterface } from '@/components/admin/data-upload-interface';

// Admin-only page - force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function UploadPage() {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: user, error: authError } = await supabase.auth.getClaims();

    if (authError || !user?.claims) {
      redirect('/auth/login');
    }

    // Get user profile to check admin role
    const { profile } = await getCurrentUserProfile();

    if (!profile) {
      redirect('/auth/error');
    }

    // Admin-only access
    if (profile.app_role !== 'admin') {
      redirect('/unauthorized');
    }

    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Data Upload Center
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Import sales data from Excel spreadsheets. Copy and paste data directly from Excel into the forms below.
            </p>
          </div>

          {/* Upload Interface */}
          <DataUploadInterface />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Upload page error:', error);
    redirect('/auth/error');
  }
}