'use client';

import { cn, getMatchStatusLabel } from '@/lib/utils';
import type { MatchState } from '@/lib/api.types';

interface MatchStatusBadgeProps {
  state: MatchState;
  currentPeriod?: string | null;
  className?: string;
}

export function MatchStatusBadge({ state, currentPeriod, className }: MatchStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        state === 'live' && 'bg-red-500/15 text-red-500',
        state === 'scheduled' && 'bg-blue-500/15 text-blue-400',
        state === 'finished' && 'bg-zinc-500/15 text-zinc-400',
        (state === 'postponed' || state === 'cancelled') && 'bg-amber-500/15 text-amber-400',
        className,
      )}
    >
      {state === 'live' && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {getMatchStatusLabel(state)}
      {currentPeriod && state === 'live' && (
        <span className="opacity-70">· {currentPeriod}</span>
      )}
    </span>
  );
}
