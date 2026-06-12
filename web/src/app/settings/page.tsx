'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useState } from 'react';
import {
  Settings,
  User,
  Mail,
  Calendar,
  Shield,
  LogOut,
  AlertTriangle,
  Trash2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout, deleteAccount } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  if (!isLoading && !isAuthenticated) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800/50 text-text-muted">
            <Settings className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-semibold text-text">Sign in to manage settings</h2>
          <Link
            href="/auth/sign-in"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="space-y-4">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-32 rounded-xl" />
          <div className="skeleton h-20 rounded-xl" />
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push('/');
    } catch {
      // Already handled in logout
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setError('');
    try {
      await deleteAccount();
      router.push('/');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete account.';
      setError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-text-secondary" />
        <h1 className="text-2xl font-bold text-text">Settings</h1>
      </div>

      {/* Account Info */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
          Account
        </h2>
        <div className="rounded-xl bg-surface border border-border divide-y divide-border">
          <div className="flex items-center gap-3 p-4">
            <User className="h-5 w-5 text-text-muted" />
            <div>
              <p className="text-sm text-text-muted">Display Name</p>
              <p className="text-sm font-medium text-text">
                {user?.displayName ?? 'Not set'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <Mail className="h-5 w-5 text-text-muted" />
            <div>
              <p className="text-sm text-text-muted">Email</p>
              <p className="text-sm font-medium text-text">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <Shield className="h-5 w-5 text-text-muted" />
            <div>
              <p className="text-sm text-text-muted">Role</p>
              <p className="text-sm font-medium text-text capitalize">{user?.role}</p>
            </div>
          </div>
          {user?.createdAt && (
            <div className="flex items-center gap-3 p-4">
              <Calendar className="h-5 w-5 text-text-muted" />
              <div>
                <p className="text-sm text-text-muted">Member Since</p>
                <p className="text-sm font-medium text-text">
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Actions */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
          Actions
        </h2>
        <div className="space-y-3">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={cn(
              'w-full flex items-center justify-between rounded-xl bg-surface border border-border p-4 transition-colors',
              'hover:bg-surface-hover disabled:opacity-50',
            )}
          >
            <div className="flex items-center gap-3">
              <LogOut className="h-5 w-5 text-text-muted" />
              <div className="text-left">
                <p className="text-sm font-medium text-text">Sign Out</p>
                <p className="text-xs text-text-muted">
                  Sign out of your account on this device
                </p>
              </div>
            </div>
            {isLoggingOut && <Loader2 className="h-5 w-5 animate-spin text-text-muted" />}
          </button>

          {/* Delete account */}
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center gap-3 rounded-xl bg-red-500/5 border border-red-500/10 p-4 text-left transition-colors hover:bg-red-500/10"
            >
              <Trash2 className="h-5 w-5 text-danger" />
              <div>
                <p className="text-sm font-medium text-danger">Delete Account</p>
                <p className="text-xs text-text-muted">
                  Permanently delete your account and all data
                </p>
              </div>
            </button>
          ) : (
            <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-danger">Are you sure?</p>
                  <p className="text-xs text-text-muted mt-1">
                    This action is permanent and cannot be undone. All your data,
                    including favorites, will be deleted.
                  </p>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-xs text-red-400">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:text-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className={cn(
                    'flex-1 rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition-colors',
                    'hover:bg-danger-hover disabled:opacity-50',
                    'flex items-center justify-center gap-2',
                  )}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete My Account'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
