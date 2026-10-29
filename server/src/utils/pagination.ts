import { z } from 'zod';

export interface Pagination {
  page: number;
  limit: number;
  skip: number;
}

export function parsePagination(
  page: unknown,
  limit: unknown,
  defaultLimit = 25,
  maximumLimit = 100,
): Pagination | null {
  const parsedPage = z.coerce.number().int().min(1).max(1_000_000).safeParse(page ?? '1');
  const parsedLimit = z.coerce.number().int().min(1).max(maximumLimit).safeParse(limit ?? String(defaultLimit));

  if (!parsedPage.success || !parsedLimit.success) {
    return null;
  }

  return {
    page: parsedPage.data,
    limit: parsedLimit.data,
    skip: (parsedPage.data - 1) * parsedLimit.data,
  };
}
