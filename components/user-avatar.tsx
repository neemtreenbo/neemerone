'use client';

import { useUser } from '@/lib/contexts/user-context';

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
  const { user, profile, isLoading } = useUser();

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

  // Always ensure we have a display name for fallback
  const getDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  const displayName = getDisplayName();

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

  // Loading state - but still clickable
  if (isLoading) {
    return (
      <div className={`relative inline-block ${className}`}>
        <div className={`${sizeClasses[size]} relative`}>
          <div className={`${sizeClasses[size]} rounded-full bg-gray-300 animate-pulse flex items-center justify-center text-sm border-2 border-white shadow-sm`}>
            <div className="w-2/3 h-2/3 bg-gray-400 rounded-full" />
          </div>
          {showOnlineIndicator && (
            <div className={`absolute ${indicatorClasses[size]} bg-gray-400 rounded-full border-2 border-white`} />
          )}
        </div>
      </div>
    );
  }

  // No user state - show default but still functional
  if (!user) {
    return (
      <div className={`relative inline-block ${className}`}>
        <div className={`${sizeClasses[size]} relative`}>
          <div className={`${sizeClasses[size]} rounded-full bg-gray-500 text-white font-medium flex items-center justify-center text-sm border-2 border-white shadow-sm`}>
            <svg className="w-2/3 h-2/3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          {showOnlineIndicator && (
            <div className={`absolute ${indicatorClasses[size]} bg-red-500 rounded-full border-2 border-white`} />
          )}
        </div>
      </div>
    );
  }

  // Use the display name and initials we calculated above

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