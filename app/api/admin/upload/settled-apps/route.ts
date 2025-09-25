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

    // Process uploads with duplicate detection
    let duplicatesRemoved = 0;
    let recordsInserted = 0;
    const errors: string[] = [];

    for (const record of settledAppsData) {
      try {
        // Check for existing duplicates (same data except id, created_at, updated_at)
        const { data: existingRecords, error: queryError } = await supabase
          .from('settled_apps_details')
          .select('id, created_at')
          .eq('advisor_code', record.advisor_code)
          .eq('advisor_name', record.advisor_name || '')
          .eq('process_date', record.process_date || '')
          .eq('insured_name', record.insured_name || '')
          .eq('policy_number', record.policy_number || '')
          .eq('settled_apps', record.settled_apps || 0)
          .eq('agency_credits', record.agency_credits || 0)
          .eq('net_sales_credits', record.net_sales_credits || 0);

        if (queryError) {
          errors.push(`Query error for ${record.advisor_code}: ${queryError.message}`);
          continue;
        }

        // If duplicates exist, remove older ones (keep only the newest by created_at)
        if (existingRecords && existingRecords.length > 0) {
          // Sort by created_at descending to get newest first
          const sortedRecords = existingRecords.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

          // Delete all existing records (we'll insert the new one)
          const idsToDelete = sortedRecords.map(r => r.id);
          const { error: deleteError } = await supabase
            .from('settled_apps_details')
            .delete()
            .in('id', idsToDelete);

          if (deleteError) {
            errors.push(`Delete error for ${record.advisor_code}: ${deleteError.message}`);
            continue;
          }

          duplicatesRemoved += idsToDelete.length;
        }

        // Insert new record
        const { error: insertError } = await supabase
          .from('settled_apps_details')
          .insert({
            advisor_code: record.advisor_code,
            advisor_name: record.advisor_name || null,
            process_date: record.process_date || null,
            insured_name: record.insured_name || null,
            policy_number: record.policy_number || null,
            settled_apps: record.settled_apps || null,
            agency_credits: record.agency_credits || null,
            net_sales_credits: record.net_sales_credits || null
          });

        if (insertError) {
          errors.push(`Insert error for ${record.advisor_code}: ${insertError.message}`);
          continue;
        }

        recordsInserted++;
      } catch (recordError) {
        errors.push(`Processing error for ${record.advisor_code}: ${recordError}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Upload completed successfully`,
      stats: {
        recordsProcessed: settledAppsData.length,
        recordsInserted,
        duplicatesRemoved,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Settled apps upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}