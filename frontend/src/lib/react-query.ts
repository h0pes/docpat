/**
 * React Query Configuration
 *
 * Configures React Query (TanStack Query) with optimized defaults
 * for the application's data fetching and caching needs.
 */

import { QueryClient, DefaultOptions } from '@tanstack/react-query';

/**
 * Default options for React Query
 */
const queryConfig: DefaultOptions = {
  queries: {
    // Time before a query is considered stale (5 minutes)
    staleTime: 1000 * 60 * 5,
    // Time to keep unused data in cache (10 minutes)
    gcTime: 1000 * 60 * 10,
    // Retry failed requests
    retry: 1,
    // Refetch on window focus (useful for medical data freshness)
    refetchOnWindowFocus: true,
    // Refetch on reconnect
    refetchOnReconnect: true,
  },
  mutations: {
    // Retry failed mutations
    retry: 1,
  },
};

/**
 * Create and export the React Query client
 */
export const queryClient = new QueryClient({
  defaultOptions: queryConfig,
});
