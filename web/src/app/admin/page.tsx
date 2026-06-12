'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { AdminChannelsTab } from './channels-tab';
import { AdminSourcesTab } from './sources-tab';
import { AdminHealthTab } from './health-tab';
import { AdminSyncTab } from './sync-tab';
import { Shield, ShieldOff, LayoutDashboard, Tv, Radio, Activity, RefreshCw, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'channels', label: 'Channels', icon: Tv },
  { id: 'sources', label: 'Sources', icon: Radio },
  { id: 'health', label: 'Health Checks', icon: Activity },
  { id: 'sync', label: 'Sync Runs', icon: RefreshCw },
] as const;

type TabId = (typeof tabs)[number]['id'];

export default function AdminPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const isAdmin = user?.role === 'admin';

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="skeleton h-8 w-48 mb-8" />
        <div className="skeleton h-96 rounded-xl" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShieldOff className="h-16 w-16 text-text-muted" />
        <h1 className="text-2xl font-bold text-text">Admin Access Required</h1>
        <p className="text-text-secondary">Sign in with an admin account to access the admin panel.</p>
        <Link
          href="/auth/sign-in"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShieldOff className="h-16 w-16 text-text-muted" />
        <h1 className="text-2xl font-bold text-text">Access Denied</h1>
        <p className="text-text-secondary">You need administrator privileges to access this page.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
        >
          Go Home
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Back to main app */}
      <a
        href="/"
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to App
      </a>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text">Admin Panel</h1>
          <p className="text-sm text-text-muted">Manage channels, sources, and system settings</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-border pb-1" role="tablist">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={cn(
                'flex items-center gap-2 shrink-0 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2',
                activeTab === tab.id
                  ? 'text-primary border-primary bg-primary/5'
                  : 'text-text-secondary hover:text-text border-transparent hover:bg-surface-hover',
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[60vh]">
        {activeTab === 'overview' && <AdminOverviewTab />}
        {activeTab === 'channels' && <AdminChannelsTab />}
        {activeTab === 'sources' && <AdminSourcesTab />}
        {activeTab === 'health' && <AdminHealthTab />}
        {activeTab === 'sync' && <AdminSyncTab />}
      </div>
    </div>
  );
}

function AdminOverviewTab() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Channels"
          value="—"
          description="Active and inactive channels"
          icon={Tv}
        />
        <StatCard
          title="Stream Sources"
          value="—"
          description="Across all channels"
          icon={Radio}
        />
        <StatCard
          title="Health Checks"
          value="—"
          description="Latest stream status"
          icon={Activity}
        />
        <StatCard
          title="Sync Runs"
          value="—"
          description="Catalog synchronization"
          icon={RefreshCw}
        />
      </div>

      <div className="rounded-xl bg-surface border border-border p-8 flex flex-col items-center justify-center gap-4 text-center">
        <LayoutDashboard className="h-12 w-12 text-text-muted" />
        <div>
          <h3 className="text-lg font-semibold text-text">Admin Dashboard</h3>
          <p className="text-sm text-text-muted max-w-md mt-1">
            Use the tabs above to manage channels, stream sources, view health checks, and trigger catalog syncs.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl bg-surface border border-border p-5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-muted">{title}</span>
        <Icon className="h-4 w-4 text-text-muted" />
      </div>
      <p className="text-3xl font-bold text-text">{value}</p>
      <p className="text-xs text-text-muted">{description}</p>
    </div>
  );
}
