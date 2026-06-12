'use client';

import { ScoreCard } from './score-card';
import { ScoreRailSkeleton } from '@/components/ui/skeletons';
import { Trophy } from 'lucide-react';
import Link from 'next/link';
import type { Match } from '@/lib/api.types';

interface ScoreRailProps {
  matches: Match[];
  isLoading: boolean;
}

export function ScoreRail({ matches, isLoading }: ScoreRailProps) {
  if (isLoading) {
    return (
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-text flex items-center gap-2">
          <Trophy className="h-5 w-5 text-accent" />
          Live & Upcoming Scores
        </h2>
        <div className="overflow-x-auto scrollbar-hide">
          <ScoreRailSkeleton />
        </div>
      </section>
    );
  }

  if (matches.length === 0) return null;

  return (
    <section className="space-y-4">
      <Link href="/scores" className="flex items-center gap-2 group">
        <Trophy className="h-5 w-5 text-accent" />
        <h2 className="text-lg font-bold text-text group-hover:text-primary transition-colors">
          Live & Upcoming Scores
        </h2>
        <span className="text-xs text-text-muted group-hover:text-primary transition-colors">
          View all →
        </span>
      </Link>
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
        <div className="flex gap-3 pb-2">
          {matches.map((match) => (
            <ScoreCard key={match.id} match={match} variant="rail" />
          ))}
        </div>
      </div>
    </section>
  );
}
