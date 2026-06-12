'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { catalogApi, playbackApi } from '@/lib/api-client';
import { HlsPlayer } from '@/components/player/hls-player';
import { PlaybackError } from '@/components/player/playback-error';
import { FavoriteButton } from '@/components/catalog/favorite-button';
import { ErrorState } from '@/components/ui/error-state';
import { ChannelCardSkeleton } from '@/components/ui/skeletons';
import { ArrowLeft, Tv, Globe, Wifi } from 'lucide-react';
import Link from 'next/link';
import { cn, getChannelStatusColor } from '@/lib/utils';
import { ChannelCard } from '@/components/catalog/channel-card';
import type { Channel } from '@/lib/api.types';

export default function WatchPage() {
  const params = useParams();
  const channelId = params.channelId as string;

  // Fetch channel details
  const {
    data: channelData,
    isLoading: channelLoading,
    isError: channelError,
    refetch: refetchChannel,
  } = useQuery({
    queryKey: ['channel', channelId],
    queryFn: async () => {
      const res = await catalogApi.getChannel(channelId);
      return res.data;
    },
    enabled: !!channelId,
  });

  // Create playback session
  const {
    data: sessionData,
    isLoading: sessionLoading,
    isError: sessionError,
    refetch: refetchSession,
  } = useQuery({
    queryKey: ['playback-session', channelId],
    queryFn: async () => {
      const res = await playbackApi.createSession(channelId);
      return res.data;
    },
    enabled: !!channelId,
    retry: 1,
  });

  // Fetch related channels (same category)
  const { data: relatedData } = useQuery({
    queryKey: ['related-channels', channelData?.category?.id],
    queryFn: async () => {
      const res = await catalogApi.getChannels({
        category: channelData!.category.id,
        limit: 10,
      });
      return res.data;
    },
    enabled: !!channelData?.category?.id,
  });

  if (channelLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton aspect-video rounded-xl" />
        <div className="space-y-3">
          <div className="skeleton h-6 w-64" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (channelError) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        <ErrorState
          title="Channel not found"
          message="This channel could not be found or is no longer available."
          onRetry={() => refetchChannel()}
        />
      </div>
    );
  }

  const channel = channelData;
  const session = sessionData;

  if (!channel) return null;

  const playableSources = session?.sources ?? [];
  const isOffline = channel.status === 'offline' || channel.status === 'disabled';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Browse
      </Link>

      {/* Player */}
      {isOffline ? (
        <div className="aspect-video rounded-xl bg-zinc-900 flex flex-col items-center justify-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 text-text-muted">
            <Wifi className="h-7 w-7" />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-text">Channel Offline</p>
            <p className="text-sm text-text-muted mt-1">
              This channel is currently unavailable.
            </p>
          </div>
        </div>
      ) : sessionLoading ? (
        <div className="aspect-video rounded-xl bg-zinc-900 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-text-muted">Starting stream...</p>
          </div>
        </div>
      ) : sessionError ? (
        <PlaybackError
          message="Playback is not available. This channel may not have stream sources configured."
          channelId={channelId}
        />
      ) : playableSources.length > 0 ? (
        <HlsPlayer
          sources={playableSources}
          channelName={channel.title}
        />
      ) : (
        <PlaybackError
          message="No playable sources available for this channel."
          channelId={channelId}
        />
      )}

      {/* Channel info */}
      <div className="flex items-start gap-4">
        {/* Logo */}
        <div className="h-16 w-16 shrink-0 rounded-xl bg-zinc-800 flex items-center justify-center overflow-hidden">
          {channel.logoUrl ? (
            <img
              src={channel.logoUrl}
              alt={`${channel.title} logo`}
              className="h-full w-full object-contain p-2"
            />
          ) : (
            <Tv className="h-8 w-8 text-text-muted" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-text">{channel.title}</h1>
              <div className="flex items-center gap-3 mt-1.5">
                <span
                  className={cn(
                    'inline-block h-2 w-2 rounded-full',
                    getChannelStatusColor(channel.status),
                  )}
                />
                <span className="text-sm text-text-muted capitalize">{channel.status}</span>
                {channel.category && (
                  <>
                    <span className="text-text-muted">·</span>
                    <span className="text-sm text-text-muted">{channel.category.name}</span>
                  </>
                )}
                {channel.language && (
                  <>
                    <span className="text-text-muted">·</span>
                    <Globe className="h-3.5 w-3.5 text-text-muted" />
                    <span className="text-sm text-text-muted">{channel.language}</span>
                  </>
                )}
              </div>
            </div>
            <FavoriteButton channelId={channel.id} size="lg" className="shrink-0" />
          </div>

          {channel.description && (
            <p className="mt-4 text-sm text-text-secondary leading-relaxed max-w-2xl">
              {channel.description}
            </p>
          )}
        </div>
      </div>

      {/* Related channels */}
      {relatedData && relatedData.length > 0 && (
        <section className="space-y-4 pt-4 border-t border-border">
          <h2 className="text-lg font-bold text-text">Related Channels</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {relatedData
              .filter((c: Channel) => c.id !== channel.id)
              .slice(0, 10)
              .map((c: Channel) => (
                <ChannelCard key={c.id} channel={c} />
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
