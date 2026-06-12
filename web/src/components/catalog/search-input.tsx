'use client';

import { Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function SearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('query') ?? '');

  useEffect(() => {
    setValue(searchParams.get('query') ?? '');
  }, [searchParams]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set('query', value.trim());
      } else {
        params.delete('query');
      }
      params.delete('cursor');
      router.push(`/?${params.toString()}`);
    },
    [value, router, searchParams],
  );

  const handleClear = useCallback(() => {
    setValue('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('query');
    params.delete('cursor');
    router.push(`/?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search channels..."
        className={cn(
          'w-full rounded-xl bg-surface border border-border',
          'pl-10 pr-10 py-2.5 text-sm text-text',
          'placeholder:text-text-muted',
          'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
          'transition-all',
        )}
        aria-label="Search channels"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </form>
  );
}
