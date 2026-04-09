import { useState, useEffect, useCallback } from 'react';
import {
  getThreads,
  getThreadStats,
  createThread,
  updateThread,
  adjustStock,
  deleteThread,
  createPurchase,
  getPurchasesByThreadId,
  deletePurchase,
} from '@/lib/queries/threads';
import type {
  Thread,
  NewThread,
  ThreadFilters,
  ThreadStats,
  ThreadPurchase,
  NewThreadPurchase,
} from '@/types';

interface UseThreadsResult {
  threads: Thread[];
  stats: ThreadStats;
  loading: boolean;
  reload: () => Promise<void>;
  create: (data: NewThread) => Promise<number>;
  update: (id: number, data: Partial<NewThread>) => Promise<void>;
  adjust: (id: number, delta: number) => Promise<void>;
  remove: (id: number) => Promise<void>;
  addPurchase: (data: NewThreadPurchase) => Promise<number>;
}

const EMPTY_STATS: ThreadStats = { totalTypes: 0, totalQuantity: 0, lowStockCount: 0 };

export function useThreads(filters?: ThreadFilters): UseThreadsResult {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [stats, setStats] = useState<ThreadStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [data, s] = await Promise.all([getThreads(filters), getThreadStats()]);
      setThreads(data);
      setStats(s);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(
    async (data: NewThread): Promise<number> => {
      const id = await createThread(data);
      await reload();
      return id;
    },
    [reload],
  );

  const update = useCallback(
    async (id: number, data: Partial<NewThread>): Promise<void> => {
      await updateThread(id, data);
      await reload();
    },
    [reload],
  );

  const adjust = useCallback(
    async (id: number, delta: number): Promise<void> => {
      await adjustStock(id, delta);
      await reload();
    },
    [reload],
  );

  const remove = useCallback(
    async (id: number): Promise<void> => {
      await deleteThread(id);
      await reload();
    },
    [reload],
  );

  const addPurchase = useCallback(
    async (data: NewThreadPurchase): Promise<number> => {
      const id = await createPurchase(data);
      await reload();
      return id;
    },
    [reload],
  );

  return { threads, stats, loading, reload, create, update, adjust, remove, addPurchase };
}

interface UsePurchaseHistoryResult {
  purchases: ThreadPurchase[];
  loading: boolean;
  reload: () => Promise<void>;
  removePurchase: (id: number) => Promise<void>;
}

export function usePurchaseHistory(threadId: number | null): UsePurchaseHistoryResult {
  const [purchases, setPurchases] = useState<ThreadPurchase[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async (): Promise<void> => {
    if (threadId === null) {
      setPurchases([]);
      return;
    }
    setLoading(true);
    try {
      const data = await getPurchasesByThreadId(threadId);
      setPurchases(data);
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const removePurchase = useCallback(
    async (id: number): Promise<void> => {
      await deletePurchase(id);
      await reload();
    },
    [reload],
  );

  return { purchases, loading, reload, removePurchase };
}
