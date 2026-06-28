import { useEffect, useState } from 'react';
import useSWR from 'swr';

function readCachedValue(cacheKey) {
  if (typeof window === 'undefined' || !cacheKey) return undefined;
  try {
    const parsed = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
    return parsed ?? undefined;
  } catch {
    return undefined;
  }
}

function writeCachedValue(cacheKey, value) {
  if (typeof window === 'undefined' || !cacheKey || value === undefined) return;
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(value));
  } catch {
    // Ignore storage quota/private mode failures; fresh SWR data still renders.
  }
}

export default function useSessionCachedSWR(key, cacheKey) {
  const [cachedData, setCachedData] = useState(undefined);
  const swr = useSWR(key);

  useEffect(() => {
    setCachedData(readCachedValue(cacheKey));
  }, [cacheKey]);

  useEffect(() => {
    if (swr.data !== undefined) {
      setCachedData(swr.data);
      writeCachedValue(cacheKey, swr.data);
    }
  }, [cacheKey, swr.data]);

  return {
    ...swr,
    data: swr.data ?? cachedData,
    hasCachedData: swr.data === undefined && cachedData !== undefined && !swr.error,
    isInitialLoading: swr.data === undefined && cachedData === undefined && !swr.error
  };
}
