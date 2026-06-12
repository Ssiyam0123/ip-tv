'use client';

import { useState, type ReactNode } from 'react';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { MobileNav } from './mobile-nav';
import { OfflineBanner } from '@/components/ui/offline-banner';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

interface AppShellProps {
  children: ReactNode;
}

const hideShellPaths = ['/auth/sign-in', '/auth/register', '/auth/callback', '/admin'];

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const isAuthPage = hideShellPaths.includes(pathname);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <OfflineBanner />
      <Header
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        isSidebarOpen={sidebarOpen}
      />
      <div className="flex flex-1">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main
          className={cn(
            'flex-1 pb-16 lg:pb-0 min-h-[calc(100vh-3.5rem)]',
            'overflow-x-hidden',
          )}
        >
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
