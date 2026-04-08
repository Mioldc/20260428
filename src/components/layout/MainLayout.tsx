import { type ReactElement } from 'react';
import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';
import { Toaster } from 'sonner';

export function MainLayout(): ReactElement {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl p-6">
          <Outlet />
        </div>
      </main>
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
