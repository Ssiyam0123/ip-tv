'use client';

import { Tv } from 'lucide-react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 mb-6">
        <Tv className="h-10 w-10" />
      </div>
      <h1 className="text-2xl font-bold text-text">Something went wrong</h1>
      <p className="mt-2 text-sm text-text-secondary max-w-sm">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
