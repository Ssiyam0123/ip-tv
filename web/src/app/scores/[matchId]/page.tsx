'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { scoresApi, catalogApi, playbackApi } from '@/lib/api-client';
import { subscribeToMatch } from '@/lib/socket-client';
import { HlsPlayer } from '@/components/player/hls-player';
import { PlaybackError } from '@/components/player/playback-error';
import { MatchStatusBadge } from '@/components/scores/match-status-badge';
import { ErrorState } from '@/components/ui/error-state';
import { MatchDetailSkeleton } from '@/components/ui/skeletons';
import { ArrowLeft, Clock, WifiOff, Tv, Server, Wifi, Trophy } from 'lucide-react';
import { cn, formatScore } from '@/lib/utils';
import type { Match, MatchUpdate, MatchState } from '@/lib/api.types';

export default function MatchDetailPage() {
  const params = useParams();
  const matchId = params.matchId as string;

  const [liveUpdate, setLiveUpdate] = useState<MatchUpdate | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  // 1. Fetch REST match snapshot
  const { data: matchData, isLoading: matchLoading, isError: matchError, refetch: refetchMatch } = useQuery({
    queryKey: ['match', matchId],
    queryFn: async () => {
      const res = await scoresApi.getMatch(matchId);
      return res.data;
    },
    enabled: !!matchId,
  });

  const match = liveUpdate && matchData
    ? {
        ...matchData,
        state: liveUpdate.state as MatchState,
        homeScore: liveUpdate.homeScore ?? matchData.homeScore,
        awayScore: liveUpdate.awayScore ?? matchData.awayScore,
        currentPeriod: liveUpdate.currentPeriod ?? matchData.currentPeriod,
      }
    : matchData;

  // 2. Fetch active channels broadcasting this match's sport
  const { data: channelsResponse, isLoading: channelsLoading } = useQuery({
    queryKey: ['match-channels', match?.sport],
    queryFn: async () => {
      // Fetch channels matching the sport slug (e.g. 'football' or 'cricket')
      let res = await catalogApi.getChannels({ category: match!.sport, limit: 15 });
      // Fallback to general sports channels if none found for the specific sport
      if (!res.data || res.data.length === 0) {
        res = await catalogApi.getChannels({ category: 'sports', limit: 15 });
      }
      return res.data;
    },
    enabled: !!match?.sport,
  });

  // Default to the first channel
  useEffect(() => {
    if (channelsResponse && channelsResponse.length > 0 && !selectedChannelId) {
      setSelectedChannelId(channelsResponse[0].id);
    }
  }, [channelsResponse, selectedChannelId]);

  // 3. Create playback session for selected channel
  const {
    data: sessionData,
    isLoading: sessionLoading,
    isError: sessionError,
    refetch: refetchSession,
  } = useQuery({
    queryKey: ['playback-session', selectedChannelId],
    queryFn: async () => {
      const res = await playbackApi.createSession(selectedChannelId!);
      return res.data;
    },
    enabled: !!selectedChannelId,
    retry: 1,
  });

  // Subscribe to real-time score updates
  useEffect(() => {
    if (!matchId) return;

    let lastVersion = 0;

    const unsubscribe = subscribeToMatch(
      matchId,
      (update: MatchUpdate) => {
        if (update.version > lastVersion) {
          lastVersion = update.version;
          setLiveUpdate(update);
          setLastUpdateTime(new Date());
          setIsStale(false);
        }
      },
      () => {
        setIsStale(true);
      },
    );

    return unsubscribe;
  }, [matchId]);

  // Mark stale if no update for 30 seconds
  useEffect(() => {
    if (!lastUpdateTime) return;

    const interval = setInterval(() => {
      if (Date.now() - lastUpdateTime.getTime() > 30000) {
        setIsStale(true);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [lastUpdateTime]);

  // Re-fetch on version gap
  const handleReconnectGap = useCallback(() => {
    if (isStale && match?.snapshots?.[0]?.version !== undefined) {
      refetchMatch();
    }
  }, [isStale, match?.snapshots?.[0]?.version, refetchMatch]);

  useEffect(() => {
    handleReconnectGap();
  }, [handleReconnectGap]);

  if (matchLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <MatchDetailSkeleton />
      </div>
    );
  }

  if (matchError || !match) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <ErrorState
          title="Match not found"
          message="This match could not be found."
          onRetry={() => refetchMatch()}
        />
      </div>
    );
  }

  const isLive = match.state === 'live';
  const isFinished = match.state === 'finished';
  const isScheduled = match.state === 'scheduled';

  const channels = channelsResponse ?? [];
  const activeChannel = channels.find((c) => c.id === selectedChannelId);
  const playableSources = sessionData?.sources ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Schedule
      </Link>

      {/* Competition info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {match.competition?.logoUrl && (
            <img
              src={match.competition.logoUrl}
              alt=""
              className="h-6 w-6 object-contain"
            />
          )}
          <span className="text-sm font-medium text-text-muted">
            {match.competition?.name}
            {match.competition?.country && ` · ${match.competition.country}`}
          </span>
        </div>
        <MatchStatusBadge state={match.state} currentPeriod={match.currentPeriod} />
      </div>

      {/* Scoreboard */}
      <div className="rounded-2xl bg-surface/50 border border-border p-6 sm:p-10 shadow-lg">
        <div className="flex items-center justify-center gap-4 sm:gap-12">
          {/* Home team */}
          <div className="flex flex-col items-center gap-3 flex-1">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-border">
              {match.homeTeam?.logoUrl ? (
                <img
                  src={match.homeTeam.logoUrl}
                  alt={match.homeTeam.name}
                  className="h-12 w-12 sm:h-14 sm:w-14 object-contain"
                />
              ) : (
                <span className="text-lg font-bold text-text-muted">
                  {match.homeTeam?.name?.[0] ?? '?'}
                </span>
              )}
            </div>
            <span className="text-sm sm:text-base font-semibold text-text text-center">
              {match.homeTeam?.name ?? 'Unknown'}
            </span>
            {match.homeTeam?.shortName && (
              <span className="text-xs text-text-muted -mt-2">
                {match.homeTeam.shortName}
              </span>
            )}
          </div>

          {/* Score / Status */}
          <div className="flex flex-col items-center gap-2">
            {isLive && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-live bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 animate-pulse">
                Live
              </span>
            )}
            <div className="flex items-center gap-3">
              {isScheduled ? (
                <span className="text-sm font-semibold text-text-secondary uppercase px-3 py-1 bg-surface-dark border border-border rounded-lg">
                  vs
                </span>
              ) : (
                <>
                  <span
                    className={cn(
                      'text-5xl sm:text-7xl font-black tabular-nums leading-none',
                      isLive && 'text-live',
                      isFinished && 'text-text',
                      !isLive && !isFinished && 'text-text-muted',
                    )}
                  >
                    {formatScore(match.homeScore)}
                  </span>
                  <span className="text-3xl sm:text-5xl font-light text-text-muted">:</span>
                  <span
                    className={cn(
                      'text-5xl sm:text-7xl font-black tabular-nums leading-none',
                      isLive && 'text-live',
                      isFinished && 'text-text',
                      !isLive && !isFinished && 'text-text-muted',
                    )}
                  >
                    {formatScore(match.awayScore)}
                  </span>
                </>
              )}
            </div>
            {match.currentPeriod && !isScheduled && (
              <span className="text-sm font-medium text-text-muted uppercase tracking-wider">
                {match.currentPeriod}
              </span>
            )}
            {isScheduled && (
              <span className="flex items-center gap-1.5 text-xs text-text-muted font-medium bg-surface-dark px-2.5 py-1 rounded-full border border-border">
                <Clock className="h-3.5 w-3.5" />
                {new Date(match.startTime).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            )}
          </div>

          {/* Away team */}
          <div className="flex flex-col items-center gap-3 flex-1">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-border">
              {match.awayTeam?.logoUrl ? (
                <img
                  src={match.awayTeam.logoUrl}
                  alt={match.awayTeam.name}
                  className="h-12 w-12 sm:h-14 sm:w-14 object-contain"
                />
              ) : (
                <span className="text-lg font-bold text-text-muted">
                  {match.awayTeam?.name?.[0] ?? '?'}
                </span>
              )}
            </div>
            <span className="text-sm sm:text-base font-semibold text-text text-center">
              {match.awayTeam?.name ?? 'Unknown'}
            </span>
            {match.awayTeam?.shortName && (
              <span className="text-xs text-text-muted -mt-2">
                {match.awayTeam.shortName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Stream Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* HLS Video Player */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl overflow-hidden bg-black border border-border shadow-xl aspect-video relative">
            {isFinished ? (
              <div className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <Trophy className="h-12 w-12 text-accent/50" />
                <div>
                  <h3 className="text-lg font-bold text-text">Match Completed</h3>
                  <p className="text-sm text-text-muted max-w-md mt-1">
                    This match has finished. Replays or highlights might be available on main channels.
                  </p>
                </div>
              </div>
            ) : isScheduled ? (
              <div className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-center gap-4 p-6 text-center">
                <Clock className="h-12 w-12 text-primary/50" />
                <div>
                  <h3 className="text-lg font-bold text-text">Match Upcoming</h3>
                  <p className="text-sm text-text-muted max-w-sm mt-1">
                    The live stream for this match will begin when the game kicks off on {new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
                  </p>
                </div>
              </div>
            ) : !selectedChannelId ? (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-text-muted">
                <div className="text-center">
                  <Tv className="h-10 w-10 mx-auto text-zinc-700 mb-2" />
                  <p className="text-sm">No servers available for this sport</p>
                </div>
              </div>
            ) : sessionLoading ? (
              <div className="absolute inset-0 bg-zinc-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-xs text-text-muted">Connecting to streaming server...</p>
                </div>
              </div>
            ) : sessionError ? (
              <PlaybackError
                message="Server currently unavailable. Please select another server/channel."
                channelId={selectedChannelId}
              />
            ) : playableSources.length > 0 ? (
              <HlsPlayer
                sources={playableSources}
                channelName={activeChannel?.title ?? 'Live Match'}
              />
            ) : (
              <PlaybackError
                message="No live video stream configured for this server."
                channelId={selectedChannelId}
              />
            )}
          </div>

          {/* Stale / Network Connection Warning */}
          {isStale && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-400">
              <WifiOff className="h-4 w-4 shrink-0" />
              <span>
                Match updates delayed. Last update:{' '}
                {lastUpdateTime?.toLocaleTimeString() ?? 'unknown'}
              </span>
            </div>
          )}
        </div>

        {/* Server Selector Sidebar */}
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-4 shadow-lg self-start">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Server className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm text-text">Select Broadcasting Server</h3>
          </div>

          {channelsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-12 rounded-lg" />
              ))}
            </div>
          ) : channels.length === 0 ? (
            <p className="text-xs text-text-muted py-4 text-center">
              No specific servers available for this match's sport.
            </p>
          ) : (
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
              {channels.map((channel, idx) => {
                const isSelected = channel.id === selectedChannelId;
                return (
                  <button
                    key={channel.id}
                    onClick={() => {
                      if (channel.id !== selectedChannelId) {
                        setSelectedChannelId(channel.id);
                      }
                    }}
                    className={cn(
                      'flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-semibold text-left transition-all',
                      isSelected
                        ? 'bg-primary/10 text-primary border-primary/40'
                        : 'bg-surface border-border text-text-secondary hover:text-text hover:border-border-hover'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn(
                        'p-1.5 rounded-lg shrink-0',
                        isSelected ? 'bg-primary/20 text-primary' : 'bg-surface-hover text-text-secondary'
                      )}>
                        <Tv className="h-3.5 w-3.5" />
                      </div>
                      <span className="truncate">{channel.title}</span>
                    </div>

                    {/* Server Indicator */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-text-muted">Server {idx + 1}</span>
                      {isLive && isSelected && (
                        <span className="h-2 w-2 rounded-full bg-live animate-pulse" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="bg-surface-dark border border-border p-3.5 rounded-xl space-y-1">
            <h4 className="text-[10px] font-bold text-text uppercase tracking-wider">Streaming Note</h4>
            <p className="text-[10px] text-text-secondary leading-relaxed">
              If the stream buffers or fails, switch servers. Server feeds are sourced from active sports broadcasting categories.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
