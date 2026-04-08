import { select } from '@/lib/db';
import type { OrderPayment } from '@/types';

export async function getPaymentsByOrderId(orderId: number): Promise<OrderPayment[]> {
  return select<OrderPayment>(
    'SELECT * FROM orderPayments WHERE orderId = $1 ORDER BY paymentDate DESC',
    [orderId],
  );
}
