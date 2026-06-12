'use client';

import { PackageOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-16 px-6 text-center animate-fade-in',
        className,
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800/50 text-text-muted">
        {icon ?? <PackageOpen className="h-8 w-8" />}
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-text">{title}</h3>
        {description && (
          <p className="max-w-sm text-sm text-text-secondary">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
