'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Tv, Trophy, Heart, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/scores', label: 'Scores', icon: Trophy },
  { href: '/favorites', label: 'Favorites', icon: Heart, requiresAuth: true },
  { href: '/settings', label: 'Account', icon: User },
];

export function MobileNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const items = navItems.filter(
    (item) => !item.requiresAuth || isAuthenticated,
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden glass border-t border-border"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-lg transition-colors min-w-[3.5rem]',
                active
                  ? 'text-primary'
                  : 'text-text-muted hover:text-text-secondary',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
