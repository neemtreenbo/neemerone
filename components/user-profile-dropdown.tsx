'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  LogOut,
  User
} from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { useUser } from '@/lib/contexts/user-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

interface UserProfileDropdownProps {
  className?: string;
  variant?: 'default' | 'sidebar-expanded' | 'sidebar-collapsed';
}

export function UserProfileDropdown({ className = '', variant = 'default' }: UserProfileDropdownProps) {
  const { user, profile, isLoading } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleItemClick = () => {
    setIsOpen(false);
  };

  // Get display information
  const displayName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : user?.email?.split('@')[0] || 'User';

  const userRole = profile?.app_role || 'User';
  const userEmail = user?.email || '';

  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
      </div>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={`relative h-auto transition-colors ${
            variant === 'sidebar-collapsed'
              ? 'p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800'
              : variant === 'sidebar-expanded'
              ? 'p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 w-full'
              : 'p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800'
          } ${className}`}
        >
          {variant === 'sidebar-expanded' ? (
            <div className="flex items-center space-x-3 w-full">
              <UserAvatar
                size="md"
                showOnlineIndicator={true}
                className="cursor-pointer flex-shrink-0"
              />
              <div className="flex-1 text-left overflow-hidden">
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {displayName}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate capitalize">
                  {userRole}
                </div>
              </div>
            </div>
          ) : (
            <UserAvatar
              size="md"
              showOnlineIndicator={true}
              className="cursor-pointer"
            />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-72 mr-4"
        align="end"
        side="bottom"
        sideOffset={8}
      >
        {/* User Info Header */}
        <div className="flex items-center space-x-3 p-4">
          <UserAvatar size="lg" showOnlineIndicator={true} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-base truncate text-gray-900 dark:text-white">
              {displayName}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {userEmail}
            </div>
            <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 capitalize mt-1">
              {userRole}
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Profile Settings */}
        <DropdownMenuItem
          className="flex items-center space-x-3 px-4 py-3 cursor-pointer transition-colors"
          onClick={() => {
            handleItemClick();
            // Future: Navigate to profile settings page
            console.log('Navigate to profile settings');
          }}
        >
          <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              Profile Settings
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Manage your account information
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="flex items-center space-x-3 px-4 py-3 cursor-pointer transition-colors"
          onClick={() => {
            handleItemClick();
            // Future: Navigate to app settings
            console.log('Navigate to app settings');
          }}
        >
          <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              App Settings
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Preferences and notifications
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Logout */}
        <DropdownMenuItem
          className="flex items-center space-x-3 px-4 py-3 cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/50 transition-colors"
          onClick={() => {
            handleItemClick();
            handleLogout();
          }}
        >
          <LogOut className="w-4 h-4" />
          <div>
            <div className="text-sm font-medium">
              Sign Out
            </div>
            <div className="text-xs opacity-75">
              Sign out of your account
            </div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}