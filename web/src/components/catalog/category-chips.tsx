'use client';

import { cn } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Category } from '@/lib/api.types';

interface CategoryChipsProps {
  categories: Category[];
  selectedId?: string;
  isLoading?: boolean;
}

export function CategoryChips({ categories, selectedId, isLoading }: CategoryChipsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSelect = (categoryId?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (categoryId) {
      params.set('category', categoryId);
    } else {
      params.delete('category');
    }
    params.delete('cursor');
    router.push(`/?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-9 w-20 rounded-full skeleton shrink-0"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2" role="tablist" aria-label="Categories">
      <button
        onClick={() => handleSelect(undefined)}
        role="tab"
        aria-selected={!selectedId}
        className={cn(
          'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all',
          'border border-border hover:border-border-hover',
          !selectedId
            ? 'bg-primary text-white border-primary'
            : 'bg-surface text-text-secondary hover:text-text hover:bg-surface-hover',
        )}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => handleSelect(category.id)}
          role="tab"
          aria-selected={selectedId === category.id}
          className={cn(
            'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all whitespace-nowrap',
            'border border-border hover:border-border-hover',
            selectedId === category.id
              ? 'bg-primary text-white border-primary'
              : 'bg-surface text-text-secondary hover:text-text hover:bg-surface-hover',
          )}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
