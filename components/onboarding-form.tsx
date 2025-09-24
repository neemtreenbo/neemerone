'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AvatarUpload } from '@/components/avatar-upload';
import { OnboardingFormData, OnboardingFormState } from '@/lib/types/onboarding';
import { Loader2, CheckCircle } from 'lucide-react';

interface OnboardingFormProps {
  onSubmit: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
}

export function OnboardingForm({ onSubmit }: OnboardingFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<OnboardingFormData>({
    firstName: '',
    lastName: '',
  });
  const [formState, setFormState] = useState<OnboardingFormState>({
    isSubmitting: false,
    error: null,
    success: false,
  });
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string;
    lastName?: string;
  }>({});

  const validateField = (name: keyof OnboardingFormData, value: string): string | undefined => {
    switch (name) {
      case 'firstName':
        if (!value.trim()) return 'First name is required';
        if (value.trim().length > 100) return 'First name must be less than 100 characters';
        if (value.trim().length < 1) return 'First name must be at least 1 character';
        break;
      case 'lastName':
        if (!value.trim()) return 'Last name is required';
        if (value.trim().length > 100) return 'Last name must be less than 100 characters';
        if (value.trim().length < 1) return 'Last name must be at least 1 character';
        break;
    }
    return undefined;
  };

  const handleInputChange = (name: keyof OnboardingFormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear field error when user starts typing
    if (fieldErrors[name as keyof typeof fieldErrors]) {
      setFieldErrors(prev => ({ ...prev, [name]: undefined }));
    }

    // Clear form error
    if (formState.error) {
      setFormState(prev => ({ ...prev, error: null }));
    }
  };

  const handleInputBlur = (name: keyof OnboardingFormData, value: string) => {
    const error = validateField(name, value);
    if (error) {
      setFieldErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleFileSelect = (file: File | null) => {
    setFormData(prev => ({ ...prev, avatarFile: file || undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const errors: typeof fieldErrors = {};
    errors.firstName = validateField('firstName', formData.firstName);
    errors.lastName = validateField('lastName', formData.lastName);

    // Remove undefined errors
    Object.keys(errors).forEach(key => {
      if (errors[key as keyof typeof errors] === undefined) {
        delete errors[key as keyof typeof errors];
      }
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFormState(prev => ({ ...prev, isSubmitting: true, error: null }));

    try {
      // Create FormData object
      const submitData = new FormData();
      submitData.append('firstName', formData.firstName.trim());
      submitData.append('lastName', formData.lastName.trim());

      if (formData.avatarFile) {
        submitData.append('avatarFile', formData.avatarFile);
      }

      const result = await onSubmit(submitData);

      if (result.success) {
        setFormState(prev => ({ ...prev, success: true, isSubmitting: false }));

        // Redirect to dashboard after a brief success message
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        setFormState(prev => ({
          ...prev,
          error: result.error || 'Something went wrong. Please try again.',
          isSubmitting: false,
        }));
      }
    } catch {
      setFormState(prev => ({
        ...prev,
        error: 'Network error. Please check your connection and try again.',
        isSubmitting: false,
      }));
    }
  };

  if (formState.success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <div>
              <h2 className="text-xl font-semibold text-green-900">Welcome aboard!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Taking you to your dashboard...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
        <CardDescription>
          Let&apos;s get to know you better. Please provide your basic information to get started.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <AvatarUpload
            onFileSelect={handleFileSelect}
            className="mb-6"
          />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                onBlur={(e) => handleInputBlur('firstName', e.target.value)}
                placeholder="Enter your first name"
                aria-invalid={!!fieldErrors.firstName}
                aria-describedby={fieldErrors.firstName ? 'firstName-error' : undefined}
                disabled={formState.isSubmitting}
                className={fieldErrors.firstName ? 'border-destructive' : ''}
              />
              {fieldErrors.firstName && (
                <p id="firstName-error" className="text-sm text-destructive">
                  {fieldErrors.firstName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                onBlur={(e) => handleInputBlur('lastName', e.target.value)}
                placeholder="Enter your last name"
                aria-invalid={!!fieldErrors.lastName}
                aria-describedby={fieldErrors.lastName ? 'lastName-error' : undefined}
                disabled={formState.isSubmitting}
                className={fieldErrors.lastName ? 'border-destructive' : ''}
              />
              {fieldErrors.lastName && (
                <p id="lastName-error" className="text-sm text-destructive">
                  {fieldErrors.lastName}
                </p>
              )}
            </div>
          </div>

          {formState.error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{formState.error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={formState.isSubmitting}
          >
            {formState.isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Setting up your profile...
              </>
            ) : (
              'Complete Setup'
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            By completing setup, you&apos;ll have access to the Neem Tree performance monitoring portal.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}