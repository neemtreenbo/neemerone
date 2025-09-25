import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile } from '@/lib/auth';

interface SettledAppData {
  advisor_code: string;
  advisor_name?: string;
  process_date?: string;
  insured_name?: string;
  policy_number?: string;
  settled_apps?: number;
  agency_credits?: number;
  net_sales_credits?: number;
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

    const { data: settledAppsData } = await request.json() as { data: SettledAppData[] };

    if (!settledAppsData || !Array.isArray(settledAppsData) || settledAppsData.length === 0) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    // Process uploads using table-specific RPC function with duplicate detection
    console.log(`Starting settled apps upload of ${settledAppsData.length} records`);

    const { data: result, error: rpcError } = await supabase.rpc('upload_settled_apps_with_dedup', {
      p_records: settledAppsData
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
        recordsProcessed: settledAppsData.length,
        recordsInserted: result.records_inserted,
        recordsUpdated: result.records_updated,
        errors: result.errors?.length || 0
      },
      errors: (result.errors?.length || 0) > 0 ? result.errors : undefined
    });

  } catch (error) {
    console.error('Settled apps upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}