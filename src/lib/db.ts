import { invoke } from '@tauri-apps/api/core';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function assertTauri(): void {
  if (!isTauri()) {
    throw new Error('数据库仅在 Tauri 环境中可用。请使用 tauri dev 启动应用。');
  }
}

export async function execute(
  sql: string,
  params: unknown[] = [],
): Promise<{ rowsAffected: number; lastInsertId: number }> {
  assertTauri();
  return invoke('db_execute', { sql, params });
}

export async function select<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  assertTauri();
  return invoke('db_select', { sql, params });
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
  if (!isTauri()) return;
  await invoke('db_close');
}
