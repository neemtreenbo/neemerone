'use client';

import { usePathname } from 'next/navigation';
import { AppHeader } from '@/components/app-header';

interface HeaderWrapperProps {
  children: React.ReactNode;
}

export function HeaderWrapper({ children }: HeaderWrapperProps) {
  const pathname = usePathname();

  // Define routes where header should NOT be shown
  const excludeHeaderRoutes = [
    '/auth',
    '/onboarding',
    '/',  // Landing page
  ];

  // Check if current path should exclude header
  const shouldShowHeader = !excludeHeaderRoutes.some(route => {
    if (route === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(route);
  });

  return (
    <>
      {shouldShowHeader && <AppHeader />}
      {children}
    </>
  );
}