import { createClient } from '@/lib/supabase/server';

/**
 * Check if the current user is authenticated and has admin role
 * @returns Promise<{isAdmin: boolean, userId: string | null}>
 */
export async function checkAdminAccess(): Promise<{
  isAdmin: boolean;
  userId: string | null;
}> {
  const supabase = await createClient();

  // Check if user is authenticated
  const { data: user, error } = await supabase.auth.getClaims();
  if (error || !user?.claims) {
    return { isAdmin: false, userId: null };
  }

  try {
    // Get user profile to check app_role
    const { data: profile } = await supabase
      .from('profiles')
      .select('app_role')
      .eq('user_id', user.claims.sub)
      .single();

    const isAdmin = profile?.app_role === 'admin';
    return { isAdmin, userId: user.claims.sub };
  } catch {
    return { isAdmin: false, userId: user.claims.sub };
  }
}

/**
 * Get current user's profile including app_role
 * @returns Promise<{profile: any | null, userId: string | null}>
 */
export async function getCurrentUserProfile() {
  const supabase = await createClient();

  // Check if user is authenticated
  const { data: user, error } = await supabase.auth.getClaims();
  if (error || !user?.claims) {
    return { profile: null, userId: null };
  }

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.claims.sub)
      .single();

    return { profile, userId: user.claims.sub };
  } catch {
    return { profile: null, userId: user.claims.sub };
  }
}