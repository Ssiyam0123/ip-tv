'use client';

import Link from 'next/link';
import { cn, formatScore, getMatchStatusLabel, formatMatchTime } from '@/lib/utils';
import { LiveIndicator } from './live-indicator';
import type { Match } from '@/lib/api.types';

interface ScoreCardProps {
  match: Match;
  variant?: 'rail' | 'list' | 'detail';
}

export function ScoreCard({ match, variant = 'list' }: ScoreCardProps) {
  const isLive = match.state === 'live';
  const isFinished = match.state === 'finished';

  if (variant === 'rail') {
    return (
      <Link
        href={`/scores/${match.id}`}
        className="flex shrink-0 w-64 flex-col gap-3 rounded-xl bg-surface border border-border p-4 transition-all hover:border-primary/30 hover:bg-surface-hover hover:shadow-lg active:scale-[0.98]"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
            {match.competition.name}
          </span>
          {isLive && <LiveIndicator />}
          {!isLive && (
            <span className="text-xs text-text-muted">
              {formatMatchTime(match.startTime)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          {/* Home team */}
          <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
              {match.homeTeam.logoUrl ? (
                <img src={match.homeTeam.logoUrl} alt="" className="h-6 w-6 object-contain" />
              ) : (
                <span className="text-xs font-bold text-text-muted">
                  {match.homeTeam.shortName?.[0] ?? match.homeTeam.name[0]}
                </span>
              )}
            </div>
            <span className="text-xs font-medium text-text truncate w-full text-center">
              {match.homeTeam.shortName ?? match.homeTeam.name}
            </span>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            {match.state === 'scheduled' ? (
              <span className="text-xs font-semibold text-text-muted uppercase px-2 py-0.5 bg-zinc-800 rounded border border-border">
                vs
              </span>
            ) : (
              <span
                className={cn(
                  'text-xl font-bold tabular-nums',
                  isLive && 'text-live',
                  isFinished && 'text-text',
                  !isLive && !isFinished && 'text-text-muted',
                )}
              >
                {formatScore(match.homeScore)} - {formatScore(match.awayScore)}
              </span>
            )}
            {match.currentPeriod && (
              <span className="text-[10px] font-medium text-text-muted uppercase">
                {match.currentPeriod}
              </span>
            )}
          </div>

          {/* Away team */}
          <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
              {match.awayTeam.logoUrl ? (
                <img src={match.awayTeam.logoUrl} alt="" className="h-6 w-6 object-contain" />
              ) : (
                <span className="text-xs font-bold text-text-muted">
                  {match.awayTeam.shortName?.[0] ?? match.awayTeam.name[0]}
                </span>
              )}
            </div>
            <span className="text-xs font-medium text-text truncate w-full text-center">
              {match.awayTeam.shortName ?? match.awayTeam.name}
            </span>
          </div>
        </div>

        {!isLive && !isFinished && (
          <span className="text-xs text-text-muted text-center">
            {formatMatchTime(match.startTime)}
          </span>
        )}
      </Link>
    );
  }

  // List variant
  return (
    <Link
      href={`/scores/${match.id}`}
      className={cn(
        'flex items-center gap-4 rounded-xl bg-surface border border-border p-4 transition-all',
        'hover:border-primary/30 hover:bg-surface-hover active:scale-[0.98]',
        isLive && 'border-l-4 border-l-live bg-live/5 hover:bg-live/10'
      )}
    >
      {/* Competition */}
      <div className="hidden md:flex flex-col items-start w-28 shrink-0">
        <span className="text-xs font-bold text-primary uppercase tracking-wider">
          {match.sport}
        </span>
        <span className="text-xs text-text-muted truncate w-full">
          {match.competition.name}
        </span>
      </div>

      {/* Scoreboard block (centered content) */}
      <div className="flex flex-1 items-center justify-between gap-4">
        {/* Home team */}
        <div className="flex items-center gap-3 flex-1 justify-end min-w-0">
          <span className="text-sm font-semibold text-text truncate text-right hidden sm:inline">
            {match.homeTeam.name}
          </span>
          <span className="text-sm font-semibold text-text truncate text-right sm:hidden">
            {match.homeTeam.shortName ?? match.homeTeam.name}
          </span>
          <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0 border border-border">
            {match.homeTeam.logoUrl ? (
              <img src={match.homeTeam.logoUrl} alt="" className="h-7 w-7 object-contain" />
            ) : (
              <span className="text-xs font-bold text-text-muted">
                {match.homeTeam.shortName?.[0] ?? match.homeTeam.name[0]}
              </span>
            )}
          </div>
        </div>

        {/* Score / Status Center */}
        <div className="flex flex-col items-center gap-1 shrink-0 min-w-[5.5rem] bg-zinc-950 px-3 py-1.5 rounded-xl border border-border">
          {match.state === 'scheduled' ? (
            <span className="text-xs font-bold text-text-secondary uppercase">
              VS
            </span>
          ) : (
            <span
              className={cn(
                'text-lg font-extrabold tabular-nums tracking-tight',
                isLive ? 'text-live animate-pulse' : 'text-text-muted'
              )}
            >
              {formatScore(match.homeScore)} - {formatScore(match.awayScore)}
            </span>
          )}
          {isLive ? (
            <span className="text-[9px] font-bold text-live bg-red-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider leading-none">
              {match.currentPeriod ?? 'LIVE'}
            </span>
          ) : (
            <span className="text-[9px] font-semibold text-text-muted uppercase tracking-wider leading-none">
              {match.state === 'scheduled' ? formatMatchTime(match.startTime) : 'FT'}
            </span>
          )}
        </div>

        {/* Away team */}
        <div className="flex items-center gap-3 flex-1 justify-start min-w-0">
          <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0 border border-border">
            {match.awayTeam.logoUrl ? (
              <img src={match.awayTeam.logoUrl} alt="" className="h-7 w-7 object-contain" />
            ) : (
              <span className="text-xs font-bold text-text-muted">
                {match.awayTeam.shortName?.[0] ?? match.awayTeam.name[0]}
              </span>
            )}
          </div>
          <span className="text-sm font-semibold text-text truncate hidden sm:inline">
            {match.awayTeam.name}
          </span>
          <span className="text-sm font-semibold text-text truncate sm:hidden">
            {match.awayTeam.shortName ?? match.awayTeam.name}
          </span>
        </div>
      </div>

      {/* Watch / Action Section */}
      <div className="hidden sm:flex items-center justify-end w-24 shrink-0">
        {isLive ? (
          <span className="text-xs font-bold text-white bg-primary hover:bg-primary-hover px-3 py-1.5 rounded-lg shadow-md transition-colors whitespace-nowrap">
            Watch Live
          </span>
        ) : isFinished ? (
          <span className="text-xs font-medium text-text-muted border border-border px-3 py-1.5 rounded-lg bg-surface-dark/50 whitespace-nowrap">
            Completed
          </span>
        ) : (
          <span className="text-xs font-semibold text-primary border border-primary/20 px-3 py-1.5 rounded-lg bg-primary/5 whitespace-nowrap">
            Schedule
          </span>
        )}
      </div>
    </Link>
  );
}
