import { type ReactElement } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { MainLayout } from '@/components/layout/MainLayout';
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

export function App(): ReactElement {
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
