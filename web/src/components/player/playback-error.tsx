'use client';

import { AlertTriangle, RefreshCw, Tv } from 'lucide-react';
import Link from 'next/link';

interface PlaybackErrorProps {
  message?: string;
  channelId?: string;
}

export function PlaybackError({
  message = 'Unable to play this channel.',
  channelId,
}: PlaybackErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 px-6 text-center animate-fade-in">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 text-red-500">
        <AlertTriangle className="h-10 w-10" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-text">Playback Error</h2>
        <p className="max-w-md text-sm text-text-secondary">{message}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
        {channelId && (
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text hover:bg-surface-hover transition-colors"
          >
            <Tv className="h-4 w-4" />
            Browse Channels
          </Link>
        )}
      </div>
    </div>
  );
}
