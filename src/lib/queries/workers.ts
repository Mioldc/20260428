import { execute, select } from '@/lib/db';
import type {
  Worker,
  NewWorker,
  NewWageRecord,
  WageRecordWithWorker,
  NewDailyAttendance,
  DailyAttendanceWithWorker,
} from '@/types';

// ── Worker CRUD ──

export async function getWorkers(statusFilter?: string): Promise<Worker[]> {
  if (statusFilter) {
    return select<Worker>('SELECT * FROM workers WHERE status = $1 ORDER BY createdAt DESC', [
      statusFilter,
    ]);
  }
  return select<Worker>('SELECT * FROM workers ORDER BY createdAt DESC');
}

export async function getWorkerById(id: number): Promise<Worker | undefined> {
  const rows = await select<Worker>('SELECT * FROM workers WHERE id = $1', [id]);
  return rows[0];
}

export async function getWorkersByType(type: string): Promise<Worker[]> {
  return select<Worker>("SELECT * FROM workers WHERE type = $1 AND status = '在职' ORDER BY name", [
    type,
  ]);
}

export async function createWorker(data: NewWorker): Promise<number> {
  const result = await execute(
    `INSERT INTO workers (name, type, monthlySalary, dayRate, nightRate, joinDate, status, phone, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      data.name,
      data.type,
      data.monthlySalary ?? null,
      data.dayRate ?? null,
      data.nightRate ?? null,
      data.joinDate ?? null,
      data.status ?? '在职',
      data.phone ?? null,
      data.notes ?? null,
    ],
  );
  return result.lastInsertId;
}

export async function updateWorker(id: number, data: NewWorker): Promise<void> {
  await execute(
    `UPDATE workers SET name = $1, type = $2, monthlySalary = $3, dayRate = $4, nightRate = $5,
     joinDate = $6, status = $7, phone = $8, notes = $9 WHERE id = $10`,
    [
      data.name,
      data.type,
      data.monthlySalary ?? null,
      data.dayRate ?? null,
      data.nightRate ?? null,
      data.joinDate ?? null,
      data.status ?? '在职',
      data.phone ?? null,
      data.notes ?? null,
      id,
    ],
  );
}

export async function deleteWorker(id: number): Promise<void> {
  await execute('DELETE FROM dailyAttendances WHERE workerId = $1', [id]);
  await execute('DELETE FROM wageRecords WHERE workerId = $1', [id]);
  await execute('DELETE FROM workers WHERE id = $1', [id]);
}

// ── Wage Records (permanent workers) ──

export async function getWageRecords(month?: string): Promise<WageRecordWithWorker[]> {
  let sql = `SELECT wr.*, w.name as workerName
             FROM wageRecords wr LEFT JOIN workers w ON wr.workerId = w.id`;
  const params: unknown[] = [];

  if (month) {
    sql += ' WHERE wr.month = $1';
    params.push(month);
  }

  sql += ' ORDER BY wr.month DESC, w.name ASC';
  return select<WageRecordWithWorker>(sql, params);
}

export async function createWageRecord(data: NewWageRecord): Promise<number> {
  const result = await execute(
    `INSERT INTO wageRecords (workerId, month, salary, isPaid, paidDate, notes)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      data.workerId,
      data.month,
      data.salary,
      data.isPaid ?? 0,
      data.paidDate ?? null,
      data.notes ?? null,
    ],
  );
  return result.lastInsertId;
}

export async function markWagePaid(id: number, paidDate: string): Promise<void> {
  await execute('UPDATE wageRecords SET isPaid = 1, paidDate = $1 WHERE id = $2', [paidDate, id]);
}

export async function markWageUnpaid(id: number): Promise<void> {
  await execute('UPDATE wageRecords SET isPaid = 0, paidDate = NULL WHERE id = $1', [id]);
}

export async function deleteWageRecord(id: number): Promise<void> {
  await execute('DELETE FROM wageRecords WHERE id = $1', [id]);
}

export async function generateMonthlyWages(month: string): Promise<number> {
  const existing = await select<{ workerId: number }>(
    'SELECT workerId FROM wageRecords WHERE month = $1',
    [month],
  );
  const existingIds = new Set(existing.map((r) => r.workerId));

  const permanentWorkers = await select<Worker>(
    "SELECT * FROM workers WHERE type = '长工' AND status = '在职'",
  );

  let created = 0;
  for (const w of permanentWorkers) {
    if (!existingIds.has(w.id) && w.monthlySalary) {
      await createWageRecord({ workerId: w.id, month, salary: w.monthlySalary });
      created++;
    }
  }
  return created;
}

// ── Daily Attendance (temporary workers) ──

export async function getDailyAttendances(filters?: {
  date?: string;
  workerId?: number;
  dateFrom?: string;
  dateTo?: string;
  isPaid?: number;
}): Promise<DailyAttendanceWithWorker[]> {
  let sql = `SELECT da.*, w.name as workerName, w.dayRate, w.nightRate
             FROM dailyAttendances da LEFT JOIN workers w ON da.workerId = w.id
             WHERE 1=1`;
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.date) {
    sql += ` AND da.date = $${idx}`;
    params.push(filters.date);
    idx++;
  }
  if (filters?.workerId) {
    sql += ` AND da.workerId = $${idx}`;
    params.push(filters.workerId);
    idx++;
  }
  if (filters?.dateFrom) {
    sql += ` AND da.date >= $${idx}`;
    params.push(filters.dateFrom);
    idx++;
  }
  if (filters?.dateTo) {
    sql += ` AND da.date <= $${idx}`;
    params.push(filters.dateTo);
    idx++;
  }
  if (filters?.isPaid !== undefined) {
    sql += ` AND da.isPaid = $${idx}`;
    params.push(filters.isPaid);
    idx++;
  }

  sql += ' ORDER BY da.date DESC, w.name ASC';
  return select<DailyAttendanceWithWorker>(sql, params);
}

export async function createDailyAttendance(data: NewDailyAttendance): Promise<number> {
  const result = await execute(
    `INSERT INTO dailyAttendances (workerId, date, shift, amount, isPaid, paidDate, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      data.workerId,
      data.date,
      data.shift,
      data.amount,
      data.isPaid ?? 0,
      data.paidDate ?? null,
      data.notes ?? null,
    ],
  );
  return result.lastInsertId;
}

export async function markAttendancePaid(ids: number[], paidDate: string): Promise<void> {
  for (const id of ids) {
    await execute('UPDATE dailyAttendances SET isPaid = 1, paidDate = $1 WHERE id = $2', [
      paidDate,
      id,
    ]);
  }
}

export async function markAttendanceUnpaid(ids: number[]): Promise<void> {
  for (const id of ids) {
    await execute('UPDATE dailyAttendances SET isPaid = 0, paidDate = NULL WHERE id = $1', [id]);
  }
}

export async function deleteAttendance(id: number): Promise<void> {
  await execute('DELETE FROM dailyAttendances WHERE id = $1', [id]);
}

// ── Summaries ──

export interface TempWorkerSummary {
  workerId: number;
  workerName: string;
  totalDays: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
}

export async function getTempWorkerSummary(
  dateFrom: string,
  dateTo: string,
): Promise<TempWorkerSummary[]> {
  return select<TempWorkerSummary>(
    `SELECT
       da.workerId,
       w.name as workerName,
       COUNT(*) as totalDays,
       SUM(da.amount) as totalAmount,
       SUM(CASE WHEN da.isPaid = 1 THEN da.amount ELSE 0 END) as paidAmount,
       SUM(CASE WHEN da.isPaid = 0 THEN da.amount ELSE 0 END) as unpaidAmount
     FROM dailyAttendances da
     LEFT JOIN workers w ON da.workerId = w.id
     WHERE da.date >= $1 AND da.date <= $2
     GROUP BY da.workerId
     ORDER BY w.name`,
    [dateFrom, dateTo],
  );
}

export async function getWageMonthlySummary(month: string): Promise<{
  permanentTotal: number;
  permanentPaid: number;
  tempTotal: number;
  tempPaid: number;
}> {
  const wageRows = await select<{ total: number; paid: number }>(
    `SELECT COALESCE(SUM(salary), 0) as total,
            COALESCE(SUM(CASE WHEN isPaid = 1 THEN salary ELSE 0 END), 0) as paid
     FROM wageRecords WHERE month = $1`,
    [month],
  );

  const monthStart = `${month}-01`;
  const monthEnd = `${month}-31`;
  const tempRows = await select<{ total: number; paid: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total,
            COALESCE(SUM(CASE WHEN isPaid = 1 THEN amount ELSE 0 END), 0) as paid
     FROM dailyAttendances WHERE date >= $1 AND date <= $2`,
    [monthStart, monthEnd],
  );

  return {
    permanentTotal: wageRows[0]?.total ?? 0,
    permanentPaid: wageRows[0]?.paid ?? 0,
    tempTotal: tempRows[0]?.total ?? 0,
    tempPaid: tempRows[0]?.paid ?? 0,
  };
}
