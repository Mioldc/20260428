import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { backupDatabase, restoreDatabase } from '@/lib/backup';
import { getConfig, setConfig } from '@/lib/db';
import type { LicenseInfo } from '@/types';

type PasswordUpdateResult = 'set' | 'cleared';

interface UseSettingsPageDataResult {
  currentPassword: string | null;
  passwordLoading: boolean;
  lastBackupTime: string | null;
  backingUp: boolean;
  restoring: boolean;
  licenseInfo: LicenseInfo | null;
  updateStartupPassword: (password: string) => Promise<PasswordUpdateResult>;
  createBackup: () => Promise<boolean>;
  restoreFromBackup: () => Promise<boolean>;
}

export function useSettingsPageData(): UseSettingsPageDataResult {
  const [currentPassword, setCurrentPassword] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(true);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);

  useEffect(() => {
    async function loadConfig(): Promise<void> {
      try {
        const [password, backupTime] = await Promise.all([
          getConfig('password'),
          getConfig('lastBackupTime'),
        ]);
        setCurrentPassword(password);
        setLastBackupTime(backupTime);

        try {
          const info = await invoke<LicenseInfo>('check_license');
          setLicenseInfo(info);
        } catch {
          setLicenseInfo(null);
        }
      } finally {
        setPasswordLoading(false);
      }
    }

    void loadConfig();
  }, []);

  const updateStartupPassword = useCallback(
    async (password: string): Promise<PasswordUpdateResult> => {
      const trimmed = password.trim();

      if (trimmed) {
        const hash = await invoke<string>('hash_password', { password: trimmed });
        await setConfig('password', hash);
        setCurrentPassword(hash);
        return 'set';
      }

      await setConfig('password', null);
      setCurrentPassword(null);
      return 'cleared';
    },
    [],
  );

  const createBackup = useCallback(async (): Promise<boolean> => {
    setBackingUp(true);
    try {
      const dest = await backupDatabase();
      if (!dest) {
        return false;
      }

      const backupTime = await getConfig('lastBackupTime');
      setLastBackupTime(backupTime);
      return true;
    } finally {
      setBackingUp(false);
    }
  }, []);

  const restoreFromBackup = useCallback(async (): Promise<boolean> => {
    setRestoring(true);
    try {
      return await restoreDatabase();
    } finally {
      setRestoring(false);
    }
  }, []);

  return {
    currentPassword,
    passwordLoading,
    lastBackupTime,
    backingUp,
    restoring,
    licenseInfo,
    updateStartupPassword,
    createBackup,
    restoreFromBackup,
  };
}
