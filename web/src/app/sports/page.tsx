'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { catalogApi } from '@/lib/api-client';
import { ChannelGrid } from '@/components/catalog/channel-grid';
import { SearchInput } from '@/components/catalog/search-input';
import {
  Tv,
  Trophy,
  Zap,
  Bike,
  Swords,
  Circle,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Channel } from '@/lib/api.types';

const SPORTS_CATEGORIES = [
  { slug: 'sports',        label: 'All Sports',     icon: Trophy,     color: 'from-violet-600 to-indigo-600' },
  { slug: 'football',      label: 'Football',       icon: Circle,     color: 'from-green-600 to-emerald-500' },
  { slug: 'cricket',       label: 'Cricket',        icon: TrendingUp, color: 'from-yellow-500 to-orange-500' },
  { slug: 'tennis',        label: 'Tennis',         icon: Zap,        color: 'from-lime-500 to-green-500' },
  { slug: 'motorsports',   label: 'Motorsports',    icon: Bike,       color: 'from-red-600 to-orange-500' },
  { slug: 'combat-sports', label: 'Combat Sports',  icon: Swords,     color: 'from-rose-600 to-pink-600' },
];

function SportsPageInner() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('query') ?? undefined;
  const [selectedSport, setSelectedSport] = useState('sports');

  // Fetch channels for selected sport
  const {
    data: channelsData,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['sports-channels', selectedSport, queryParam],
    queryFn: async ({ pageParam }) => {
      const res = await catalogApi.getChannels({
        category: selectedSport,
        query: queryParam,
        cursor: pageParam as string | undefined,
        limit: 24,
      });
      return res;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.page.hasMore ? lastPage.page.nextCursor ?? undefined : undefined,
  });

  const allChannels: Channel[] =
    channelsData?.pages
      .flatMap((p) => p.data)
      .filter((ch, i, self) => self.findIndex((c) => c.id === ch.id) === i) ?? [];

  const activeCat = SPORTS_CATEGORIES.find((c) => c.slug === selectedSport);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1200px] mx-auto animate-fade-in">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 sm:p-8">
        {/* Gradient orbs */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/15 blur-3xl" />

        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 border border-primary/25 text-primary">
            <Tv className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight sports-gradient">
              Live Sports TV
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Stream football, cricket, tennis, motorsports &amp; more — live, right now.
            </p>
          </div>
        </div>
      </section>

      {/* ── Category Pills ────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted mb-3">
          Browse by Sport
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {SPORTS_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = selectedSport === cat.slug;
            return (
              <button
                key={cat.slug}
                id={`sport-tab-${cat.slug}`}
                onClick={() => setSelectedSport(cat.slug)}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 text-center',
                  active
                    ? 'border-primary/40 bg-primary/10 text-primary shadow-lg shadow-primary/10 scale-[1.03]'
                    : 'border-border bg-surface text-text-muted hover:border-border-hover hover:text-text hover:bg-surface-hover active:scale-95',
                )}
              >
                <div className={cn(
                  'h-9 w-9 rounded-lg flex items-center justify-center',
                  active
                    ? `bg-gradient-to-br ${cat.color} text-white`
                    : 'bg-surface-elevated',
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-semibold leading-tight">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Channel Section ───────────────────────────────────────────────── */}
      <section className="space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-lg font-bold text-text">
              {activeCat?.label ?? 'Sports'} Channels
            </h2>
            <p className="text-xs text-text-muted">
              Live HD sports broadcasts
            </p>
          </div>
          {/* Channel count badge */}
          {!isLoading && allChannels.length > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
              {allChannels.length}+ channels
            </span>
          )}
        </div>

        {/* Search */}
        <div className="max-w-md">
          <SearchInput />
        </div>

        <ChannelGrid
          channels={allChannels}
          isLoading={isLoading}
          isError={isError}
          hasMore={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={() => fetchNextPage()}
          onRetry={() => refetch()}
        />
      </section>
    </div>
  );
}

export default function SportsPage() {
  return (
    <Suspense fallback={
      <div className="p-8 space-y-6 max-w-[1200px] mx-auto">
        <div className="skeleton h-32 rounded-2xl" />
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      </div>
    }>
      <SportsPageInner />
    </Suspense>
  );
}
