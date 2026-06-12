'use client';

import { ChannelCard } from './channel-card';
import { ChannelCardSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Tv, RefreshCw } from 'lucide-react';
import type { Channel } from '@/lib/api.types';

interface ChannelGridProps {
  channels: Channel[];
  isLoading: boolean;
  isError: boolean;
  hasMore: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
}

export function ChannelGrid({
  channels,
  isLoading,
  isError,
  hasMore,
  isFetchingNextPage,
  onLoadMore,
  onRetry,
}: ChannelGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: 20 }).map((_, i) => (
          <ChannelCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load channels"
        message="We couldn't load the channel list. Please check your connection."
        onRetry={onRetry}
      />
    );
  }

  if (channels.length === 0) {
    return (
      <EmptyState
        icon={<Tv className="h-8 w-8" />}
        title="No channels found"
        description="Try a different category or search term."
      />
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {channels.map((channel) => (
          <ChannelCard key={channel.id} channel={channel} />
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-text-secondary hover:text-text hover:bg-surface-hover transition-colors disabled:opacity-50"
          >
            {isFetchingNextPage ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
