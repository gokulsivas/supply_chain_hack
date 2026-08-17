import { useState, useEffect, useCallback, useRef } from "react";
import { searchTracking, isApiError } from "@/lib/api";
import type { TrackingSearchResponse } from "@/types/logistics";

interface UseTruckPollingResult {
  data: TrackingSearchResponse | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

export function useTruckPolling(query: string): UseTruckPollingResult {
  const [data, setData] = useState<TrackingSearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchInProgress = useRef(false);
  const requestSeq = useRef(0);

  const fetchData = useCallback(async (isSilentRefresh = false) => {
    if (!query) {
      setData(null);
      setError(null);
      return;
    }

    const currentReqId = ++requestSeq.current;

    if (!isSilentRefresh) {
      setIsLoading(true);
      setError(null);
      setData(null); // Clear previous truck data to prevent stale map rendering
    }

    try {
      const response = await searchTracking(query);
      if (currentReqId === requestSeq.current) {
        setData(response);
        setError(null);
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (currentReqId === requestSeq.current) {
        if (isApiError(err)) {
          setError(err.detail);
        } else {
          setError("Failed to fetch tracking data. Please try again.");
        }
        setData(null);
      }
    } finally {
      if (currentReqId === requestSeq.current && !isSilentRefresh) {
        setIsLoading(false);
      }
    }
  }, [query]);

  // Initial fetch and polling setup
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    if (query) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchData(false); // Initial load with spinner
      
      intervalId = setInterval(() => {
        fetchData(true); // Silent polling updates
      }, 5000);
    } else {
      setData(null);
      setError(null);
      setLastUpdated(null);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [query, fetchData]);

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    refresh: () => fetchData(true),
  };
}
