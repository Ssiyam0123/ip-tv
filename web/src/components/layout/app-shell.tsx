'use client';

import { useState, type ReactNode, Suspense } from 'react';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { MobileNav } from './mobile-nav';
import { OfflineBanner } from '@/components/ui/offline-banner';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

interface AppShellProps {
  children: ReactNode;
}

// Pages that hide the shell (full-screen experience)
const hideShellPaths = ['/auth/sign-in', '/auth/register', '/auth/callback', '/admin'];
// Pages that hide only the bottom nav (watch page = full-screen player)
const hideNavPaths = ['/watch'];

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const isAuthPage = hideShellPaths.some((p) => pathname.startsWith(p));
  const isWatchPage = hideNavPaths.some((p) => pathname.startsWith(p));

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
        <Suspense fallback={null}>
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        </Suspense>
        <main
          className={cn(
            'flex-1 min-h-[calc(100vh-3.5rem)]',
            'overflow-x-hidden',
            // Add bottom padding for mobile nav unless on watch page
            !isWatchPage && 'pb-20 lg:pb-0',
          )}
        >
          {children}
        </main>
      </div>
      {!isWatchPage && (
        <Suspense fallback={null}>
          <MobileNav />
        </Suspense>
      )}
    </div>
  );
}
