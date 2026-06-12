import { z } from 'zod';
import type { Response } from 'express';

export const paginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

export interface PageResponse<T> {
  data: T[];
  page: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

export function createPageResponse<T>(
  items: T[],
  limit: number,
  getCursor: (item: T) => string,
): PageResponse<T> {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? getCursor(data[data.length - 1]) : null;

  return {
    data,
    page: {
      nextCursor,
      hasMore,
      limit,
    },
  };
}

export function sendPaginated<T>(
  res: Response,
  items: T[],
  limit: number,
  getCursor: (item: T) => string,
): void {
  const response = createPageResponse(items, limit, getCursor);
  res.json(response);
}
