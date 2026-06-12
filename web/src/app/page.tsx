'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { catalogApi, scoresApi } from '@/lib/api-client';
import { CategoryChips } from '@/components/catalog/category-chips';
import { ChannelGrid } from '@/components/catalog/channel-grid';
import { ScoreCard } from '@/components/scores/score-card';
import { SearchInput } from '@/components/catalog/search-input';
import { Trophy, Calendar, CheckCircle, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Channel } from '@/lib/api.types';

export default function HomePage() {
  const searchParams = useSearchParams();
  const category = searchParams.get('category') ?? undefined;
  const query = searchParams.get('query') ?? undefined;

  const [matchTab, setMatchTab] = useState<'live' | 'upcoming' | 'finished' | 'all'>('all');

  // Fetch categories
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await catalogApi.getCategories();
      return res.data;
    },
  });

  // Fetch live matches
  const { data: liveMatchesData, isLoading: liveMatchesLoading } = useQuery({
    queryKey: ['matches', 'live'],
    queryFn: async () => {
      const res = await scoresApi.getMatches({ state: 'live', limit: 10 });
      return res.data;
    },
    refetchInterval: 5000, // Refetch live matches every 5 seconds
  });

  // Fetch scheduled matches
  const { data: scheduledMatchesData, isLoading: scheduledMatchesLoading } = useQuery({
    queryKey: ['matches', 'scheduled'],
    queryFn: async () => {
      const res = await scoresApi.getMatches({ state: 'scheduled', limit: 20 });
      return res.data;
    },
    refetchInterval: 30000, // Refetch scheduled matches every 30 seconds
  });

  // Fetch finished matches
  const { data: finishedMatchesData, isLoading: finishedMatchesLoading } = useQuery({
    queryKey: ['matches', 'finished'],
    queryFn: async () => {
      const res = await scoresApi.getMatches({ state: 'finished', limit: 20 });
      return res.data;
    },
    refetchInterval: 60000, // Refetch finished matches every minute
  });

  // Fetch channels with infinite scroll
  const {
    data: channelsData,
    isLoading: channelsLoading,
    isError: channelsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchChannels,
  } = useInfiniteQuery({
    queryKey: ['channels', category, query],
    queryFn: async ({ pageParam }) => {
      const res = await catalogApi.getChannels({
        category,
        query,
        cursor: pageParam as string | undefined,
        limit: 24,
      });
      return res;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      return lastPage.page.hasMore ? lastPage.page.nextCursor ?? undefined : undefined;
    },
  });

  // Deduplicate channels by ID to prevent duplicate key errors
  const allChannels: Channel[] =
    channelsData?.pages
      .flatMap((page) => page.data)
      .filter(
        (channel, index, self) =>
          self.findIndex((c) => c.id === channel.id) === index,
      ) ?? [];

  const liveMatches = liveMatchesData ?? [];
  const upcomingMatches = [...(scheduledMatchesData ?? [])].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
  const finishedMatches = finishedMatchesData ?? [];

  // Determine matches to display based on the active tab
  let activeMatches = [];
  if (matchTab === 'live') {
    activeMatches = liveMatches;
  } else if (matchTab === 'upcoming') {
    activeMatches = upcomingMatches;
  } else if (matchTab === 'finished') {
    activeMatches = finishedMatches;
  } else {
    activeMatches = [...liveMatches, ...upcomingMatches, ...finishedMatches];
  }

  const matchesLoading = liveMatchesLoading || scheduledMatchesLoading || finishedMatchesLoading;

  // Dynamically determine headers for the channels list
  const activeCategoryName = categoriesData?.find(
    (c) => c.id === category || c.slug === category
  )?.name;

  const channelsHeading = category === 'live'
    ? 'Live TV Channels'
    : activeCategoryName
    ? `${activeCategoryName} Channels`
    : 'Browse TV Channels';

  const channelsDescription = category === 'live'
    ? 'Currently active and broadcasting TV feeds'
    : activeCategoryName
    ? `TV broadcasts for ${activeCategoryName}`
    : 'Live news, sports, and entertainment feeds';

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1200px] mx-auto">
      {/* Matches Schedule Hero Section - Only displayed on Home page */}
      {!category && (
        <section className="space-y-4 bg-surface/30 border border-border p-6 rounded-2xl shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-xl text-primary border border-primary/20">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-text">Sports Match Center</h1>
                <p className="text-xs text-text-muted">Live broadcasts, schedules, and scores</p>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="flex gap-1 bg-zinc-950 p-1.5 rounded-xl border border-border self-start md:self-auto overflow-x-auto scrollbar-hide">
              {(
                [
                  { id: 'all', label: 'All Games', icon: Calendar },
                  { id: 'live', label: 'Live Now', icon: Radio },
                  { id: 'upcoming', label: 'Upcoming', icon: Calendar },
                  { id: 'finished', label: 'Finished', icon: CheckCircle },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const isTabLive = tab.id === 'live';
                const showBadge = isTabLive && liveMatches.length > 0;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setMatchTab(tab.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
                      matchTab === tab.id
                        ? 'bg-primary text-white shadow-lg'
                        : 'text-text-secondary hover:text-text hover:bg-surface-hover'
                    )}
                  >
                    <Icon className={cn('h-3.5 w-3.5', showBadge && 'animate-pulse text-live')} />
                    {tab.label}
                    {showBadge && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-live text-[9px] font-bold text-white leading-none">
                        {liveMatches.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Match List */}
          {matchesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-20 rounded-xl" />
              ))}
            </div>
          ) : activeMatches.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-12 text-center text-text-muted">
              <Trophy className="h-10 w-10 mx-auto text-text-muted/30 mb-3" />
              <p className="font-semibold text-sm">No matches found</p>
              <p className="text-xs mt-1">There are no matches currently scheduled or active in this category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {activeMatches.map((match) => (
                <ScoreCard key={match.id} match={match} variant="list" />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Live TV Channels Section */}
      <section className="space-y-6 pt-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-lg font-bold text-text">{channelsHeading}</h2>
            <p className="text-xs text-text-muted">{channelsDescription}</p>
          </div>
        </div>
        
        {/* Search */}
        <div className="max-w-md">
          <SearchInput />
        </div>

        {/* Category Chips */}
        <CategoryChips
          categories={categoriesData ?? []}
          selectedId={category}
          isLoading={categoriesLoading}
        />

        {/* Channel Grid */}
        <ChannelGrid
          channels={allChannels}
          isLoading={channelsLoading}
          isError={channelsError}
          hasMore={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={() => fetchNextPage()}
          onRetry={() => refetchChannels()}
        />
      </section>
    </div>
  );
}
