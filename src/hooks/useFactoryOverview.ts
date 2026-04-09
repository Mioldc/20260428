import { useCallback, useEffect, useState } from 'react';
import {
  getFactoryOverviewAvailableYears,
  getFactoryOverviewData,
} from '@/lib/queries/factoryOverview';
import type { FactoryOverviewData, FactoryOverviewGranularity } from '@/types';

interface UseFactoryOverviewResult {
  data: FactoryOverviewData | null;
  availableYears: number[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useFactoryOverview(
  year: number,
  granularity: FactoryOverviewGranularity,
): UseFactoryOverviewResult {
  const [data, setData] = useState<FactoryOverviewData | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const [overviewData, years] = await Promise.all([
        getFactoryOverviewData(year, granularity),
        getFactoryOverviewAvailableYears(),
      ]);

      setData(overviewData);
      setAvailableYears(years);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载经营统计失败');
    } finally {
      setLoading(false);
    }
  }, [granularity, year]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, availableYears, loading, error, reload };
}
