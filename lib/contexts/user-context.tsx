'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { ProfileData } from '@/lib/types/onboarding';

interface UserContextType {
  user: User | null;
  profile: ProfileData | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const fetchUserProfile = async (userId: string, attempt = 1): Promise<void> => {
    const supabase = createClient();

    try {
      // Add timeout to profile fetch
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000);
      });

      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      const { data: profileData, error } = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as any;

      if (!error && profileData) {
        setProfile(profileData);
        setRetryCount(0); // Reset retry count on success
      } else {
        if (attempt < 3) {
          // Retry up to 3 times with exponential backoff
          setTimeout(() => {
            fetchUserProfile(userId, attempt + 1);
          }, attempt * 1000);
        } else {
          setProfile(null);
        }
      }
    } catch (error) {
      if (attempt < 3) {
        setTimeout(() => {
          fetchUserProfile(userId, attempt + 1);
        }, attempt * 1000);
      } else {
        setProfile(null);
      }
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  };

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    // Get initial user with timeout
    const getInitialUser = async () => {
      try {

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Auth check timeout')), 5000);
        });

        const authPromise = supabase.auth.getUser();

        const { data: { user: currentUser }, error } = await Promise.race([
          authPromise,
          timeoutPromise
        ]) as any;

        if (!isMounted) return;

        if (error) {
          setIsLoading(false);
          return;
        }

        if (currentUser) {
          setUser(currentUser);
          await fetchUserProfile(currentUser.id);
        }
      } catch (error) {
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    getInitialUser();

    // Single auth state listener for the entire app
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        setUser(session.user);
        await fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider value={{
      user,
      profile,
      isLoading,
      refreshProfile
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);

  if (!context) {
    // Instead of throwing, return safe defaults
    return {
      user: null,
      profile: null,
      isLoading: false,
      refreshProfile: async () => {}
    };
  }

  return context;
}