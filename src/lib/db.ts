import type initSqlJs from 'sql.js';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contactPerson TEXT,
  phone TEXT,
  address TEXT,
  settlementType TEXT NOT NULL DEFAULT '现结',
  invoiceInfo TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orderNo TEXT NOT NULL UNIQUE,
  customerId INTEGER NOT NULL REFERENCES customers(id),
  orderDate TEXT NOT NULL,
  deliveryDate TEXT,
  productName TEXT NOT NULL,
  patternName TEXT,
  patternNo TEXT,
  fabricType TEXT,
  embPosition TEXT,
  embSize TEXT,
  colorCount INTEGER,
  stitchCount INTEGER,
  quantity INTEGER NOT NULL,
  unitPrice INTEGER NOT NULL,
  totalAmount INTEGER NOT NULL,
  deposit INTEGER NOT NULL DEFAULT 0,
  unpaidAmount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT '待打样',
  specialNotes TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS machines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  model TEXT,
  headCount INTEGER,
  status TEXT NOT NULL DEFAULT '正常',
  notes TEXT
);
CREATE TABLE IF NOT EXISTS workers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  monthlySalary INTEGER,
  dayRate INTEGER,
  nightRate INTEGER,
  joinDate TEXT,
  status TEXT NOT NULL DEFAULT '在职',
  phone TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS productionRecords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId INTEGER NOT NULL REFERENCES orders(id),
  machineId INTEGER NOT NULL REFERENCES machines(id),
  date TEXT NOT NULL,
  stitchCount INTEGER,
  quantity INTEGER NOT NULL,
  defectCount INTEGER DEFAULT 0,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS orderPayments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId INTEGER NOT NULL REFERENCES orders(id),
  amount INTEGER NOT NULL,
  paymentDate TEXT NOT NULL,
  paymentMethod TEXT NOT NULL DEFAULT '现金',
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS wageRecords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workerId INTEGER NOT NULL REFERENCES workers(id),
  month TEXT NOT NULL,
  salary INTEGER NOT NULL,
  isPaid INTEGER NOT NULL DEFAULT 0,
  paidDate TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS dailyAttendances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workerId INTEGER NOT NULL REFERENCES workers(id),
  date TEXT NOT NULL,
  shift TEXT NOT NULL,
  amount INTEGER NOT NULL,
  isPaid INTEGER NOT NULL DEFAULT 0,
  paidDate TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS appConfig (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT
);`,
  `CREATE TABLE IF NOT EXISTS threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  colorNo TEXT NOT NULL,
  brand TEXT,
  colorName TEXT,
  material TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  minStock INTEGER NOT NULL DEFAULT 0,
  unitCost INTEGER,
  supplier TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  UNIQUE(colorNo, brand)
);
CREATE TABLE IF NOT EXISTS threadPurchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  threadId INTEGER NOT NULL REFERENCES threads(id),
  quantity INTEGER NOT NULL,
  unitCost INTEGER,
  totalCost INTEGER,
  supplier TEXT,
  purchaseDate TEXT NOT NULL,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);`,
];

type SqlJsDatabase = ReturnType<Awaited<ReturnType<typeof initSqlJs>>['prototype']['constructor']> & {
  run: (sql: string, params?: unknown[]) => void;
  exec: (sql: string, params?: unknown[]) => Array<{ columns: string[]; values: unknown[][] }>;
  getRowsModified: () => number;
};

let browserDb: SqlJsDatabase | null = null;
let browserDbReady: Promise<void> | null = null;

function bindParam(val: unknown): initSqlJs.BindParams[number] {
  if (val === undefined) return null;
  if (typeof val === 'boolean') return val ? 1 : 0;
  return val as initSqlJs.BindParams[number];
}

async function ensureBrowserDb(): Promise<SqlJsDatabase> {
  if (browserDb) return browserDb;

  if (!browserDbReady) {
    browserDbReady = (async () => {
      const SQL = await (await import('sql.js')).default({
        locateFile: () => '/sql-wasm.wasm',
      });
      browserDb = new SQL.Database() as unknown as SqlJsDatabase;
      for (const migration of MIGRATIONS) {
        browserDb.run(migration);
      }
    })();
  }
  await browserDbReady;
  return browserDb!;
}

function rewriteParams(sql: string, params: unknown[]): { sql: string; bindings: initSqlJs.BindParams } {
  let idx = 0;
  const rewritten = sql.replace(/\$\d+/g, () => {
    idx++;
    return `?${idx}`;
  });
  const bindings: initSqlJs.BindParams = {};
  for (let i = 0; i < params.length; i++) {
    bindings[i + 1] = bindParam(params[i]);
  }
  return { sql: rewritten, bindings };
}

export async function execute(
  sql: string,
  params: unknown[] = [],
): Promise<{ rowsAffected: number; lastInsertId: number }> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('db_execute', { sql, params });
  }

  const db = await ensureBrowserDb();
  const { sql: rewritten, bindings } = rewriteParams(sql, params);
  db.run(rewritten, bindings as unknown as initSqlJs.BindParams[]);

  const rowsAffected = db.getRowsModified();
  const idResult = db.exec('SELECT last_insert_rowid() as id');
  const lastInsertId = idResult.length > 0 ? (idResult[0].values[0][0] as number) : 0;
  return { rowsAffected, lastInsertId };
}

export async function select<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('db_select', { sql, params });
  }

  const db = await ensureBrowserDb();
  const { sql: rewritten, bindings } = rewriteParams(sql, params);
  const results = db.exec(rewritten, bindings as unknown as initSqlJs.BindParams[]);
  if (results.length === 0) return [];

  const { columns, values } = results[0];
  return values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as T;
  });
}

export async function getConfig(key: string): Promise<string | null> {
  const rows = await select<{ value: string | null }>(
    'SELECT value FROM appConfig WHERE key = $1',
    [key],
  );
  return rows[0]?.value ?? null;
}

export async function setConfig(key: string, value: string | null): Promise<void> {
  await execute(
    `INSERT INTO appConfig (key, value) VALUES ($1, $2)
     ON CONFLICT(key) DO UPDATE SET value = $2`,
    [key, value],
  );
}

export async function closeDb(): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('db_close');
  }
}
