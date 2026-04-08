import { useState, useEffect, useCallback } from 'react';
import {
  getProductionRecords,
  createProductionRecord,
  deleteProductionRecord,
} from '@/lib/queries/production';
import type { ProductionRecordWithDetails, NewProductionRecord } from '@/types';

interface UseProductionResult {
  records: ProductionRecordWithDetails[];
  loading: boolean;
  reload: () => Promise<void>;
  create: (data: NewProductionRecord) => Promise<number>;
  remove: (id: number) => Promise<void>;
}

export function useProductionRecords(date?: string): UseProductionResult {
  const [records, setRecords] = useState<ProductionRecordWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async (): Promise<void> => {
    try {
      const data = await getProductionRecords(date);
      setRecords(data);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(
    async (data: NewProductionRecord): Promise<number> => {
      const id = await createProductionRecord(data);
      await reload();
      return id;
    },
    [reload],
  );

  const remove = useCallback(
    async (id: number): Promise<void> => {
      await deleteProductionRecord(id);
      await reload();
    },
    [reload],
  );

  return { records, loading, reload, create, remove };
}
