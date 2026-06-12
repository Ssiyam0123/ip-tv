'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { favoritesApi } from '@/lib/api-client';
import { ChannelCard } from '@/components/catalog/channel-card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ChannelGridSkeleton } from '@/components/ui/skeletons';
import { Heart, LogIn, Tv } from 'lucide-react';
import type { FavoriteItem, Channel } from '@/lib/api.types';

export default function FavoritesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const {
    data: favoritesData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      const res = await favoritesApi.getFavorites();
      return res;
    },
    enabled: isAuthenticated,
  });

  // Guest user
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <EmptyState
          icon={<Heart className="h-8 w-8" />}
          title="Sign in to save favorites"
          description="Save your favorite channels for quick access. Create an account or sign in to get started."
          action={
            <Link
              href="/auth/sign-in"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Link>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        <div className="skeleton h-8 w-48" />
        <ChannelGridSkeleton count={6} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        <ErrorState
          title="Failed to load favorites"
          message="We couldn't load your favorite channels."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const items = favoritesData?.data ?? [];

  const channels: Channel[] = items.map((f: FavoriteItem) => ({
    id: f.channel.id,
    title: f.channel.title,
    slug: f.channel.slug,
    description: f.channel.description ?? null,
    logoUrl: f.channel.logoUrl,
    status: f.channel.status as Channel['status'],
    language: f.channel.language ?? null,
    countryCode: f.channel.countryCode ?? null,
    category: f.channel.category,
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Heart className="h-6 w-6 text-red-500" />
        <h1 className="text-2xl font-bold text-text">My Favorites</h1>
      </div>

      {channels.length === 0 ? (
        <EmptyState
          icon={<Tv className="h-8 w-8" />}
          title="No favorites yet"
          description="Start adding channels to your favorites for quick access."
          action={
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
            >
              <Tv className="h-4 w-4" />
              Browse Channels
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {channels.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </div>
      )}
    </div>
  );
}
