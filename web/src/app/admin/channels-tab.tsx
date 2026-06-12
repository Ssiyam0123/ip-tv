'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { adminApi, catalogApi } from '@/lib/api-client';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { Tv, Search, Save, X, Check, AlertTriangle } from 'lucide-react';
import type { AdminChannel, PatchChannelInput, Category } from '@/lib/api.types';

export function AdminChannelsTab() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PatchChannelInput>>({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-channels'],
    queryFn: async () => {
      const res = await adminApi.getChannels();
      return res;
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await catalogApi.getCategories();
      return res.data;
    },
  });

  const patchMutation = useMutation({
    mutationFn: ({ channelId, input }: { channelId: string; input: PatchChannelInput }) =>
      adminApi.patchChannel(channelId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-channels'] });
      setEditId(null);
      setEditForm({});
    },
  });

  const channels = data?.data ?? [];
  const filtered = searchQuery
    ? channels.filter(
        (c) =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.slug.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : channels;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-emerald-500 bg-emerald-500/10';
      case 'degraded': return 'text-amber-500 bg-amber-500/10';
      case 'offline': return 'text-red-500 bg-red-500/10';
      default: return 'text-zinc-500 bg-zinc-500/10';
    }
  };

  const startEdit = (channel: AdminChannel) => {
    setEditId(channel.id);
    setEditForm({
      title: channel.title,
      status: channel.status as PatchChannelInput['status'],
      language: channel.language ?? undefined,
      countryCode: channel.countryCode ?? undefined,
      categoryId: channel.category.id,
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditForm({});
  };

  const saveEdit = (channelId: string) => {
    const input: PatchChannelInput = {};
    if (editForm.title !== undefined) input.title = editForm.title;
    if (editForm.status !== undefined) input.status = editForm.status;
    if (editForm.language !== undefined) input.language = editForm.language;
    if (editForm.countryCode !== undefined) input.countryCode = editForm.countryCode;
    if (editForm.categoryId !== undefined) input.categoryId = editForm.categoryId;
    if (Object.keys(input).length > 0) {
      patchMutation.mutate({ channelId, input });
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
    return <ErrorState message="Failed to load channels" onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search channels..."
          className="w-full rounded-lg bg-surface border border-border pl-9 pr-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Tv className="h-8 w-8" />}
          title={searchQuery ? 'No channels match your search' : 'No channels found'}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((channel) => (
            <div
              key={channel.id}
              className="rounded-xl bg-surface border border-border p-4 transition-colors hover:border-border-hover"
            >
              {editId === channel.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-text-muted block mb-1">Title</label>
                      <input
                        value={editForm.title ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                        className="w-full rounded-lg bg-background border border-border px-3 py-1.5 text-sm text-text"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted block mb-1">Status</label>
                      <select
                        value={editForm.status ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as PatchChannelInput['status'] }))}
                        className="w-full rounded-lg bg-background border border-border px-3 py-1.5 text-sm text-text"
                      >
                        <option value="active">Active</option>
                        <option value="degraded">Degraded</option>
                        <option value="offline">Offline</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-text-muted block mb-1">Language</label>
                      <input
                        value={editForm.language ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, language: e.target.value }))}
                        className="w-full rounded-lg bg-background border border-border px-3 py-1.5 text-sm text-text"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted block mb-1">Category</label>
                      <select
                        value={editForm.categoryId ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, categoryId: e.target.value }))}
                        className="w-full rounded-lg bg-background border border-border px-3 py-1.5 text-sm text-text"
                      >
                        {(categoriesData ?? []).map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {patchMutation.isPending && (
                    <div className="flex items-center gap-2 text-sm text-amber-500">
                      <AlertTriangle className="h-4 w-4" />
                      Saving...
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => saveEdit(channel.id)}
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
                      <h3 className="font-semibold text-sm text-text truncate">{channel.title}</h3>
                      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize', getStatusColor(channel.status))}>
                        {channel.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-text-muted">{channel.slug}</span>
                      <span className="text-xs text-text-muted">·</span>
                      <span className="text-xs text-text-muted">{channel.category.name}</span>
                      {channel.language && (
                        <>
                          <span className="text-xs text-text-muted">·</span>
                          <span className="text-xs text-text-muted">{channel.language}</span>
                        </>
                      )}
                      <span className="text-xs text-text-muted">·</span>
                      <span className="text-xs text-text-muted">{channel._count.streamSources} sources</span>
                      <span className="text-xs text-text-muted">·</span>
                      <span className="text-xs text-text-muted">{channel._count.favorites} favorites</span>
                    </div>
                  </div>
                  <button
                    onClick={() => startEdit(channel)}
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
