'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import {
  Tv,
  Newspaper,
  Trophy,
  Heart,
  Settings,
  LogIn,
  Home,
  Shield,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/?category=live', label: 'Live Now', icon: Tv },
  { href: '/?category=news', label: 'News', icon: Newspaper },
  { href: '/scores', label: 'Sports Scores', icon: Trophy },
];

const adminItems = [
  { href: '/admin', label: 'Admin Panel', icon: Shield },
];

const bottomItems = [
  { href: '/favorites', label: 'Favorites', icon: Heart, requiresAuth: true },
  { href: '/settings', label: 'Settings', icon: Settings, requiresAuth: true },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const category = searchParams.get('category');
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === 'admin';

  const isActive = (href: string) => {
    if (href.includes('?')) {
      const parts = href.split('?');
      const params = new URLSearchParams(parts[1]);
      return pathname === parts[0] && category === params.get('category');
    }
    if (href === '/') {
      return pathname === '/' && !category;
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed top-14 left-0 z-30 h-[calc(100vh-3.5rem)] w-60',
          'bg-surface/95 backdrop-blur-xl border-r border-border',
          'transition-transform duration-300 ease-in-out',
          'lg:translate-x-0 lg:static lg:h-full',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Sidebar navigation"
      >
        <nav className="flex flex-col h-full py-4 px-3">
          {/* Main navigation */}
          <div className="space-y-1">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
              Browse
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-primary-muted text-primary'
                      : 'text-text-secondary hover:text-text hover:bg-surface-hover',
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-border" />

          {isAdmin && (
            <div className="space-y-1">
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                Admin
              </p>
              {adminItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive(item.href)
                        ? 'bg-primary-muted text-primary'
                        : 'text-text-secondary hover:text-text hover:bg-surface-hover',
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Divider */}
          <div className="my-4 border-t border-border" />

          {/* Bottom items */}
          <div className="space-y-1">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
              Account
            </p>
            {bottomItems.map((item) => {
              if (item.requiresAuth && !isAuthenticated) return null;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-primary-muted text-primary'
                      : 'text-text-secondary hover:text-text hover:bg-surface-hover',
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}

            {!isAuthenticated && (
              <Link
                href="/auth/sign-in"
                onClick={onClose}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary hover:text-text hover:bg-surface-hover transition-colors"
              >
                <LogIn className="h-5 w-5 shrink-0" />
                Sign In
              </Link>
            )}
          </div>
        </nav>
      </aside>
    </>
  );
}
