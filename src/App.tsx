import { type ReactElement, useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { PasswordDialog } from '@/components/shared/PasswordDialog';
import { LicenseGate } from '@/components/shared/LicenseGate';
import { OrderList } from '@/pages/orders/OrderList';
import { OrderForm } from '@/pages/orders/OrderForm';
import { OrderDetail } from '@/pages/orders/OrderDetail';
import { ProductionRecord } from '@/pages/production/ProductionRecord';
import { Finance } from '@/pages/finance/Finance';
import { Statement } from '@/pages/finance/Statement';
import { CustomerList } from '@/pages/customers/CustomerList';
import { CustomerDetail } from '@/pages/customers/CustomerDetail';
import { WorkerList } from '@/pages/workers/WorkerList';
import { Attendance } from '@/pages/workers/Attendance';
import { SettingsPage } from '@/pages/Settings';
import { getConfig } from '@/lib/db';
import { shouldRemindBackup } from '@/lib/backup';

export function App(): ReactElement {
  const [licensed, setLicensed] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordHash, setPasswordHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init(): Promise<void> {
      try {
        await invoke('check_license');
        setLicensed(true);
      } catch {
        setLoading(false);
        return;
      }

      try {
        const pwd = await getConfig('password');
        setPasswordHash(pwd);
        if (!pwd) {
          setAuthenticated(true);
        }
      } catch {
        setAuthenticated(true);
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, []);

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

  const handleLicenseActivated = useCallback(async (): Promise<void> => {
    setLicensed(true);
    try {
      const pwd = await getConfig('password');
      setPasswordHash(pwd);
      if (!pwd) {
        setAuthenticated(true);
      }
    } catch {
      setAuthenticated(true);
    }
  }, []);

  const handleAuthSuccess = useCallback((): void => {
    setAuthenticated(true);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (!licensed) {
    return <LicenseGate onActivated={() => void handleLicenseActivated()} />;
  }

  if (!authenticated && passwordHash) {
    return (
      <PasswordDialog open={true} onSuccess={handleAuthSuccess} passwordHash={passwordHash} />
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<OrderList />} />
          <Route path="orders/new" element={<OrderForm />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="orders/:id/edit" element={<OrderForm />} />
          <Route path="production" element={<ProductionRecord />} />
          <Route path="finance" element={<Finance />} />
          <Route path="finance/statement" element={<Statement />} />
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="workers" element={<WorkerList />} />
          <Route path="workers/attendance" element={<Attendance />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
