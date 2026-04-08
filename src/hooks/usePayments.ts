import { useState, useEffect, useCallback } from 'react';
import { getAllPayments, createPayment, deletePayment } from '@/lib/queries/payments';
import type { PaymentWithOrder, NewPayment } from '@/types';

interface UsePaymentsResult {
  payments: PaymentWithOrder[];
  loading: boolean;
  reload: () => Promise<void>;
  create: (data: NewPayment) => Promise<number>;
  remove: (id: number) => Promise<void>;
}

export function usePayments(filters?: {
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
}): UsePaymentsResult {
  const [payments, setPayments] = useState<PaymentWithOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const keyword = filters?.keyword;
  const dateFrom = filters?.dateFrom;
  const dateTo = filters?.dateTo;

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await getAllPayments({ keyword, dateFrom, dateTo });
      setPayments(data);
    } finally {
      setLoading(false);
    }
  }, [keyword, dateFrom, dateTo]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(
    async (data: NewPayment): Promise<number> => {
      const id = await createPayment(data);
      await reload();
      return id;
    },
    [reload],
  );

  const remove = useCallback(
    async (id: number): Promise<void> => {
      await deletePayment(id);
      await reload();
    },
    [reload],
  );

  return { payments, loading, reload, create, remove };
}
