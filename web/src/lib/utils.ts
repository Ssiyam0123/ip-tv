export function cn(...inputs: (string | false | null | undefined | Record<string, boolean | undefined | null>)[]): string {
  return inputs
    .filter(Boolean)
    .map((input) => {
      if (typeof input === 'string') return input;
      if (typeof input === 'object' && input !== null) {
        return Object.entries(input)
          .filter(([, value]) => Boolean(value))
          .map(([key]) => key)
          .join(' ');
      }
      return '';
    })
    .join(' ');
}

export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return '-';
  return String(score);
}

export function getMatchStatusLabel(state: string): string {
  switch (state) {
    case 'scheduled':
      return 'Scheduled';
    case 'live':
      return 'LIVE';
    case 'finished':
      return 'Finished';
    case 'postponed':
      return 'Postponed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return state;
  }
}

export function getMatchStatusVariant(state: string): 'live' | 'scheduled' | 'finished' | 'neutral' {
  switch (state) {
    case 'live':
      return 'live';
    case 'scheduled':
      return 'scheduled';
    case 'finished':
      return 'finished';
    default:
      return 'neutral';
  }
}

export function formatMatchTime(startTime: string): string {
  const date = new Date(startTime);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffHours < 0) {
    // Already started or finished
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  if (diffHours < 24) {
    return `In ${diffHours}h`;
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getChannelStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-500';
    case 'degraded':
      return 'bg-amber-500';
    case 'offline':
      return 'bg-red-500';
    default:
      return 'bg-zinc-500';
  }
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
