import Database from '@tauri-apps/plugin-sql';

const DB_URL = 'sqlite:xiuhua.db';

let connection: Database | null = null;

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function getDb(): Promise<Database> {
  if (!connection) {
    if (!isTauri()) {
      throw new Error('数据库仅在 Tauri 环境中可用。请使用 tauri dev 启动应用。');
    }
    connection = await Database.load(DB_URL);
  }
  return connection;
}

export async function execute(
  sql: string,
  params: unknown[] = [],
): Promise<{ rowsAffected: number; lastInsertId: number }> {
  const db = await getDb();
  const result = await db.execute(sql, params);
  return {
    rowsAffected: result.rowsAffected,
    lastInsertId: result.lastInsertId ?? 0,
  };
}

export async function select<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  return db.select<T[]>(sql, params);
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
  if (connection) {
    await connection.close();
    connection = null;
  }
}
