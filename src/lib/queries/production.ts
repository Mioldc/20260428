import { execute, select } from '@/lib/db';
import type { NewProductionRecord, ProductionRecordWithDetails } from '@/types';

export async function getProductionRecords(date?: string): Promise<ProductionRecordWithDetails[]> {
  let sql = `SELECT pr.*, o.orderNo, o.productName, m.name as machineName
             FROM productionRecords pr
             LEFT JOIN orders o ON pr.orderId = o.id
             LEFT JOIN machines m ON pr.machineId = m.id`;
  const params: unknown[] = [];

  if (date) {
    sql += ' WHERE pr.date = $1';
    params.push(date);
  }

  sql += ' ORDER BY pr.date DESC, pr.createdAt DESC';
  return select<ProductionRecordWithDetails>(sql, params);
}

export async function getProductionRecordsByOrderId(
  orderId: number,
): Promise<ProductionRecordWithDetails[]> {
  return select<ProductionRecordWithDetails>(
    `SELECT pr.*, o.orderNo, o.productName, m.name as machineName
     FROM productionRecords pr
     LEFT JOIN orders o ON pr.orderId = o.id
     LEFT JOIN machines m ON pr.machineId = m.id
     WHERE pr.orderId = $1 ORDER BY pr.date DESC`,
    [orderId],
  );
}

export async function createProductionRecord(data: NewProductionRecord): Promise<number> {
  const result = await execute(
    `INSERT INTO productionRecords (orderId, machineId, date, stitchCount, quantity, defectCount, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      data.orderId,
      data.machineId,
      data.date,
      data.stitchCount ?? null,
      data.quantity,
      data.defectCount ?? 0,
      data.notes ?? null,
    ],
  );
  return result.lastInsertId;
}

export async function deleteProductionRecord(id: number): Promise<void> {
  await execute('DELETE FROM productionRecords WHERE id = $1', [id]);
}
