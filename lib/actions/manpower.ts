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
export async function createManpowerRecord(
  data: Insert<'manpower'>,
  formData?: FormData
): Promise<ActionResult> {
  const { isAdmin } = await checkAdminAccess();

  if (!isAdmin) {
    return { success: false, message: 'Unauthorized: Admin access required' };
  }

  const supabase = await createClient();

  try {
    const finalData = { ...data };

    // Handle photo upload if provided
    if (formData) {
      const photoFile = formData.get('photoFile') as File | null;
      if (photoFile && photoFile.size > 0) {
        // Validate file
        if (photoFile.size > 5 * 1024 * 1024) {
          return { success: false, message: 'Photo file size must be less than 5MB' };
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(photoFile.type)) {
          return { success: false, message: 'Photo must be a valid image file (JPG, PNG, WebP)' };
        }

        try {
          const fileExt = photoFile.name.split('.').pop()?.toLowerCase() || 'jpg';
          const fileName = `${data.code_number}-${Date.now()}.${fileExt}`;

          // Create a buffer from the file
          const arrayBuffer = await photoFile.arrayBuffer();
          const buffer = new Uint8Array(arrayBuffer);

          // Upload to Supabase Storage - manpower-photos bucket
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('manpower-photos')
            .upload(fileName, buffer, {
              contentType: photoFile.type,
              upsert: false,
            });

          if (uploadError) {
            console.error('Photo upload error:', uploadError);
            return { success: false, message: `Failed to upload photo: ${uploadError.message}` };
          }

          if (uploadData) {
            // Get public URL
            const { data: publicUrlData } = supabase.storage
              .from('manpower-photos')
              .getPublicUrl(uploadData.path);

            finalData.photo_url = publicUrlData.publicUrl;
          }
        } catch (uploadError) {
          console.error('Photo processing error:', uploadError);
          return { success: false, message: 'Failed to process photo. Please try again.' };
        }
      }
    }

    const { error } = await supabase
      .from('manpower')
      .insert(finalData);

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
  data: Update<'manpower'>,
  formData?: FormData
): Promise<ActionResult> {
  const { isAdmin } = await checkAdminAccess();

  if (!isAdmin) {
    return { success: false, message: 'Unauthorized: Admin access required' };
  }

  const supabase = await createClient();

  try {
    const finalData = { ...data };

    // Handle photo upload if provided
    if (formData) {
      const photoFile = formData.get('photoFile') as File | null;
      if (photoFile && photoFile.size > 0) {
        // Validate file
        if (photoFile.size > 5 * 1024 * 1024) {
          return { success: false, message: 'Photo file size must be less than 5MB' };
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(photoFile.type)) {
          return { success: false, message: 'Photo must be a valid image file (JPG, PNG, WebP)' };
        }

        try {
          // Get existing record to potentially remove old photo
          const { data: existingRecord } = await supabase
            .from('manpower')
            .select('photo_url')
            .eq('code_number', codeNumber)
            .single();

          const fileExt = photoFile.name.split('.').pop()?.toLowerCase() || 'jpg';
          const fileName = `${codeNumber}-${Date.now()}.${fileExt}`;

          // Create a buffer from the file
          const arrayBuffer = await photoFile.arrayBuffer();
          const buffer = new Uint8Array(arrayBuffer);

          // Upload to Supabase Storage - manpower-photos bucket
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('manpower-photos')
            .upload(fileName, buffer, {
              contentType: photoFile.type,
              upsert: false,
            });

          if (uploadError) {
            console.error('Photo upload error:', uploadError);
            return { success: false, message: `Failed to upload photo: ${uploadError.message}` };
          }

          if (uploadData) {
            // Get public URL
            const { data: publicUrlData } = supabase.storage
              .from('manpower-photos')
              .getPublicUrl(uploadData.path);

            finalData.photo_url = publicUrlData.publicUrl;

            // Remove old photo if it exists and is a storage URL
            if (existingRecord?.photo_url && existingRecord.photo_url.includes('manpower-photos')) {
              const oldPath = existingRecord.photo_url.split('/manpower-photos/')[1];
              if (oldPath) {
                await supabase.storage
                  .from('manpower-photos')
                  .remove([oldPath]);
              }
            }
          }
        } catch (uploadError) {
          console.error('Photo processing error:', uploadError);
          return { success: false, message: 'Failed to process photo. Please try again.' };
        }
      }
    }

    const { error } = await supabase
      .from('manpower')
      .update(finalData)
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

/**
 * Delete a photo from storage
 */
export async function deleteManpowerPhoto(photoUrl: string): Promise<ActionResult> {
  const { isAdmin } = await checkAdminAccess();

  if (!isAdmin) {
    return { success: false, message: 'Unauthorized: Admin access required' };
  }

  const supabase = await createClient();

  try {
    // Extract the file path from the URL
    if (photoUrl.includes('manpower-photos')) {
      const path = photoUrl.split('/manpower-photos/')[1];
      if (path) {
        const { error } = await supabase.storage
          .from('manpower-photos')
          .remove([path]);

        if (error) {
          console.error('Error deleting photo:', error);
          return { success: false, message: 'Failed to delete photo from storage' };
        }
      }
    }

    return { success: true, message: 'Photo deleted successfully' };
  } catch (error) {
    console.error('Unexpected error deleting photo:', error);
    return { success: false, message: 'An unexpected error occurred' };
  }
}