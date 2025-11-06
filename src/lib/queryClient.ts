import { QueryClient } from '@tanstack/react-query';

/**
 * TanStack Query Client Configuration
 * 
 * This configuration optimizes data fetching with:
 * - Automatic caching and background refetching
 * - Stale-while-revalidate strategy
 * - Retry logic for failed requests
 * - Window focus refetching
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes
      staleTime: 1000 * 60 * 5,
      
      // Unused data is garbage collected after 30 minutes
      gcTime: 1000 * 60 * 30,
      
      // Retry failed requests up to 3 times
      retry: 3,
      
      // Refetch when window regains focus
      refetchOnWindowFocus: true,
      
      // Refetch when network reconnects
      refetchOnReconnect: true,
      
      // Show stale data while refetching in background
      refetchOnMount: 'always',
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      
      // Timeout for mutations (30 seconds)
      gcTime: 1000 * 30,
    },
  },
});
