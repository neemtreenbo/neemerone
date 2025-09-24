'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkAdminAccess, getCurrentUserProfile } from '@/lib/auth';

/**
 * Handle authentication for regular manpower page
 * Redirects admins to admin manpower page
 */
export async function authenticateRegularManpower(): Promise<void> {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: user, error: authError } = await supabase.auth.getClaims();
    if (authError) {
      console.error('Manpower auth error:', authError);
      redirect('/auth/error');
    }

    if (!user?.claims) {
      redirect('/auth/login');
    }

    // Smart routing: If user is admin, redirect to admin manpower page
    const { profile } = await getCurrentUserProfile();
    if (profile?.app_role === 'admin') {
      redirect('/admin/manpower');
    }
  } catch (error) {
    console.error('Regular manpower auth error:', error);
    redirect('/auth/error');
  }
}

/**
 * Handle authentication for admin manpower page
 * Ensures user has admin access
 */
export async function authenticateAdminManpower(): Promise<void> {
  try {
    // Check admin access
    const { isAdmin } = await checkAdminAccess();
    if (!isAdmin) {
      redirect('/auth/login');
    }
  } catch (error) {
    console.error('Admin manpower auth error:', error);
    redirect('/auth/error');
  }
}