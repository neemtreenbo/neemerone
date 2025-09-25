'use client';

import { useState, useMemo, memo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Users,
  FileText,
  TrendingUp,
  Award,
  GraduationCap,
  GitBranch,
  Calendar,
  Upload,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/sidebar-context';
import { useUser } from '@/lib/contexts/user-context';

export interface SidebarNavItem {
  label: string;
  href?: string;
  icon: LucideIcon;
  children?: Omit<SidebarNavItem, 'icon'>[];
}

interface SidebarNavigationProps {
  className?: string;
}

export function SidebarNavigation({ className = '' }: SidebarNavigationProps) {
  const pathname = usePathname();
  const { isCollapsed, isMobileOpen, setIsCollapsed, setIsMobileOpen } = useSidebar();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const { profile } = useUser();

  // Navigation menu structure - memoized to prevent unnecessary re-renders
  const navigationItems: SidebarNavItem[] = useMemo(() => {
    const baseItems: SidebarNavItem[] = [
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
        icon: FileText,
        children: [
          {
            label: 'Application Registry',
            href: '/application-registry',
          },
          {
            label: 'Policy Registry',
            href: '/policy-registry',
          },
        ],
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
            label: 'Eamb',
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

    // Add admin-only items conditionally
    if (profile?.app_role === 'admin') {
      baseItems.push({
        label: 'Upload',
        href: '/upload',
        icon: Upload,
      });
    }

    return baseItems;
  }, [profile?.app_role]); // Only recalculate when role changes

  const toggleExpanded = (itemLabel: string) => {
    setExpandedItems(prev =>
      prev.includes(itemLabel)
        ? prev.filter(item => item !== itemLabel)
        : [...prev, itemLabel]
    );
  };

  const isExpanded = (itemLabel: string) => expandedItems.includes(itemLabel);
  const isActive = (href?: string) => href ? pathname === href : false;
  const isChildActive = (children?: Omit<SidebarNavItem, 'icon'>[]) =>
    children?.some(child => child.href && pathname === child.href) || false;

  const NavItem = memo(function NavItem({ item }: { item: SidebarNavItem }) {
    const hasChildren = item.children && item.children.length > 0;
    const expanded = isExpanded(item.label);
    const active = isActive(item.href);
    const childActive = isChildActive(item.children);

    if (hasChildren) {
      return (
        <div className="space-y-1">
          <button
            onClick={() => toggleExpanded(item.label)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group relative",
              childActive
                ? "bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm border border-blue-200/50 dark:border-blue-800/50"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            <div className="flex items-center space-x-3">
              <item.icon className={cn(
                "w-5 h-5 transition-colors flex-shrink-0",
                childActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300"
              )} />
              {(!isCollapsed || isMobileOpen) && <span className="truncate">{item.label}</span>}
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform duration-200 flex-shrink-0",
                expanded ? "rotate-180" : "rotate-0"
              )} />
            )}
          </button>

          {(!isCollapsed || isMobileOpen) && expanded && (
            <div className="ml-8 space-y-1 border-l-2 border-gray-100 dark:border-gray-800 pl-4">
              {item.children?.map((child) => (
                <Link
                  key={child.label}
                  href={child.href || '#'}
                  className={cn(
                    "block px-3 py-2.5 text-sm rounded-lg transition-all duration-200 relative group",
                    isActive(child.href)
                      ? "bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 text-blue-700 dark:text-blue-300 font-medium shadow-sm border border-blue-200/50 dark:border-blue-800/50"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white"
                  )}
                  onClick={() => {
                    if (isMobileOpen) setIsMobileOpen(false);
                  }}
                >
                  <span className="truncate">{child.label}</span>
                  {isActive(child.href) && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full" />
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        href={item.href || '#'}
        className={cn(
          "flex items-center space-x-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group relative",
          active
            ? "bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm border border-blue-200/50 dark:border-blue-800/50"
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white"
        )}
        onClick={() => {
          if (isMobileOpen) setIsMobileOpen(false);
        }}
      >
        <item.icon className={cn(
          "w-5 h-5 transition-colors flex-shrink-0",
          active ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300"
        )} />
        {(!isCollapsed || isMobileOpen) && <span className="truncate">{item.label}</span>}
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full" />
        )}
      </Link>
    );
  });

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out shadow-lg lg:shadow-none",
        // Desktop behavior
        "hidden lg:block",
        isCollapsed ? "lg:w-16" : "lg:w-64",
        // Mobile behavior
        isMobileOpen && "block w-64",
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          {(!isCollapsed || isMobileOpen) ? (
            <div className="flex items-center space-x-3">
              <div className="h-8 w-auto flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={process.env.NEXT_PUBLIC_LOGO_LIGHT_URL}
                  alt="Neem Tree Logo"
                  className="h-8 w-auto dark:hidden"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={process.env.NEXT_PUBLIC_LOGO_DARK_URL}
                  alt="Neem Tree Logo"
                  className="h-8 w-auto hidden dark:block"
                />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  Neem Tree
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  New Business Office
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full">
              <div className="h-8 w-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={process.env.NEXT_PUBLIC_LOGO_LIGHT_URL}
                  alt="Neem Tree Logo"
                  className="h-8 w-auto dark:hidden"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={process.env.NEXT_PUBLIC_LOGO_DARK_URL}
                  alt="Neem Tree Logo"
                  className="h-8 w-auto hidden dark:block"
                />
              </div>
            </div>
          )}
          {/* Desktop collapse button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:block p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            {isCollapsed ? <Menu className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {/* Mobile close button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {navigationItems.map((item) => (
            <NavItem key={item.label} item={item} />
          ))}
        </nav>

        {/* Footer */}
        {(!isCollapsed || isMobileOpen) && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center font-medium">
              Sun Life Philippines
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 text-center mt-0.5">
              New Business Office
            </div>
          </div>
        )}
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}