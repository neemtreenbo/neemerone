'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Handle authentication for manpower page
 * Ensures user is authenticated (works for both admin and regular users)
 */
export async function authenticateManpower(): Promise<void> {
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
  } catch (error) {
    console.error('Manpower auth error:', error);
    redirect('/auth/error');
  }
}