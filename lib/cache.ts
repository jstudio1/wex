import { cache } from 'react';

/**
 * Cache configuration for different data types
 */
export const CACHE_CONFIG = {
  // Data that changes frequently (revalidate every 30 seconds)
  DYNAMIC: { next: { revalidate: 30 } },
  
  // Data that changes moderately (revalidate every 2 minutes)
  MODERATE: { next: { revalidate: 120 } },
  
  // Data that changes rarely (revalidate every 10 minutes)
  STATIC: { next: { revalidate: 600 } },
  
  // User-specific data (should not be cached on server, use client-side caching)
  USER_SPECIFIC: { cache: 'no-store' as const },
} as const;

/**
 * React cache wrapper to deduplicate requests within the same render
 * Use this for Server Components that might be called multiple times
 */
export function cachedFetch<T>(
  fn: () => Promise<T>,
  key?: string
): Promise<T> {
  return cache(async () => {
    return await fn();
  })();
}

/**
 * Create a cached fetch function with specific cache strategy
 */
export function createCachedFetch(cacheStrategy: RequestCache | { next: { revalidate: number } }) {
  return async (url: string, options?: RequestInit) => {
    return fetch(url, {
      ...options,
      cache: typeof cacheStrategy === 'string' ? cacheStrategy : undefined,
      next: typeof cacheStrategy === 'object' && 'next' in cacheStrategy ? cacheStrategy.next : undefined,
    });
  };
}

