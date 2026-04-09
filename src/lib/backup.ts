import { closeDb, setConfig, getConfig } from '@/lib/db';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function backupDatabase(): Promise<string | null> {
  if (!isTauri()) return null;

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const defaultName = `xiuhua-backup-${dateStr}.db`;

  const { save } = await import('@tauri-apps/plugin-dialog');
  const { invoke } = await import('@tauri-apps/api/core');

  const dest = await save({
    defaultPath: defaultName,
    filters: [{ name: '数据库文件', extensions: ['db'] }],
  });
  if (!dest) return null;

  await invoke('backup_database', { dest });
  await setConfig('lastBackupTime', now.toISOString());
  return dest;
}

export async function restoreDatabase(): Promise<boolean> {
  if (!isTauri()) return false;

  const { open } = await import('@tauri-apps/plugin-dialog');
  const { invoke } = await import('@tauri-apps/api/core');

  const src = await open({
    multiple: false,
    filters: [{ name: '数据库文件', extensions: ['db'] }],
  });
  if (!src) return false;

  await closeDb();

  await invoke('restore_database', { src });
  return true;
}

export async function shouldRemindBackup(): Promise<boolean> {
  const lastBackup = await getConfig('lastBackupTime');
  if (!lastBackup) return true;

  const lastDate = new Date(lastBackup);
  const now = new Date();
  const diffDays = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > 7;
}
