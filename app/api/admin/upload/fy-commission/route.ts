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
  console.log('=== FY COMMISSION UPLOAD API CALLED (v2) ===');
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);

  try {
    // Check authentication and admin role
    const supabase = await createClient();
    console.log('Supabase client created successfully');

    const { data: user, error: authError } = await supabase.auth.getClaims();
    console.log('Auth check result:', {
      hasUser: !!user?.claims,
      authError: authError?.message || null
    });

    if (authError) {
      console.error('Auth error details:', authError);
      return NextResponse.json({
        error: 'Authentication error',
        details: authError.message
      }, { status: 401 });
    }

    if (!user?.claims) {
      console.error('No user claims found');
      return NextResponse.json({ error: 'Unauthorized - no user claims' }, { status: 401 });
    }

    console.log('User authenticated, checking profile...');
    const { profile } = await getCurrentUserProfile();
    console.log('Profile check result:', {
      hasProfile: !!profile,
      appRole: profile?.app_role || null
    });

    if (!profile) {
      console.error('No profile found for user');
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
    }

    if (profile.app_role !== 'admin') {
      console.error('User does not have admin role:', profile.app_role);
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('Parsing request body...');
    let fyCommissionData: FYCommissionData[];

    try {
      const requestBody = await request.json();
      console.log('Request body parsed:', { hasData: !!requestBody.data, dataLength: requestBody.data?.length });
      fyCommissionData = requestBody.data;
    } catch (parseError) {
      console.error('Failed to parse request JSON:', parseError);
      return NextResponse.json({
        error: 'Invalid JSON in request body',
        details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      }, { status: 400 });
    }

    if (!fyCommissionData || !Array.isArray(fyCommissionData) || fyCommissionData.length === 0) {
      console.error('Invalid data format:', {
        hasData: !!fyCommissionData,
        isArray: Array.isArray(fyCommissionData),
        length: fyCommissionData?.length
      });
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    // Process uploads using RPC function
    console.log(`Starting FY commission upload of ${fyCommissionData.length} records`);
    console.log('Sample record:', fyCommissionData[0]);

    // Direct upload with table-specific duplicate detection
    console.log('Proceeding with upload using FY commission specific function...');
    const { data: result, error: rpcError } = await supabase.rpc('upload_fy_commission_with_dedup', {
      p_records: fyCommissionData
    });

    console.log('RPC call completed:', {
      hasResult: !!result,
      hasError: !!rpcError,
      errorMessage: rpcError?.message,
      result: result
    });

    if (rpcError) {
      console.error('RPC error:', rpcError);
      console.error('RPC error details:', JSON.stringify(rpcError, null, 2));
      return NextResponse.json(
        { error: 'RPC function error', details: rpcError.message },
        { status: 500 }
      );
    }

    if (!result || !result.success) {
      console.error('Upload failed - result:', JSON.stringify(result, null, 2));
      const errorDetails = Array.isArray(result?.errors) ? result.errors.join(', ') : result?.errors || 'Unknown error';
      return NextResponse.json(
        { error: 'Upload failed', details: errorDetails, debugInfo: result },
        { status: 400 }
      );
    }

    console.log('Upload successful:', {
      recordsProcessed: fyCommissionData.length,
      recordsInserted: result.records_inserted,
      recordsUpdated: result.records_updated,
      errors: result.errors?.length || 0
    });

    return NextResponse.json({
      success: true,
      message: `Upload completed successfully`,
      stats: {
        recordsProcessed: fyCommissionData.length,
        recordsInserted: result.records_inserted,
        recordsUpdated: result.records_updated,
        errors: result.errors?.length || 0
      },
      errors: (result.errors?.length || 0) > 0 ? result.errors : undefined
    });

  } catch (error) {
    console.error('FY commission upload error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}