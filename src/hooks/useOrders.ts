import { useState, useEffect, useCallback } from 'react';
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  getNextOrderSequence,
  getOrdersByCustomerId,
} from '@/lib/queries/orders';
import { createPayment, deletePayment, getPaymentsByOrderId } from '@/lib/queries/payments';
import { getProductionRecordsByOrderId } from '@/lib/queries/production';
import type {
  OrderWithCustomer,
  OrderFilters,
  NewOrder,
  NewPayment,
  OrderStatus,
  OrderPayment,
  ProductionRecordWithDetails,
} from '@/types';

interface UseOrdersResult {
  orders: OrderWithCustomer[];
  loading: boolean;
  reload: () => Promise<void>;
}

export function useOrders(filters?: OrderFilters): UseOrdersResult {
  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  const status = filters?.status;
  const keyword = filters?.keyword;
  const customerId = filters?.customerId;
  const dateFrom = filters?.dateFrom;
  const dateTo = filters?.dateTo;

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await getOrders({ status, keyword, customerId, dateFrom, dateTo });
      setOrders(data);
    } finally {
      setLoading(false);
    }
  }, [status, keyword, customerId, dateFrom, dateTo]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { orders, loading, reload };
}

interface UseOrderDetailResult {
  order: OrderWithCustomer | null;
  productions: ProductionRecordWithDetails[];
  payments: OrderPayment[];
  loading: boolean;
  changeStatus: (status: OrderStatus) => Promise<void>;
  remove: () => Promise<void>;
  addPayment: (data: NewPayment) => Promise<number>;
  removePayment: (paymentId: number) => Promise<void>;
  reload: () => Promise<void>;
}

export function useOrderDetail(id: number | null): UseOrderDetailResult {
  const [order, setOrder] = useState<OrderWithCustomer | null>(null);
  const [productions, setProductions] = useState<ProductionRecordWithDetails[]>([]);
  const [payments, setPayments] = useState<OrderPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async (): Promise<void> => {
    if (id === null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [o, prods, pays] = await Promise.all([
        getOrderById(id),
        getProductionRecordsByOrderId(id),
        getPaymentsByOrderId(id),
      ]);
      setOrder(o ?? null);
      setProductions(prods);
      setPayments(pays);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const changeStatus = useCallback(
    async (status: OrderStatus): Promise<void> => {
      if (id === null || !order) return;
      await updateOrderStatus(id, status);
      setOrder({ ...order, status });
    },
    [id, order],
  );

  const remove = useCallback(async (): Promise<void> => {
    if (id === null) return;
    await deleteOrder(id);
  }, [id]);

  const addPayment = useCallback(
    async (data: NewPayment): Promise<number> => {
      const paymentId = await createPayment(data);
      await reload();
      return paymentId;
    },
    [reload],
  );

  const removePayment = useCallback(
    async (paymentId: number): Promise<void> => {
      await deletePayment(paymentId);
      await reload();
    },
    [reload],
  );

  return {
    order,
    productions,
    payments,
    loading,
    changeStatus,
    remove,
    addPayment,
    removePayment,
    reload,
  };
}

interface UseOrderFormResult {
  nextSequence: number;
  existingOrder: OrderWithCustomer | null;
  loading: boolean;
  save: (data: NewOrder, editId?: number) => Promise<number>;
}

export function useOrderForm(editId?: number): UseOrderFormResult {
  const [nextSequence, setNextSequence] = useState(0);
  const [existingOrder, setExistingOrder] = useState<OrderWithCustomer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        if (editId) {
          const order = await getOrderById(editId);
          if (!cancelled) setExistingOrder(order ?? null);
        } else {
          const seq = await getNextOrderSequence();
          if (!cancelled) setNextSequence(seq);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return (): void => {
      cancelled = true;
    };
  }, [editId]);

  const save = useCallback(async (data: NewOrder, id?: number): Promise<number> => {
    if (id) {
      await updateOrder(id, data);
      return id;
    }
    return createOrder(data);
  }, []);

  return { nextSequence, existingOrder, loading, save };
}

export function useCustomerOrders(customerId: number | null): {
  orders: import('@/types').Order[];
  loading: boolean;
} {
  const [orders, setOrders] = useState<import('@/types').Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      if (customerId === null) {
        setLoading(false);
        return;
      }
      try {
        const data = await getOrdersByCustomerId(customerId);
        if (!cancelled) setOrders(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return (): void => {
      cancelled = true;
    };
  }, [customerId]);

  return { orders, loading };
}
