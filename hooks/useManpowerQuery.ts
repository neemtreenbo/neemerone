'use client';

import { useState, useEffect, useCallback } from 'react';
import { ManpowerRecord } from '@/lib/types/database';
import { fetchManpowerData, type ManpowerDataResult } from '@/lib/data/manpower';

export interface UseManpowerQueryOptions {
  /**
   * Enable automatic data fetching on component mount
   * @default true
   */
  enabled?: boolean;

  /**
   * Refetch interval in milliseconds
   * @default undefined (no auto-refetch)
   */
  refetchInterval?: number;

  /**
   * Cache duration in milliseconds
   * @default 5 * 60 * 1000 (5 minutes)
   */
  cacheTime?: number;
}

export interface UseManpowerQueryResult {
  /** Manpower data with hierarchy levels */
  data: (ManpowerRecord & { hierarchy_level?: string })[] | null;

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: Error | null;

  /** Manual refetch function */
  refetch: () => Promise<void>;

  /** Clear cache and refetch */
  invalidate: () => Promise<void>;

  /** Loading state for manual refetch operations */
  isRefetching: boolean;
}

// Simple in-memory cache
interface CacheEntry {
  data: ManpowerDataResult;
  timestamp: number;
}

let cache: CacheEntry | null = null;

/**
 * Custom hook for fetching and managing manpower data
 * Includes caching, loading states, and refetch capabilities
 */
export function useManpowerQuery(options: UseManpowerQueryOptions = {}): UseManpowerQueryResult {
  const {
    enabled = true,
    refetchInterval,
    cacheTime = 5 * 60 * 1000 // 5 minutes default cache
  } = options;

  const [data, setData] = useState<(ManpowerRecord & { hierarchy_level?: string })[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefetching, setIsRefetching] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (isManualRefetch = false) => {
    // Check cache first (unless it's a manual refetch)
    if (!isManualRefetch && cache) {
      const now = Date.now();
      const cacheAge = now - cache.timestamp;

      if (cacheAge < cacheTime) {
        // Use cached data
        if (cache.data.data) {
          setData(cache.data.data);
          setError(cache.data.error);
        }
        return;
      }
    }

    // Set loading states
    if (isManualRefetch) {
      setIsRefetching(true);
    } else if (!data) {
      setIsLoading(true);
    }

    try {
      const result = await fetchManpowerData();

      // Update cache
      cache = {
        data: result,
        timestamp: Date.now()
      };

      setData(result.data);
      setError(result.error);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch manpower data');
      setError(error);
      setData(null);
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, [cacheTime, data]);

  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  const invalidate = useCallback(async () => {
    // Clear cache
    cache = null;
    await fetchData(true);
  }, [fetchData]);

  // Initial data fetch
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [enabled, fetchData]);

  // Auto-refetch interval
  useEffect(() => {
    if (enabled && refetchInterval && refetchInterval > 0) {
      const interval = setInterval(() => {
        fetchData(true);
      }, refetchInterval);

      return () => clearInterval(interval);
    }
  }, [enabled, refetchInterval, fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch,
    invalidate,
    isRefetching
  };
}

/**
 * Hook for getting manpower statistics without the full data
 */
export function useManpowerStats(options?: UseManpowerQueryOptions) {
  const { data, isLoading, error } = useManpowerQuery(options);

  const stats = data ? {
    totalActive: data.filter(record => record.status === 'active').length,
    direct: data.filter(record => record.hierarchy_level === 'Direct' && record.status === 'active').length,
    indirect1: data.filter(record => record.hierarchy_level === 'Indirect 1' && record.status === 'active').length,
    indirect2: data.filter(record => record.hierarchy_level === 'Indirect 2' && record.status === 'active').length,
    total: data.length,
    cancelled: data.filter(record => record.status === 'cancelled').length,
  } : null;

  return {
    stats,
    isLoading,
    error
  };
}