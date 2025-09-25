import { AppRole } from './database';

export interface OnboardingFormData {
  firstName: string;
  lastName: string;
  avatarFile?: File;
}

export interface AvatarEditOptions {
  zoom: number;
  position: { x: number; y: number };
  cropArea: { width: number; height: number; x: number; y: number };
}

export interface ProfileData {
  user_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  app_role?: AppRole;
  photo_url?: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface OnboardingFormState {
  isSubmitting: boolean;
  error: string | null;
  success: boolean;
}

export interface AvatarUploadState {
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  previewUrl?: string;
}