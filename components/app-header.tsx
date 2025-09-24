'use client';

import Link from 'next/link';
import { AvatarDropdown } from '@/components/avatar-dropdown';

interface AppHeaderProps {
  className?: string;
}

export function AppHeader({ className = '' }: AppHeaderProps) {
  return (
    <header
      className={`sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between h-16 px-4 mx-auto max-w-screen-2xl">
        {/* Left Section - Logo & Branding */}
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard"
            className="flex items-center space-x-3 hover:opacity-90 transition-opacity"
          >
            {/* Logo */}
            <div className="h-10 w-auto">
              {/* Light mode logo */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://ekfwqainoexczvpuzlgr.supabase.co/storage/v1/object/public/Website/Logo/2023_NEEMNBO_LOGO_WEB_COLOUR.png"
                alt="Neem Tree Logo"
                className="h-10 w-auto dark:hidden"
              />
              {/* Dark mode logo */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://ekfwqainoexczvpuzlgr.supabase.co/storage/v1/object/public/Website/Logo/2023_NEEMNBO_LOGO_WEB_WHITE.png"
                alt="Neem Tree Logo"
                className="h-10 w-auto hidden dark:block"
              />
            </div>

            {/* Brand Text (hidden on smaller screens to give more space to logo) */}
            <div className="hidden lg:block">
              <div className="font-bold text-gray-900 dark:text-white text-sm leading-tight">
                New Business Office
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300 leading-tight">
                Sun Life Philippines
              </div>
            </div>
          </Link>
        </div>

        {/* Center Section - Search (Future Implementation) */}
        <div className="flex-1 max-w-2xl mx-8 hidden lg:block">
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg
                className="w-4 h-4 text-gray-400 dark:text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search advisors, reports, or documents..."
              className="w-full h-10 pl-10 pr-4 text-sm border border-gray-300 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:bg-white dark:focus:bg-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              disabled
            />
          </div>
        </div>

        {/* Right Section - User Actions */}
        <div className="flex items-center space-x-3">
          {/* Mobile Search Icon */}
          <button
            className="lg:hidden p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            disabled
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>

          {/* Notifications Icon (Future Implementation) */}
          <button
            className="relative p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            disabled
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-5-5V9a6 6 0 10-12 0v3l-5 5h5m0 0v1a3 3 0 006 0v-1m-6 0h6"
              />
            </svg>
            {/* Notification badge (hidden for now) */}
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium hidden">
              3
            </div>
          </button>

          {/* Messages Icon (Future Implementation) */}
          <button
            className="relative p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            disabled
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            {/* Message badge (hidden for now) */}
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-medium hidden">
              2
            </div>
          </button>

          {/* Avatar Dropdown */}
          <AvatarDropdown />
        </div>
      </div>

      {/* Mobile Brand (shown when space is limited) */}
      <div className="lg:hidden border-t border-gray-100 dark:border-gray-700 px-4 py-2 bg-gray-50 dark:bg-gray-800">
        <div className="text-xs text-gray-600 dark:text-gray-300 text-center">
          <span className="font-medium text-gray-900 dark:text-white">New Business Office</span> • Sun Life Philippines
        </div>
      </div>
    </header>
  );
}