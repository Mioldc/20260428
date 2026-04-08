import { type ReactElement } from 'react';
import { Link, useLocation } from 'react-router';
import { FileText, Users, Factory, Wallet, HardHat, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  label: string;
  icon: ReactElement;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', label: '订单管理', icon: <FileText className="h-5 w-5" /> },
  { path: '/customers', label: '客户管理', icon: <Users className="h-5 w-5" /> },
  { path: '/production', label: '生产管理', icon: <Factory className="h-5 w-5" /> },
  { path: '/finance', label: '收款对账', icon: <Wallet className="h-5 w-5" /> },
  { path: '/workers', label: '工人工资', icon: <HardHat className="h-5 w-5" /> },
  { path: '/settings', label: '系统设置', icon: <Settings className="h-5 w-5" /> },
];

function isActive(currentPath: string, itemPath: string): boolean {
  if (itemPath === '/') {
    return currentPath === '/' || currentPath.startsWith('/orders');
  }
  return currentPath.startsWith(itemPath);
}

export function Sidebar(): ReactElement {
  const location = useLocation();

  return (
    <aside className="flex h-screen w-[220px] flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center border-b px-4">
        <h1 className="text-base font-bold text-sidebar-foreground">绣花厂订单管理</h1>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive(location.pathname, item.path)
                ? 'bg-sidebar-accent text-sidebar-primary'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t p-3">
        <p className="text-xs text-muted-foreground text-center">v0.1.0</p>
      </div>
    </aside>
  );
}
