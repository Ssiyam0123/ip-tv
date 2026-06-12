'use client';

import Link from 'next/link';
import { Play, Tv } from 'lucide-react';
import { cn, getChannelStatusColor } from '@/lib/utils';
import { FavoriteButton } from './favorite-button';
import type { Channel } from '@/lib/api.types';

interface ChannelCardProps {
  channel: Channel;
}

export function ChannelCard({ channel }: ChannelCardProps) {
  return (
    <Link
      href={`/watch/${channel.id}`}
      className="group relative overflow-hidden rounded-xl bg-surface border border-border p-4 transition-all duration-300 hover:border-primary/30 hover:bg-surface-hover hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98]"
    >
      <div className="flex items-center gap-3">
        {/* Logo */}
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-800 flex items-center justify-center">
          {channel.logoUrl ? (
            <img
              src={channel.logoUrl}
              alt={`${channel.title} logo`}
              className="h-full w-full object-contain p-1"
              loading="lazy"
            />
          ) : (
            <Tv className="h-6 w-6 text-text-muted" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-text truncate group-hover:text-primary transition-colors">
            {channel.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={cn(
                'inline-block h-1.5 w-1.5 rounded-full',
                getChannelStatusColor(channel.status),
              )}
              aria-label={`Status: ${channel.status}`}
            />
            <span className="text-xs text-text-muted truncate">
              {channel.category?.name}
            </span>
          </div>
        </div>

        {/* Play overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/90 text-white shadow-lg">
            <Play className="h-5 w-5 ml-0.5" />
          </div>
        </div>

        {/* Favorite button (top-right) */}
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <FavoriteButton channelId={channel.id} size="sm" />
        </div>
      </div>
    </Link>
  );
}
