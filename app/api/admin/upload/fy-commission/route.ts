import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile } from '@/lib/auth';

interface FYCommissionData {
  code: string;
  process_date?: string;
  insured_name?: string;
  policy_number?: string;
  transaction_type?: string;
  fy_premium_php?: number;
  due_date?: string;
  rate?: number;
  fy_commission_php?: number;
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

    const { data: fyCommissionData } = await request.json() as { data: FYCommissionData[] };

    if (!fyCommissionData || !Array.isArray(fyCommissionData) || fyCommissionData.length === 0) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    // Process uploads using RPC function
    console.log(`Starting FY commission upload of ${fyCommissionData.length} records`);

    const { data: result, error: rpcError } = await supabase.rpc('upload_with_deduplication', {
      p_table_name: 'fy_commission_details',
      p_records: fyCommissionData,
      p_duplicate_fields: ['code', 'process_date', 'insured_name', 'policy_number', 'transaction_type']
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
        recordsProcessed: fyCommissionData.length,
        recordsInserted: result.records_inserted,
        duplicatesRemoved: result.duplicates_removed,
        errors: result.errors.length
      },
      errors: result.errors.length > 0 ? result.errors : undefined
    });

  } catch (error) {
    console.error('FY commission upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}