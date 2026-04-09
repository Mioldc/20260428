import { useEffect } from 'react';
import { toast } from 'sonner';
import { shouldRemindBackup } from '@/lib/backup';

export function useBackupReminder(authenticated: boolean): void {
  useEffect(() => {
    if (!authenticated) return;

    async function checkBackup(): Promise<void> {
      try {
        const remind = await shouldRemindBackup();
        if (remind) {
          toast.warning('已超过 7 天未备份数据，建议前往"系统设置"进行备份', {
            duration: 8000,
          });
        }
      } catch {
        // silently ignore
      }
    }

    void checkBackup();
  }, [authenticated]);
}
