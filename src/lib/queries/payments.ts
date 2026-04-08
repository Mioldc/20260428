import { execute, select } from '@/lib/db';
import type { OrderPayment, NewPayment, PaymentWithOrder } from '@/types';

export async function getPaymentsByOrderId(orderId: number): Promise<OrderPayment[]> {
  return select<OrderPayment>(
    'SELECT * FROM orderPayments WHERE orderId = $1 ORDER BY paymentDate DESC',
    [orderId],
  );
}

export async function getAllPayments(filters?: {
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<PaymentWithOrder[]> {
  let sql = `SELECT op.*, o.orderNo, o.productName, c.name as customerName
             FROM orderPayments op
             LEFT JOIN orders o ON op.orderId = o.id
             LEFT JOIN customers c ON o.customerId = c.id
             WHERE 1=1`;
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.keyword) {
    const pattern = `%${filters.keyword}%`;
    sql += ` AND (o.orderNo LIKE $${idx} OR o.productName LIKE $${idx} OR c.name LIKE $${idx})`;
    params.push(pattern);
    idx++;
  }
  if (filters?.dateFrom) {
    sql += ` AND op.paymentDate >= $${idx}`;
    params.push(filters.dateFrom);
    idx++;
  }
  if (filters?.dateTo) {
    sql += ` AND op.paymentDate <= $${idx}`;
    params.push(filters.dateTo);
    idx++;
  }

  sql += ' ORDER BY op.paymentDate DESC, op.createdAt DESC';
  return select<PaymentWithOrder>(sql, params);
}

export async function createPayment(data: NewPayment): Promise<number> {
  const result = await execute(
    `INSERT INTO orderPayments (orderId, amount, paymentDate, paymentMethod, notes)
     VALUES ($1, $2, $3, $4, $5)`,
    [data.orderId, data.amount, data.paymentDate, data.paymentMethod ?? '现金', data.notes ?? null],
  );

  await recalcUnpaidAmount(data.orderId);
  return result.lastInsertId;
}

export async function deletePayment(id: number): Promise<void> {
  const rows = await select<{ orderId: number }>(
    'SELECT orderId FROM orderPayments WHERE id = $1',
    [id],
  );
  const orderId = rows[0]?.orderId;

  await execute('DELETE FROM orderPayments WHERE id = $1', [id]);

  if (orderId !== undefined) {
    await recalcUnpaidAmount(orderId);
  }
}

async function recalcUnpaidAmount(orderId: number): Promise<void> {
  await execute(
    `UPDATE orders SET unpaidAmount = totalAmount - deposit - COALESCE(
       (SELECT SUM(amount) FROM orderPayments WHERE orderId = $1), 0
     ), updatedAt = datetime('now','localtime') WHERE id = $1`,
    [orderId],
  );
}

export async function getStatementData(
  customerId: number,
  dateFrom: string,
  dateTo: string,
): Promise<{
  orders: import('@/types').StatementOrder[];
  payments: import('@/types').StatementPayment[];
}> {
  const orders = await select<import('@/types').StatementOrder>(
    `SELECT id, orderNo, productName, orderDate, quantity, unitPrice, totalAmount, deposit, unpaidAmount, status
     FROM orders WHERE customerId = $1 AND orderDate >= $2 AND orderDate <= $3
     ORDER BY orderDate ASC`,
    [customerId, dateFrom, dateTo],
  );

  const payments = await select<import('@/types').StatementPayment>(
    `SELECT op.id, op.orderId, o.orderNo, op.amount, op.paymentDate, op.paymentMethod
     FROM orderPayments op
     LEFT JOIN orders o ON op.orderId = o.id
     WHERE o.customerId = $1 AND op.paymentDate >= $2 AND op.paymentDate <= $3
     ORDER BY op.paymentDate ASC`,
    [customerId, dateFrom, dateTo],
  );

  return { orders, payments };
}
