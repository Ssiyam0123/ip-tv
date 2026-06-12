'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { adminApi } from '@/lib/api-client';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { Radio, Save, X, Search } from 'lucide-react';
import type { AdminSource, PatchSourceInput } from '@/lib/api.types';

export function AdminSourcesTab() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PatchSourceInput>>({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-sources'],
    queryFn: async () => {
      const res = await adminApi.getSources();
      return res;
    },
  });

  const patchMutation = useMutation({
    mutationFn: ({ sourceId, input }: { sourceId: string; input: PatchSourceInput }) =>
      adminApi.patchSource(sourceId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sources'] });
      setEditId(null);
      setEditForm({});
    },
  });

  const sources = data?.data ?? [];
  const filtered = searchQuery
    ? sources.filter(
        (s) =>
          s.channel.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.provider.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : sources;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-emerald-500 bg-emerald-500/10';
      case 'degraded': return 'text-amber-500 bg-amber-500/10';
      case 'offline': return 'text-red-500 bg-red-500/10';
      default: return 'text-zinc-500 bg-zinc-500/10';
    }
  };

  const startEdit = (source: AdminSource) => {
    setEditId(source.id);
    setEditForm({
      quality: source.quality,
      priority: source.priority,
      status: source.status as PatchSourceInput['status'],
      licenseStatus: source.licenseStatus ?? undefined,
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditForm({});
  };

  const saveEdit = (sourceId: string) => {
    const input: PatchSourceInput = {};
    if (editForm.quality !== undefined) input.quality = editForm.quality;
    if (editForm.priority !== undefined) input.priority = editForm.priority;
    if (editForm.status !== undefined) input.status = editForm.status;
    if (editForm.licenseStatus !== undefined) input.licenseStatus = editForm.licenseStatus;
    if (Object.keys(input).length > 0) {
      patchMutation.mutate({ sourceId, input });
    } else {
      setEditId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErrorState message="Failed to load sources" onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search sources..."
          className="w-full rounded-lg bg-surface border border-border pl-9 pr-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Radio className="h-8 w-8" />}
          title={searchQuery ? 'No sources match your search' : 'No stream sources found'}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((source) => (
            <div
              key={source.id}
              className="rounded-xl bg-surface border border-border p-4 transition-colors hover:border-border-hover"
            >
              {editId === source.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-text-muted block mb-1">Quality</label>
                      <input
                        value={editForm.quality ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, quality: e.target.value }))}
                        className="w-full rounded-lg bg-background border border-border px-3 py-1.5 text-sm text-text"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted block mb-1">Priority</label>
                      <input
                        type="number"
                        value={editForm.priority ?? 0}
                        onChange={(e) => setEditForm((f) => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
                        className="w-full rounded-lg bg-background border border-border px-3 py-1.5 text-sm text-text"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted block mb-1">Status</label>
                      <select
                        value={editForm.status ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as PatchSourceInput['status'] }))}
                        className="w-full rounded-lg bg-background border border-border px-3 py-1.5 text-sm text-text"
                      >
                        <option value="active">Active</option>
                        <option value="degraded">Degraded</option>
                        <option value="offline">Offline</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-text-muted block mb-1">License</label>
                      <input
                        value={editForm.licenseStatus ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, licenseStatus: e.target.value }))}
                        className="w-full rounded-lg bg-background border border-border px-3 py-1.5 text-sm text-text"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => saveEdit(source.id)}
                      disabled={patchMutation.isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-text truncate">{source.channel.title}</h3>
                      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize', getStatusColor(source.status))}>
                        {source.status}
                      </span>
                      {source.licenseStatus && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-blue-400 bg-blue-500/10">
                          {source.licenseStatus}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-text-muted">{source.quality}</span>
                      <span className="text-xs text-text-muted">· Priority {source.priority}</span>
                      <span className="text-xs text-text-muted">· {source.provider.name}</span>
                      <span className="text-xs text-text-muted">· {source._count.streamHealthChecks} checks</span>
                    </div>
                  </div>
                  <button
                    onClick={() => startEdit(source)}
                    className="shrink-0 rounded-lg bg-surface-hover px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text transition-colors"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
