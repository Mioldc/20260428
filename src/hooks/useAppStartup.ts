import { useCallback, useEffect, useState } from 'react';
import { getConfig } from '@/lib/db';

const isTauri =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

interface UseAppStartupResult {
  licensed: boolean;
  authenticated: boolean;
  passwordHash: string | null;
  loading: boolean;
  handleLicenseActivated: () => Promise<void>;
  handleAuthSuccess: () => void;
}

interface PasswordGateState {
  passwordHash: string | null;
  authenticated: boolean;
}

async function loadPasswordGateState(): Promise<PasswordGateState> {
  try {
    const passwordHash = await getConfig('password');
    return {
      passwordHash,
      authenticated: !passwordHash,
    };
  } catch {
    return {
      passwordHash: null,
      authenticated: true,
    };
  }
}

export function useAppStartup(): UseAppStartupResult {
  const [licensed, setLicensed] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordHash, setPasswordHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const syncPasswordGate = useCallback(async (): Promise<void> => {
    const nextState = await loadPasswordGateState();
    setPasswordHash(nextState.passwordHash);
    setAuthenticated(nextState.authenticated);
  }, []);

  useEffect(() => {
    async function init(): Promise<void> {
      if (isTauri) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('check_license');
          setLicensed(true);
        } catch {
          setLoading(false);
          return;
        }
      } else {
        setLicensed(true);
      }

      try {
        await syncPasswordGate();
      } finally {
        setLoading(false);
      }
    }

    void init();
  }, [syncPasswordGate]);

  const handleLicenseActivated = useCallback(async (): Promise<void> => {
    setLicensed(true);
    await syncPasswordGate();
  }, [syncPasswordGate]);

  const handleAuthSuccess = useCallback((): void => {
    setAuthenticated(true);
  }, []);

  return {
    licensed,
    authenticated,
    passwordHash,
    loading,
    handleLicenseActivated,
    handleAuthSuccess,
  };
}
