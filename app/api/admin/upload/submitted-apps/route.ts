import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile } from '@/lib/auth';

interface SubmittedAppData {
  advisor_code: string;
  advisor_name?: string;
  process_date?: string;
  insured_name?: string;
  policy_number?: string;
  submitted_apps?: number;
}

export async function POST(request: Request) {
  try {
    // Check authentication and admin role
    const supabase = await createClient();
    const { data: user, error: authError } = await supabase.auth.getClaims();

    if (authError || !user?.claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { profile } = await getCurrentUserProfile();
    if (!profile || profile.app_role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { data: submittedAppsData } = await request.json() as { data: SubmittedAppData[] };

    if (!submittedAppsData || !Array.isArray(submittedAppsData) || submittedAppsData.length === 0) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    // Process uploads using RPC function
    console.log(`Starting submitted apps upload of ${submittedAppsData.length} records`);

    const { data: result, error: rpcError } = await supabase.rpc('upload_with_deduplication', {
      p_table_name: 'submitted_apps_details',
      p_records: submittedAppsData,
      p_duplicate_fields: ['advisor_code', 'process_date', 'insured_name', 'policy_number']
    });

    if (rpcError) {
      console.error('RPC error:', rpcError);
      return NextResponse.json(
        { error: 'Upload failed', details: rpcError.message },
        { status: 500 }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: 'Upload failed', details: result.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Upload completed successfully`,
      stats: {
        recordsProcessed: submittedAppsData.length,
        recordsInserted: result.records_inserted,
        duplicatesRemoved: result.duplicates_removed,
        errors: result.errors.length
      },
      errors: result.errors.length > 0 ? result.errors : undefined
    });

  } catch (error) {
    console.error('Submitted apps upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}