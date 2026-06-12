import { Tv } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover">
          <Tv className="h-6 w-6 text-white" />
        </div>
        <div className="h-1 w-24 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full w-1/2 rounded-full bg-primary animate-pulse" />
        </div>
      </div>
    </div>
  );
}
