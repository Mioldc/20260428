import { useState, useEffect, useCallback } from 'react';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '@/lib/queries/customers';
import type { Customer, NewCustomer } from '@/types';

interface UseCustomersResult {
  customers: Customer[];
  loading: boolean;
  reload: () => Promise<void>;
  create: (data: NewCustomer) => Promise<number>;
  update: (id: number, data: NewCustomer) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export function useCustomers(keyword?: string): UseCustomersResult {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await getCustomers(keyword || undefined);
      setCustomers(data);
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(
    async (data: NewCustomer): Promise<number> => {
      const id = await createCustomer(data);
      await reload();
      return id;
    },
    [reload],
  );

  const update = useCallback(
    async (id: number, data: NewCustomer): Promise<void> => {
      await updateCustomer(id, data);
      await reload();
    },
    [reload],
  );

  const remove = useCallback(
    async (id: number): Promise<void> => {
      await deleteCustomer(id);
      await reload();
    },
    [reload],
  );

  return { customers, loading, reload, create, update, remove };
}

export function useCustomerDetail(id: number | null): {
  customer: Customer | null;
  loading: boolean;
} {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      if (id === null) {
        setLoading(false);
        return;
      }
      try {
        const data = await getCustomerById(id);
        if (!cancelled) setCustomer(data ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return (): void => {
      cancelled = true;
    };
  }, [id]);

  return { customer, loading };
}
