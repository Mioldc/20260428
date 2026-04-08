import { type ReactElement, useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { PasswordDialog } from '@/components/shared/PasswordDialog';
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
  const [authenticated, setAuthenticated] = useState(false);
  const [storedPassword, setStoredPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init(): Promise<void> {
      try {
        const pwd = await getConfig('password');
        setStoredPassword(pwd);
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

  if (!authenticated && storedPassword) {
    return (
      <PasswordDialog open={true} onSuccess={handleAuthSuccess} storedPassword={storedPassword} />
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
