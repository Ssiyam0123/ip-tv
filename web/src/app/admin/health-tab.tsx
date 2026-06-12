'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api-client';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { Activity, Wifi, Clock, AlertTriangle } from 'lucide-react';
import type { HealthCheckChannel } from '@/lib/api.types';

export function AdminHealthTab() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-health-checks'],
    queryFn: async () => {
      const res = await adminApi.getHealthChecks();
      return res;
    },
  });

  const channels = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErrorState message="Failed to load health checks" onRetry={() => refetch()} />;
  }

  if (channels.length === 0) {
    return (
      <EmptyState
        icon={<Activity className="h-8 w-8" />}
        title="No health checks recorded"
        description="Health checks will appear here once the system starts monitoring stream sources."
      />
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-emerald-500';
      case 'degraded': return 'text-amber-500';
      default: return 'text-red-500';
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {channels.map((channel: HealthCheckChannel) => {
        const lastCheck = channel.streamHealthChecks[0];
        const latestLatency = lastCheck?.latencyMs;
        const latestStatus = lastCheck?.httpStatus;

        return (
          <div
            key={channel.id}
            className="rounded-xl bg-surface border border-border p-4 space-y-3"
          >
            {/* Channel header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full', getStatusColor(channel.status))} />
                <h3 className="font-semibold text-sm text-text">{channel.title}</h3>
                <span className="text-xs text-text-muted capitalize">({channel.status})</span>
              </div>
              {latestStatus && (
                <span className={cn(
                  'text-xs font-medium px-2 py-0.5 rounded-full',
                  latestStatus >= 200 && latestStatus < 300 ? 'text-emerald-500 bg-emerald-500/10' :
                  latestStatus >= 400 ? 'text-red-500 bg-red-500/10' :
                  'text-amber-500 bg-amber-500/10'
                )}>
                  HTTP {latestStatus}
                </span>
              )}
            </div>

            {/* Latency graph bar */}
            {channel.streamHealthChecks.length > 0 && (
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {latestLatency != null ? `${latestLatency}ms` : 'N/A'}
                </span>
                <span className="flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5" />
                  {channel.streamHealthChecks.length} checks
                </span>
                <span className="text-text-muted">
                  Last check: {new Date(lastCheck?.checkedAt ?? '').toLocaleString()}
                </span>
              </div>
            )}

            {/* Recent checks history */}
            {channel.streamHealthChecks.length > 0 && (
              <div className="flex gap-1.5">
                {channel.streamHealthChecks.slice(0, 5).map((check) => (
                  <div
                    key={check.id}
                    className={cn(
                      'h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-bold transition-colors',
                      check.httpStatus != null && check.httpStatus >= 200 && check.httpStatus < 300
                        ? 'bg-emerald-500/20 text-emerald-500'
                        : check.failureReason
                          ? 'bg-red-500/20 text-red-500'
                          : 'bg-zinc-700/50 text-zinc-500',
                    )}
                    title={check.failureReason ?? `HTTP ${check.httpStatus}`}
                  >
                    {check.httpStatus ?? '?'}
                  </div>
                ))}
              </div>
            )}

            {/* Failure info */}
            {lastCheck?.failureReason && (
              <div className="flex items-start gap-2 rounded-lg bg-red-500/5 border border-red-500/10 px-3 py-2">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <span className="text-xs text-red-400">{lastCheck.failureReason}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
