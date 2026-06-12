'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { adminApi } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { RefreshCw, CheckCircle, XCircle, Loader2, Timer, List, AlertTriangle } from 'lucide-react';

export function AdminSyncTab() {
  const queryClient = useQueryClient();
  const [syncResult, setSyncResult] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const triggerMutation = useMutation({
    mutationFn: () => adminApi.triggerSync(),
    onSuccess: (data) => {
      const run = data.data;
      setSyncResult({
        type: 'success',
        message: `Sync run ${run.id.slice(0, 8)}… started successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-channels'] });
    },
    onError: (err: Error) => {
      setSyncResult({
        type: 'error',
        message: err.message || 'Failed to trigger sync.',
      });
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Trigger Sync */}
      <div className="rounded-xl bg-surface border border-border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-text">Catalog Synchronization</h3>
            <p className="text-sm text-text-muted">
              Trigger a full catalog sync across all providers to refresh channels and stream sources.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setSyncResult(null);
            triggerMutation.mutate();
          }}
          disabled={triggerMutation.isPending}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white transition-all',
            'hover:bg-primary-hover active:scale-[0.98]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {triggerMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Triggering Sync...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Trigger Sync Now
            </>
          )}
        </button>

        {syncResult && (
          <div
            className={cn(
              'flex items-start gap-3 rounded-lg p-4 text-sm',
              syncResult.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
                : 'bg-red-500/10 border border-red-500/20 text-red-400',
            )}
          >
            {syncResult.type === 'success' ? (
              <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
            )}
            <span>{syncResult.message}</span>
          </div>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-surface border border-border p-4 space-y-2">
          <Timer className="h-5 w-5 text-text-muted" />
          <p className="text-sm font-medium text-text">Scheduled Syncs</p>
          <p className="text-xs text-text-muted">
            Automatic syncs run every 5 minutes based on the SYNC_INTERVAL_MS configuration.
          </p>
        </div>
        <div className="rounded-xl bg-surface border border-border p-4 space-y-2">
          <List className="h-5 w-5 text-text-muted" />
          <p className="text-sm font-medium text-text">Sync History</p>
          <p className="text-xs text-text-muted">
            View detailed sync run logs through the admin API at <code className="text-primary">GET /admin/sync-runs/:runId</code>.
          </p>
        </div>
        <div className="rounded-xl bg-surface border border-border p-4 space-y-2">
          <AlertTriangle className="h-5 w-5 text-text-muted" />
          <p className="text-sm font-medium text-text">Failure Handling</p>
          <p className="text-xs text-text-muted">
            Failed syncs are logged with error messages and failure counts for debugging.
          </p>
        </div>
      </div>
    </div>
  );
}
