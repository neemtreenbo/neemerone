'use client';

import { usePathname } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { SidebarNavigation } from '@/components/sidebar-navigation';
import { SidebarProvider, useSidebar } from '@/components/sidebar-context';

interface HeaderWrapperProps {
  children: React.ReactNode;
}

function HeaderContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
      <AppHeader />
      <main className="min-h-[calc(100vh-4rem)] p-4 lg:p-6">
        {children}
      </main>
    </div>
  );
}

export function HeaderWrapper({ children }: HeaderWrapperProps) {
  const pathname = usePathname();

  // Define routes where header and sidebar should NOT be shown
  const excludeHeaderRoutes = [
    '/auth',
    '/onboarding',
    '/',  // Landing page
  ];

  // Check if current path should exclude header and sidebar
  const shouldShowHeader = !excludeHeaderRoutes.some(route => {
    if (route === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(route);
  });

  return (
    <>
      {shouldShowHeader && (
        <SidebarProvider>
          <SidebarNavigation />
          <HeaderContent>{children}</HeaderContent>
        </SidebarProvider>
      )}
      {!shouldShowHeader && children}
    </>
  );
}