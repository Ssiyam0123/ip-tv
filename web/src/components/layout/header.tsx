'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Search, X, Tv, User, LogIn } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onMenuToggle: () => void;
  isSidebarOpen: boolean;
}

export function Header({ onMenuToggle, isSidebarOpen }: HeaderProps) {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/?query=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <header className="sticky top-0 z-40 glass border-b border-border">
      <div className="flex h-14 items-center gap-3 px-4">
        {/* Mobile menu toggle */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden inline-flex items-center justify-center rounded-lg p-2 text-text-secondary hover:bg-surface-hover transition-colors"
          aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-hover">
            <Tv className="h-4 w-4 text-white" />
          </div>
          <span className="hidden sm:inline text-lg font-bold text-text">
            IP<span className="text-primary">TV</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1 ml-4" aria-label="Main navigation">
          <Link
            href="/"
            className={cn(
              'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname === '/' || (pathname.startsWith('/watch') && pathname !== '/favorites')
                ? 'bg-primary-muted text-primary'
                : 'text-text-secondary hover:text-text hover:bg-surface-hover',
            )}
          >
            Browse
          </Link>
          <Link
            href="/scores"
            className={cn(
              'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith('/scores')
                ? 'bg-primary-muted text-primary'
                : 'text-text-secondary hover:text-text hover:bg-surface-hover',
            )}
          >
            Scores
          </Link>
          {isAuthenticated && (
            <Link
              href="/favorites"
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname.startsWith('/favorites')
                  ? 'bg-primary-muted text-primary'
                  : 'text-text-secondary hover:text-text hover:bg-surface-hover',
              )}
            >
              Favorites
            </Link>
          )}
        </nav>

        <div className="flex-1" />

        {/* Search */}
        <div className="hidden sm:block relative max-w-xs w-full">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
              <input
                type="search"
                placeholder="Search channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg bg-surface border border-border pl-9 pr-3 py-1.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                aria-label="Search channels"
              />
            </div>
          </form>
        </div>

        {/* Auth */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <Link
              href="/settings"
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                pathname === '/settings'
                  ? 'bg-primary-muted text-primary'
                  : 'text-text-secondary hover:text-text hover:bg-surface-hover',
              )}
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{user?.displayName ?? user?.email}</span>
            </Link>
          ) : (
            <Link
              href="/auth/sign-in"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Sign In</span>
            </Link>
          )}
        </div>

        {/* Mobile search toggle */}
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="sm:hidden inline-flex items-center justify-center rounded-lg p-2 text-text-secondary hover:bg-surface-hover transition-colors"
          aria-label="Toggle search"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile search bar */}
      {searchOpen && (
        <div className="sm:hidden border-t border-border px-4 py-2 animate-slide-up">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
              <input
                type="search"
                placeholder="Search channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg bg-surface border border-border pl-9 pr-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                aria-label="Search channels"
                autoFocus
              />
            </div>
          </form>
        </div>
      )}
    </header>
  );
}
