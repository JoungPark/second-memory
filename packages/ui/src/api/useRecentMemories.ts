'use client';

import type { MemoryListItem } from '@second-memory/shared-types';
import { useCallback, useState } from 'react';
import { useMemoryApi } from './MemoryApiProvider';

const DEFAULT_PAGE_SIZE = 5;

export function useRecentMemories(pageSize = DEFAULT_PAGE_SIZE) {
  const memoryApi = useMemoryApi();
  const [visible, setVisible] = useState(false);
  const [items, setItems] = useState<MemoryListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [lastPageCount, setLastPageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMore = lastPageCount === pageSize;

  const fetchPage = useCallback(
    async (cursor?: string) => {
      const response = await memoryApi.listMemories({
        pageSize,
        ...(cursor ? { cursor } : {}),
      });
      setLastPageCount(response.items.length);
      setNextCursor(response.nextCursor);
      return response.items;
    },
    [memoryApi, pageSize],
  );

  const toOldestFirst = useCallback(
    (pageItems: MemoryListItem[]) => [...pageItems].reverse(),
    [],
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const newItems = await fetchPage();
      setItems(toOldestFirst(newItems));
    } catch (fetchError) {
      setError(
        fetchError instanceof Error ? fetchError.message : 'Failed to load memories',
      );
      setItems([]);
      setLastPageCount(0);
      setNextCursor(undefined);
    } finally {
      setLoading(false);
    }
  }, [fetchPage, toOldestFirst]);

  const show = useCallback(async () => {
    if (visible) {
      return;
    }

    setVisible(true);

    if (items.length === 0 && !loading) {
      await loadInitial();
    }
  }, [visible, items.length, loading, loadInitial]);

  const refresh = useCallback(async () => {
    if (!visible) {
      return;
    }

    setNextCursor(undefined);
    setLastPageCount(0);
    await loadInitial();
  }, [visible, loadInitial]);

  const loadOlder = useCallback(async () => {
    if (!nextCursor || loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);
    setError(null);

    try {
      const olderItems = await fetchPage(nextCursor);
      setItems((previous) => [...toOldestFirst(olderItems), ...previous]);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'Failed to load older memories',
      );
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, hasMore, fetchPage, toOldestFirst]);

  return {
    visible,
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    show,
    refresh,
    loadOlder,
  };
}
