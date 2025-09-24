'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { ProfileData } from '@/lib/types/onboarding';

interface UserAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  showOnlineIndicator?: boolean;
  className?: string;
}

export function UserAvatar({
  size = 'md',
  showOnlineIndicator = false,
  className = ''
}: UserAvatarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const indicatorClasses = {
    sm: 'w-2 h-2 bottom-0 right-0',
    md: 'w-2.5 h-2.5 bottom-0 right-0',
    lg: 'w-3 h-3 bottom-0.5 right-0.5'
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const supabase = createClient();

      try {
        // Get current user
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        if (currentUser) {
          setUser(currentUser);

          // Get profile data
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

          if (!error && profileData) {
            setProfile(profileData);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();

    // Listen for auth state changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className={`${sizeClasses[size]} ${className} animate-pulse bg-gray-200 rounded-full flex items-center justify-center`}>
        <div className="w-2/3 h-2/3 bg-gray-300 rounded-full" />
      </div>
    );
  }

  // No user state
  if (!user) {
    return (
      <div className={`${sizeClasses[size]} ${className} bg-gray-100 rounded-full flex items-center justify-center`}>
        <svg className="w-2/3 h-2/3 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </div>
    );
  }

  // Get display name
  const displayName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : user.email?.split('@')[0] || 'User';

  // Get initials for fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const initials = getInitials(displayName);

  return (
    <div className={`relative inline-block ${className}`}>
      <div className={`${sizeClasses[size]} relative`}>
        {profile?.photo_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profile.photo_url}
              alt={`${displayName}'s avatar`}
              className={`${sizeClasses[size]} rounded-full object-cover border-2 border-white shadow-sm`}
              onError={(e) => {
                // Fallback to initials if image fails to load
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const fallback = parent.querySelector('.fallback-avatar');
                  if (fallback) {
                    (fallback as HTMLElement).style.display = 'flex';
                  }
                }
              }}
            />
            {/* Fallback avatar (hidden by default) */}
            <div className={`fallback-avatar ${sizeClasses[size]} rounded-full bg-blue-600 text-white font-medium hidden items-center justify-center text-sm border-2 border-white shadow-sm absolute inset-0`}>
              {initials}
            </div>
          </>
        ) : (
          /* Default initials avatar */
          <div className={`${sizeClasses[size]} rounded-full bg-blue-600 text-white font-medium flex items-center justify-center text-sm border-2 border-white shadow-sm`}>
            {initials}
          </div>
        )}

        {/* Online indicator */}
        {showOnlineIndicator && (
          <div className={`absolute ${indicatorClasses[size]} bg-green-500 rounded-full border-2 border-white`} />
        )}
      </div>
    </div>
  );
}

// Hook to get user data for other components
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      const supabase = createClient();

      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        if (currentUser) {
          setUser(currentUser);

          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

          if (!error && profileData) {
            setProfile(profileData);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, profile, isLoading };
}