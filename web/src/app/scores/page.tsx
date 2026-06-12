'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { scoresApi } from '@/lib/api-client';
import { ScoreCard } from '@/components/scores/score-card';
import { MatchStatusBadge } from '@/components/scores/match-status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ChannelGridSkeleton } from '@/components/ui/skeletons';
import { Trophy, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Sport, MatchState, Match } from '@/lib/api.types';

const sportTabs: { label: string; value: Sport | 'all' }[] = [
  { label: 'All Sports', value: 'all' },
  { label: 'Football', value: 'football' },
  { label: 'Cricket', value: 'cricket' },
];

const stateTabs: { label: string; value: MatchState | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Live', value: 'live' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Finished', value: 'finished' },
];

export default function ScoresPage() {
  const [selectedSport, setSelectedSport] = useState<Sport | 'all'>('all');
  const [selectedState, setSelectedState] = useState<MatchState | 'all'>('all');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['matches', selectedSport, selectedState],
    queryFn: async () => {
      const res = await scoresApi.getMatches({
        sport: selectedSport === 'all' ? undefined : selectedSport,
        state: selectedState === 'all' ? undefined : selectedState,
        limit: 50,
      });
      return res.data;
    },
    refetchInterval: 5000, // Refetch every 5 seconds to keep live scores updated in real-time
  });

  const matches = data ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Trophy className="h-6 w-6 text-accent" />
        <h1 className="text-2xl font-bold text-text">Sports Scores</h1>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Sport filter */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide" role="tablist">
          <Filter className="h-4 w-4 text-text-muted shrink-0" />
          {sportTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSelectedSport(tab.value)}
              role="tab"
              aria-selected={selectedSport === tab.value}
              className={cn(
                'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all',
                selectedSport === tab.value
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-secondary hover:text-text hover:bg-surface-hover',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* State filter */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide" role="tablist">
          {stateTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSelectedState(tab.value)}
              role="tab"
              aria-selected={selectedState === tab.value}
              className={cn(
                'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all',
                selectedState === tab.value
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-secondary hover:text-text hover:bg-surface-hover',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Matches list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Failed to load scores"
          message="We couldn't load the scores. Please check your connection."
          onRetry={() => refetch()}
        />
      ) : matches.length === 0 ? (
        <EmptyState
          icon={<Trophy className="h-8 w-8" />}
          title="No matches found"
          description="There are no matches matching your filters."
        />
      ) : (
        <div className="space-y-2">
          {matches.map((match: Match) => (
            <ScoreCard key={match.id} match={match} variant="list" />
          ))}
        </div>
      )}
    </div>
  );
}
