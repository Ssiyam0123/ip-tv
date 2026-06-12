'use client';

import { cn } from '@/lib/utils';

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function ChannelCardSkeleton() {
  return (
    <div className="group relative overflow-hidden rounded-xl bg-surface border border-border p-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Skeleton className="h-14 w-14 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function ChannelGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ChannelCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ScoreCardSkeleton() {
  return (
    <div className="flex shrink-0 w-64 flex-col gap-3 rounded-xl bg-surface border border-border p-4">
      <Skeleton className="h-3 w-16" />
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-6 w-8" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function ScoreRailSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <ScoreCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CategoryChipsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="flex gap-2 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-20 rounded-full shrink-0" />
      ))}
    </div>
  );
}

export function MatchDetailSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-center gap-8 py-12">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-10 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}
