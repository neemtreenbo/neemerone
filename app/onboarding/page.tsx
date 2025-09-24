import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingForm } from '@/components/onboarding-form';
import { completeOnboarding, checkOnboardingStatus } from '@/lib/actions/onboarding';

export default async function OnboardingPage() {
  const supabase = await createClient();

  // Check if user is authenticated
  const { data: user, error } = await supabase.auth.getClaims();
  if (error || !user?.claims) {
    redirect('/auth/login');
  }

  // Check onboarding status
  const { completed } = await checkOnboardingStatus();
  if (completed) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
            Welcome to Neem Tree
          </h1>
          <p className="text-lg text-muted-foreground">
            Sun Life of Canada Philippines - New Business Office
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Your advisor performance monitoring portal
          </p>
        </div>

        <OnboardingForm onSubmit={completeOnboarding} />

        <div className="text-center mt-8">
          <p className="text-xs text-muted-foreground">
            Need help? Contact your system administrator
          </p>
        </div>
      </div>
    </div>
  );
}