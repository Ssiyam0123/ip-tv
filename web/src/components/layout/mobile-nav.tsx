'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Heart, User, Tv } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Suspense } from 'react';

const navItems = [
  { href: '/', label: 'Home', icon: Home, exact: true },
  { href: '/sports', label: 'Sports', icon: Tv },
  { href: '/scores', label: 'Scores', icon: Trophy },
  { href: '/favorites', label: 'Favourites', icon: Heart, requiresAuth: true },
  { href: '/settings', label: 'Account', icon: User },
];

function MobileNavInner() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  const isActive = (item: typeof navItems[number]) => {
    if ('exact' in item && item.exact) {
      return pathname === '/';
    }
    return pathname.startsWith(item.href);
  };

  const items = navItems.filter(
    (item) => !item.requiresAuth || isAuthenticated,
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-border"
      aria-label="Mobile navigation"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Blur backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" />

      <div className="relative flex items-center justify-around h-16 px-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[3rem] relative',
                active
                  ? 'text-primary'
                  : 'text-text-muted hover:text-text-secondary active:scale-95',
              )}
              aria-current={active ? 'page' : undefined}
            >
              {/* Active indicator dot */}
              {active && (
                <span className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}

              <div className={cn(
                'p-1 rounded-lg transition-colors duration-200',
                active ? 'bg-primary/15' : '',
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={cn(
                'text-[9px] font-semibold leading-none tracking-wide uppercase',
                active ? 'text-primary' : 'text-text-muted',
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Wrap in Suspense because useSearchParams needs it
export function MobileNav() {
  return (
    <Suspense fallback={null}>
      <MobileNavInner />
    </Suspense>
  );
}
