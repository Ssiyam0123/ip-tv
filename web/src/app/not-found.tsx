import Link from 'next/link';
import { Tv } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-800/50 text-text-muted mb-6">
        <Tv className="h-10 w-10" />
      </div>
      <h1 className="text-4xl font-black text-text">404</h1>
      <p className="mt-2 text-lg text-text-secondary">Channel not found</p>
      <p className="mt-1 text-sm text-text-muted max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
      >
        <Tv className="h-4 w-4" />
        Browse Channels
      </Link>
    </div>
  );
}
