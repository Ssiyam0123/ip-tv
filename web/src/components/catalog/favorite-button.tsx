'use client';

import { Heart } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { favoritesApi } from '@/lib/api-client';
import type { FavoriteItem } from '@/lib/api.types';

interface FavoriteButtonProps {
  channelId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FavoriteButton({
  channelId,
  size = 'md',
  className,
}: FavoriteButtonProps) {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isMutating, setIsMutating] = useState(false);

  // Fetch the user's favorites list
  const { data: favoritesData } = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      try {
        const res = await favoritesApi.getFavorites();
        return res;
      } catch (err: any) {
        // If query fails due to expired/invalid token, log out locally
        if (
          err.message?.toLowerCase().includes('expired') ||
          err.message?.toLowerCase().includes('token') ||
          err.code === 'UNAUTHORIZED'
        ) {
          await logout();
        }
        throw err;
      }
    },
    enabled: isAuthenticated,
    retry: false, // Do not retry on authentication errors
  });

  // Dynamically compute if the channel is favorited
  const isFavorited = favoritesData?.data?.some(
    (item: FavoriteItem) => item.channel.id === channelId
  ) ?? false;

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      router.push('/auth/sign-in');
      return;
    }

    setIsMutating(true);
    try {
      if (isFavorited) {
        await favoritesApi.removeFavorite(channelId);
      } else {
        await favoritesApi.addFavorite(channelId);
      }
      // Invalidate the favorites query cache to instantly sync all buttons and views
      await queryClient.invalidateQueries({ queryKey: ['favorites'] });
    } catch (err: any) {
      console.error('Failed to toggle favorite status:', err);
      // Clean up local session and redirect if token is expired/invalid
      if (
        err.message?.toLowerCase().includes('expired') ||
        err.message?.toLowerCase().includes('token') ||
        err.code === 'UNAUTHORIZED'
      ) {
        await logout();
        router.push('/auth/sign-in');
      }
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isMutating}
      className={cn(
        'rounded-full transition-all duration-200',
        'hover:bg-white/10',
        isFavorited && 'text-red-500 hover:text-red-400',
        !isFavorited && 'text-white/70 hover:text-white',
        sizeClasses[size],
        isMutating && 'opacity-50 cursor-not-allowed',
        className,
      )}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart
        className={cn(
          iconSizes[size],
          'transition-all',
          isFavorited && 'fill-current',
        )}
      />
    </button>
  );
}
