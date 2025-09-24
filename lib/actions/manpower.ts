'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { checkAdminAccess } from '@/lib/auth';
import { ManpowerRecord, Insert, Update } from '@/lib/types/database';

export interface ActionResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Create a new manpower record
 */
export async function createManpowerRecord(data: Insert<'manpower'>): Promise<ActionResult> {
  const { isAdmin } = await checkAdminAccess();

  if (!isAdmin) {
    return { success: false, message: 'Unauthorized: Admin access required' };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('manpower')
      .insert(data);

    if (error) {
      console.error('Error creating manpower record:', error);
      return {
        success: false,
        message: 'Failed to create manpower record',
        error: error.message
      };
    }

    revalidatePath('/manpower');
    revalidatePath('/admin/manpower');
    return { success: true, message: 'Manpower record created successfully' };
  } catch (error) {
    console.error('Unexpected error creating manpower record:', error);
    return {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update an existing manpower record
 */
export async function updateManpowerRecord(
  codeNumber: string,
  data: Update<'manpower'>
): Promise<ActionResult> {
  const { isAdmin } = await checkAdminAccess();

  if (!isAdmin) {
    return { success: false, message: 'Unauthorized: Admin access required' };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('manpower')
      .update(data)
      .eq('code_number', codeNumber);

    if (error) {
      console.error('Error updating manpower record:', error);
      return {
        success: false,
        message: 'Failed to update manpower record',
        error: error.message
      };
    }

    revalidatePath('/manpower');
    revalidatePath('/admin/manpower');
    return { success: true, message: 'Manpower record updated successfully' };
  } catch (error) {
    console.error('Unexpected error updating manpower record:', error);
    return {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Delete a manpower record
 */
export async function deleteManpowerRecord(codeNumber: string): Promise<ActionResult> {
  const { isAdmin } = await checkAdminAccess();

  if (!isAdmin) {
    return { success: false, message: 'Unauthorized: Admin access required' };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('manpower')
      .delete()
      .eq('code_number', codeNumber);

    if (error) {
      console.error('Error deleting manpower record:', error);
      return {
        success: false,
        message: 'Failed to delete manpower record',
        error: error.message
      };
    }

    revalidatePath('/manpower');
    revalidatePath('/admin/manpower');
    return { success: true, message: 'Manpower record deleted successfully' };
  } catch (error) {
    console.error('Unexpected error deleting manpower record:', error);
    return {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get a single manpower record by code number
 */
export async function getManpowerRecord(codeNumber: string): Promise<{
  success: boolean;
  data?: ManpowerRecord;
  message: string;
}> {
  const { isAdmin } = await checkAdminAccess();

  if (!isAdmin) {
    return { success: false, message: 'Unauthorized: Admin access required' };
  }

  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('manpower')
      .select('*')
      .eq('code_number', codeNumber)
      .single();

    if (error) {
      console.error('Error fetching manpower record:', error);
      return {
        success: false,
        message: 'Failed to fetch manpower record'
      };
    }

    return { success: true, data: data as ManpowerRecord, message: 'Record fetched successfully' };
  } catch (error) {
    console.error('Unexpected error fetching manpower record:', error);
    return {
      success: false,
      message: 'An unexpected error occurred'
    };
  }
}