import { execute, select } from '@/lib/db';
import type {
  Thread,
  NewThread,
  ThreadFilters,
  ThreadPurchase,
  NewThreadPurchase,
  ThreadStats,
} from '@/types';

// ---------------------------------------------------------------------------
// Thread CRUD
// ---------------------------------------------------------------------------

export async function getThreads(filters?: ThreadFilters): Promise<Thread[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.keyword?.trim()) {
    const pattern = `%${filters.keyword.trim()}%`;
    conditions.push(`(t.colorNo LIKE $${idx} OR t.colorName LIKE $${idx})`);
    params.push(pattern);
    idx++;
  }

  if (filters?.brand) {
    conditions.push(`t.brand = $${idx}`);
    params.push(filters.brand);
    idx++;
  }

  if (filters?.stockStatus === 'low') {
    conditions.push('t.quantity > 0 AND t.quantity <= t.minStock AND t.minStock > 0');
  } else if (filters?.stockStatus === 'zero') {
    conditions.push('t.quantity = 0');
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return select<Thread>(`SELECT * FROM threads t ${where} ORDER BY t.colorNo ASC`, params);
}

export async function getThreadById(id: number): Promise<Thread | undefined> {
  const rows = await select<Thread>('SELECT * FROM threads WHERE id = $1', [id]);
  return rows[0];
}

export async function createThread(data: NewThread): Promise<number> {
  const result = await execute(
    `INSERT INTO threads (colorNo, brand, colorName, material, quantity, minStock, unitCost, supplier, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      data.colorNo,
      data.brand ?? null,
      data.colorName ?? null,
      data.material ?? null,
      data.quantity ?? 0,
      data.minStock ?? 0,
      data.unitCost ?? null,
      data.supplier ?? null,
      data.notes ?? null,
    ],
  );
  return result.lastInsertId;
}

export async function updateThread(id: number, data: Partial<NewThread>): Promise<void> {
  await execute(
    `UPDATE threads
     SET colorNo = $1, brand = $2, colorName = $3, material = $4,
         minStock = $5, unitCost = $6, supplier = $7, notes = $8,
         updatedAt = datetime('now','localtime')
     WHERE id = $9`,
    [
      data.colorNo ?? null,
      data.brand ?? null,
      data.colorName ?? null,
      data.material ?? null,
      data.minStock ?? 0,
      data.unitCost ?? null,
      data.supplier ?? null,
      data.notes ?? null,
      id,
    ],
  );
}

export async function adjustStock(id: number, delta: number): Promise<void> {
  await execute(
    `UPDATE threads
     SET quantity = MAX(quantity + $1, 0),
         updatedAt = datetime('now','localtime')
     WHERE id = $2`,
    [delta, id],
  );
}

export async function deleteThread(id: number): Promise<void> {
  await execute('DELETE FROM threadPurchases WHERE threadId = $1', [id]);
  await execute('DELETE FROM threads WHERE id = $1', [id]);
}

export async function getLowStockThreads(): Promise<Thread[]> {
  return select<Thread>(
    `SELECT * FROM threads
     WHERE minStock > 0 AND quantity <= minStock
     ORDER BY (quantity * 1.0 / minStock) ASC, colorNo ASC`,
  );
}

export async function getThreadStats(): Promise<ThreadStats> {
  const rows = await select<{
    totalTypes: number;
    totalQuantity: number;
    lowStockCount: number;
  }>(
    `SELECT
       COUNT(*) AS totalTypes,
       COALESCE(SUM(quantity), 0) AS totalQuantity,
       COUNT(CASE WHEN minStock > 0 AND quantity <= minStock THEN 1 END) AS lowStockCount
     FROM threads`,
  );
  return rows[0] ?? { totalTypes: 0, totalQuantity: 0, lowStockCount: 0 };
}

// ---------------------------------------------------------------------------
// Purchase records
// ---------------------------------------------------------------------------

export async function createPurchase(data: NewThreadPurchase): Promise<number> {
  const result = await execute(
    `INSERT INTO threadPurchases (threadId, quantity, unitCost, totalCost, supplier, purchaseDate, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      data.threadId,
      data.quantity,
      data.unitCost ?? null,
      data.totalCost ?? null,
      data.supplier ?? null,
      data.purchaseDate,
      data.notes ?? null,
    ],
  );

  await execute(
    `UPDATE threads
     SET quantity = quantity + $1,
         updatedAt = datetime('now','localtime')
     WHERE id = $2`,
    [data.quantity, data.threadId],
  );

  return result.lastInsertId;
}

export async function getPurchasesByThreadId(threadId: number): Promise<ThreadPurchase[]> {
  return select<ThreadPurchase>(
    `SELECT * FROM threadPurchases
     WHERE threadId = $1
     ORDER BY purchaseDate DESC, id DESC`,
    [threadId],
  );
}

export async function deletePurchase(id: number): Promise<void> {
  const rows = await select<{ threadId: number; quantity: number }>(
    'SELECT threadId, quantity FROM threadPurchases WHERE id = $1',
    [id],
  );

  const purchase = rows[0];
  if (!purchase) return;

  const { threadId, quantity } = purchase;

  await execute('DELETE FROM threadPurchases WHERE id = $1', [id]);

  await execute(
    `UPDATE threads
     SET quantity = MAX(quantity - $1, 0),
         updatedAt = datetime('now','localtime')
     WHERE id = $2`,
    [quantity, threadId],
  );
}
