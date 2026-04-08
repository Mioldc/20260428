import type { ReactElement } from 'react';
import { Badge } from '@/components/ui/badge';
import type { OrderStatus } from '@/types';

interface StatusBadgeProps {
  status: OrderStatus;
}

const STATUS_VARIANT_MAP: Record<
  OrderStatus,
  'default' | 'secondary' | 'warning' | 'success' | 'info'
> = {
  待打样: 'secondary',
  打样中: 'info',
  待生产: 'warning',
  生产中: 'default',
  已完成: 'success',
  已发货: 'success',
};

export function StatusBadge({ status }: StatusBadgeProps): ReactElement {
  const variant = STATUS_VARIANT_MAP[status] ?? 'secondary';
  return <Badge variant={variant}>{status}</Badge>;
}
