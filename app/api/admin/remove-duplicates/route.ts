import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile } from '@/lib/auth';

interface RemoveDuplicatesRequest {
  tables: string[];
  action: 'preview' | 'remove';
}

export async function POST(request: Request) {
  console.log('=== REMOVE DUPLICATES API CALLED ===');
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
    let requestData: RemoveDuplicatesRequest;

    try {
      requestData = await request.json();
      console.log('Request body parsed:', requestData);
    } catch (parseError) {
      console.error('Failed to parse request JSON:', parseError);
      return NextResponse.json({
        error: 'Invalid JSON in request body',
        details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      }, { status: 400 });
    }

    if (!requestData.tables || !Array.isArray(requestData.tables) || requestData.tables.length === 0) {
      console.error('Invalid tables array:', requestData.tables);
      return NextResponse.json({ error: 'Tables array is required and must not be empty' }, { status: 400 });
    }

    if (!requestData.action || !['preview', 'remove'].includes(requestData.action)) {
      console.error('Invalid action:', requestData.action);
      return NextResponse.json({ error: 'Action must be either "preview" or "remove"' }, { status: 400 });
    }

    // Validate table names
    const validTables = ['submitted_apps_details', 'settled_apps_details', 'fy_commission_details', 'rn_commission_details'];
    const invalidTables = requestData.tables.filter(table => !validTables.includes(table));
    
    if (invalidTables.length > 0) {
      console.error('Invalid table names:', invalidTables);
      return NextResponse.json({ 
        error: 'Invalid table names', 
        details: `Invalid tables: ${invalidTables.join(', ')}. Valid tables: ${validTables.join(', ')}` 
      }, { status: 400 });
    }

    console.log(`Starting duplicate ${requestData.action} for tables:`, requestData.tables);

    if (requestData.action === 'preview') {
      // Get duplicate statistics without removing
      console.log('Calling get_duplicate_statistics RPC...');
      const { data: result, error: rpcError } = await supabase.rpc('get_duplicate_statistics', {
        p_table_names: requestData.tables
      });

      console.log('Statistics RPC call completed:', {
        hasResult: !!result,
        hasError: !!rpcError,
        errorMessage: rpcError?.message,
        result: result
      });

      if (rpcError) {
        console.error('RPC error:', rpcError);
        return NextResponse.json(
          { error: 'Failed to get statistics', details: rpcError.message },
          { status: 500 }
        );
      }

      if (!result || !result.success) {
        console.error('Statistics failed - result:', JSON.stringify(result, null, 2));
        return NextResponse.json(
          { error: 'Statistics failed', details: result?.error || 'Unknown error' },
          { status: 400 }
        );
      }

      console.log('Statistics successful:', result);

      return NextResponse.json({
        success: true,
        action: 'preview',
        tables: requestData.tables,
        statistics: result.table_statistics
      });

    } else {
      // Actually remove duplicates
      console.log('Calling remove_duplicates_from_tables RPC...');
      const { data: result, error: rpcError } = await supabase.rpc('remove_duplicates_from_tables', {
        p_table_names: requestData.tables
      });

      console.log('Remove duplicates RPC call completed:', {
        hasResult: !!result,
        hasError: !!rpcError,
        errorMessage: rpcError?.message,
        result: result
      });

      if (rpcError) {
        console.error('RPC error:', rpcError);
        return NextResponse.json(
          { error: 'Duplicate removal failed', details: rpcError.message },
          { status: 500 }
        );
      }

      if (!result) {
        console.error('No result from RPC call');
        return NextResponse.json(
          { error: 'No result from duplicate removal operation' },
          { status: 500 }
        );
      }

      console.log('Duplicate removal completed:', {
        success: result.success,
        totalRemoved: result.total_duplicates_removed,
        tablesProcessed: result.tables_processed,
        errors: result.errors?.length || 0
      });

      return NextResponse.json({
        success: result.success,
        action: 'remove',
        tables: requestData.tables,
        total_duplicates_removed: result.total_duplicates_removed,
        tables_processed: result.tables_processed,
        table_results: result.table_results,
        errors: result.errors || []
      });
    }

  } catch (error) {
    console.error('Remove duplicates API error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}