import { execute, select } from '@/lib/db';
import type { Order, NewOrder, OrderWithCustomer, OrderStatus, OrderFilters } from '@/types';

export async function getOrders(filters?: OrderFilters): Promise<OrderWithCustomer[]> {
  let sql = `SELECT o.*, c.name as customerName
             FROM orders o LEFT JOIN customers c ON o.customerId = c.id
             WHERE 1=1`;
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.status) {
    sql += ` AND o.status = $${idx}`;
    params.push(filters.status);
    idx++;
  }
  if (filters?.customerId) {
    sql += ` AND o.customerId = $${idx}`;
    params.push(filters.customerId);
    idx++;
  }
  if (filters?.keyword) {
    const pattern = `%${filters.keyword}%`;
    sql += ` AND (o.orderNo LIKE $${idx} OR o.productName LIKE $${idx} OR o.patternName LIKE $${idx} OR c.name LIKE $${idx})`;
    params.push(pattern);
    idx++;
  }
  if (filters?.dateFrom) {
    sql += ` AND o.orderDate >= $${idx}`;
    params.push(filters.dateFrom);
    idx++;
  }
  if (filters?.dateTo) {
    sql += ` AND o.orderDate <= $${idx}`;
    params.push(filters.dateTo);
    idx++;
  }

  sql += ' ORDER BY o.createdAt DESC';
  return select<OrderWithCustomer>(sql, params);
}

export async function getOrderById(id: number): Promise<OrderWithCustomer | undefined> {
  const rows = await select<OrderWithCustomer>(
    `SELECT o.*, c.name as customerName
     FROM orders o LEFT JOIN customers c ON o.customerId = c.id
     WHERE o.id = $1`,
    [id],
  );
  return rows[0];
}

export async function getOrdersByCustomerId(customerId: number): Promise<Order[]> {
  return select<Order>('SELECT * FROM orders WHERE customerId = $1 ORDER BY createdAt DESC', [
    customerId,
  ]);
}

export async function createOrder(data: NewOrder): Promise<number> {
  const result = await execute(
    `INSERT INTO orders (orderNo, customerId, orderDate, deliveryDate, productName,
     patternName, patternNo, fabricType, embPosition, embSize, colorCount, stitchCount,
     quantity, unitPrice, totalAmount, deposit, unpaidAmount, status, specialNotes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
    [
      data.orderNo,
      data.customerId,
      data.orderDate,
      data.deliveryDate ?? null,
      data.productName,
      data.patternName ?? null,
      data.patternNo ?? null,
      data.fabricType ?? null,
      data.embPosition ?? null,
      data.embSize ?? null,
      data.colorCount ?? null,
      data.stitchCount ?? null,
      data.quantity,
      data.unitPrice,
      data.totalAmount,
      data.deposit ?? 0,
      data.unpaidAmount,
      data.status ?? '待打样',
      data.specialNotes ?? null,
    ],
  );
  return result.lastInsertId;
}

export async function updateOrder(id: number, data: NewOrder): Promise<void> {
  await execute(
    `UPDATE orders SET orderNo = $1, customerId = $2, orderDate = $3, deliveryDate = $4,
     productName = $5, patternName = $6, patternNo = $7, fabricType = $8,
     embPosition = $9, embSize = $10, colorCount = $11, stitchCount = $12,
     quantity = $13, unitPrice = $14, totalAmount = $15, deposit = $16,
     unpaidAmount = $17, status = $18, specialNotes = $19, updatedAt = datetime('now','localtime')
     WHERE id = $20`,
    [
      data.orderNo,
      data.customerId,
      data.orderDate,
      data.deliveryDate ?? null,
      data.productName,
      data.patternName ?? null,
      data.patternNo ?? null,
      data.fabricType ?? null,
      data.embPosition ?? null,
      data.embSize ?? null,
      data.colorCount ?? null,
      data.stitchCount ?? null,
      data.quantity,
      data.unitPrice,
      data.totalAmount,
      data.deposit ?? 0,
      data.unpaidAmount,
      data.status ?? '待打样',
      data.specialNotes ?? null,
      id,
    ],
  );
}

export async function updateOrderStatus(id: number, status: OrderStatus): Promise<void> {
  await execute(
    "UPDATE orders SET status = $1, updatedAt = datetime('now','localtime') WHERE id = $2",
    [status, id],
  );
}

export async function deleteOrder(id: number): Promise<void> {
  await execute('DELETE FROM orderPayments WHERE orderId = $1', [id]);
  await execute('DELETE FROM productionRecords WHERE orderId = $1', [id]);
  await execute('DELETE FROM orders WHERE id = $1', [id]);
}

export async function getNextOrderSequence(): Promise<number> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const prefix = `XH${y}${m}${d}`;

  const rows = await select<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM orders WHERE orderNo LIKE $1',
    [`${prefix}%`],
  );
  return (rows[0]?.cnt ?? 0) + 1;
}
