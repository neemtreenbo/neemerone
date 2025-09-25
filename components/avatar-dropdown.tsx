'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Users,
  FileText,
  ClipboardList,
  TrendingUp,
  Award,
  GraduationCap,
  GitBranch,
  Calendar,
  Settings,
  LogOut,
  User
} from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { useUser } from '@/lib/contexts/user-context';
import { NavMenuItemComponent, NavMenuItem } from '@/components/nav-menu-item';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

interface AvatarDropdownProps {
  className?: string;
}

export function AvatarDropdown({ className = '' }: AvatarDropdownProps) {
  const { user, profile, isLoading } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  // Navigation menu structure
  const navigationItems: NavMenuItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: BarChart3,
    },
    {
      label: 'Manpower',
      href: '/manpower',
      icon: Users,
    },
    {
      label: 'New Business',
      href: '/new-business',
      icon: FileText,
    },
    {
      label: 'Application Registry',
      href: '/application-registry',
      icon: ClipboardList,
    },
    {
      label: 'Production',
      icon: TrendingUp,
      children: [
        {
          label: 'Annual Production',
          href: '/production/annual-production',
        },
        {
          label: 'Contest Month',
          href: '/production/contest-month',
        },
        {
          label: 'Monthly Production',
          href: '/production/monthly-production',
        },
      ],
    },
    {
      label: 'Bonus',
      icon: Award,
      children: [
        {
          label: 'Plan B',
          href: '/bonus/plan-b',
        },
        {
          label: 'EAMB',
          href: '/bonus/eamb',
        },
        {
          label: 'QGB',
          href: '/bonus/qgb',
        },
        {
          label: 'Override',
          href: '/bonus/override',
        },
      ],
    },
    {
      label: 'Learning',
      icon: GraduationCap,
      children: [
        {
          label: 'Videos',
          href: '/learning/videos',
        },
        {
          label: 'Repository',
          href: '/learning/repository',
        },
      ],
    },
    {
      label: 'Pipeline',
      href: '/pipeline',
      icon: GitBranch,
    },
    {
      label: 'Calendar',
      href: '/calendar',
      icon: Calendar,
    },
  ];

  // Admin-specific navigation items (future admin features can be added here)
  const adminItems: NavMenuItem[] = profile?.app_role === 'admin' ? [
    // Note: Manpower management is now handled via the main "Manpower" navigation
    // Future admin-only features can be added here as needed
  ] : [];

  // Combine navigation items
  const allNavigationItems = [...navigationItems, ...adminItems];

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
          className={`relative h-auto p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 ${className}`}
        >
          <UserAvatar
            size="md"
            showOnlineIndicator={true}
            className="cursor-pointer"
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-80 mr-4"
        align="end"
        side="bottom"
        sideOffset={8}
      >
        {/* User Info Header */}
        <div className="flex items-center space-x-3 p-3 border-b">
          <UserAvatar size="lg" showOnlineIndicator={true} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">
              {displayName}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {userEmail}
            </div>
            <div className="text-xs text-muted-foreground capitalize">
              {userRole}
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="py-2">
          <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Navigation
          </DropdownMenuLabel>

          {allNavigationItems.map((item, index) => (
            <NavMenuItemComponent
              key={`${item.label}-${index}`}
              item={item}
              onItemClick={handleItemClick}
            />
          ))}
        </div>

        <DropdownMenuSeparator />

        {/* Profile Settings */}
        <DropdownMenuItem
          className="flex items-center space-x-2 px-2 py-1.5 cursor-pointer"
          onClick={() => {
            handleItemClick();
            // Future: Navigate to profile settings page
            console.log('Navigate to profile settings');
          }}
        >
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">Profile Settings</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="flex items-center space-x-2 px-2 py-1.5 cursor-pointer"
          onClick={() => {
            handleItemClick();
            // Future: Navigate to app settings
            console.log('Navigate to app settings');
          }}
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">App Settings</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Logout */}
        <DropdownMenuItem
          className="flex items-center space-x-2 px-2 py-1.5 cursor-pointer text-red-600 focus:text-red-600"
          onClick={() => {
            handleItemClick();
            handleLogout();
          }}
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}