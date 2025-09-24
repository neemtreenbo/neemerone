'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logAvatarDebug, validateAvatarFile } from '@/lib/utils/debug-avatar';

export async function completeOnboarding(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: user, error: authError } = await supabase.auth.getClaims();
    if (authError || !user?.claims?.sub) {
      return { success: false, error: 'Authentication required' };
    }

    const userId = user.claims.sub;

    // Extract data from FormData
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const avatarFile = formData.get('avatarFile') as File | null;

    // Validate input
    if (!firstName?.trim() || !lastName?.trim()) {
      return { success: false, error: 'First name and last name are required' };
    }

    if (firstName.trim().length > 100 || lastName.trim().length > 100) {
      return { success: false, error: 'Names must be less than 100 characters' };
    }

    let photoUrl: string | null = null;

    // Handle avatar upload if provided
    if (avatarFile && avatarFile.size > 0) {
      logAvatarDebug('Avatar file received', {
        name: avatarFile.name,
        type: avatarFile.type,
        size: avatarFile.size
      });

      try {
        // Validate file
        const validation = validateAvatarFile(avatarFile);
        if (!validation.valid) {
          logAvatarDebug('Avatar validation failed', validation);
          return { success: false, error: validation.error! };
        }

        const fileExt = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${userId}-${Date.now()}.${fileExt}`;

        logAvatarDebug('Starting upload', { fileName, type: avatarFile.type, size: avatarFile.size });

        // Create a buffer from the file
        const arrayBuffer = await avatarFile.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        logAvatarDebug('File processed to buffer', { bufferLength: buffer.length });

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, buffer, {
            contentType: avatarFile.type,
            upsert: false,
          });

        if (uploadError) {
          logAvatarDebug('Upload failed', uploadError);
          return { success: false, error: `Failed to upload avatar: ${uploadError.message}` };
        } else if (uploadData) {
          logAvatarDebug('Upload successful', uploadData);

          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(uploadData.path);

          photoUrl = publicUrlData.publicUrl;
          logAvatarDebug('Generated public URL', { publicUrl: photoUrl });
        }
      } catch (uploadError) {
        console.error('Avatar processing error:', uploadError);
        return { success: false, error: 'Failed to process avatar image. Please try again.' };
      }
    }

    // Update profile with onboarding data
    const profileData = {
      user_id: userId,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      photo_url: photoUrl,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    };

    logAvatarDebug('Updating profile', profileData);

    const { error: updateError } = await supabase
      .from('profiles')
      .upsert(profileData, {
        onConflict: 'user_id'
      });

    if (updateError) {
      logAvatarDebug('Profile update failed', updateError);

      // If we uploaded an avatar but failed to update profile, clean up
      if (photoUrl) {
        try {
          const fileName = photoUrl.split('/').pop();
          if (fileName) {
            await supabase.storage.from('avatars').remove([fileName]);
          }
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
      }

      return {
        success: false,
        error: 'Failed to save profile information. Please try again.'
      };
    }

    // Revalidate relevant paths
    revalidatePath('/dashboard');
    revalidatePath('/onboarding');

    return { success: true };

  } catch (error) {
    console.error('Onboarding completion error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.'
    };
  }
}

export async function getProfile(userId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Profile fetch error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Get profile error:', error);
    return null;
  }
}

export async function checkOnboardingStatus(): Promise<{
  completed: boolean;
  profile: unknown | null;
}> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: user, error: authError } = await supabase.auth.getClaims();
    if (authError || !user?.claims?.sub) {
      return { completed: false, profile: null };
    }

    const userId = user.claims.sub;
    const profile = await getProfile(userId);

    return {
      completed: profile?.onboarding_completed || false,
      profile,
    };
  } catch (error) {
    console.error('Onboarding status check error:', error);
    return { completed: false, profile: null };
  }
}