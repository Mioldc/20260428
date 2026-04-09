import { type ReactElement, useState, useMemo } from 'react';
import { Link } from 'react-router';
import { Plus, Search, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useOrders } from '@/hooks/useOrders';
import { formatMoney, formatDate, cn } from '@/lib/utils';
import { exportOrderList } from '@/lib/export';
import type { OrderStatus } from '@/types';
import { ORDER_STATUS } from '@/types';

const ALL_STATUSES: (OrderStatus | null)[] = [null, ...Object.values(ORDER_STATUS)];

const STATUS_LABELS: Record<string, string> = {
  '': '全部',
  ...Object.fromEntries(Object.values(ORDER_STATUS).map((s) => [s, s])),
};

export function OrderList(): ReactElement {
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filters = useMemo(
    () => ({
      status: statusFilter ?? undefined,
      keyword: keyword.trim() || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [keyword, statusFilter, dateFrom, dateTo],
  );

  const { orders, loading, changeStatus } = useOrders(filters);

  async function handleStatusChange(orderId: number, newStatus: OrderStatus): Promise<void> {
    try {
      await changeStatus(orderId, newStatus);
      toast.success(`状态已更新为"${newStatus}"`);
    } catch {
      toast.error('状态更新失败');
    }
  }

  if (loading && orders.length === 0) {
    toast.dismiss();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">订单管理</h2>
          <p className="text-muted-foreground">管理所有绣花订单</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              exportOrderList(orders);
              toast.success('订单列表已导出');
            }}
            disabled={orders.length === 0}
          >
            <Download className="h-4 w-4" />
            导出
          </Button>
          <Button asChild>
            <Link to="/orders/new">
              <Plus className="h-4 w-4" />
              新建订单
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-wrap items-center gap-1">
          {ALL_STATUSES.map((s) => (
            <Button
              key={s ?? ''}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {STATUS_LABELS[s ?? '']}
            </Button>
          ))}
        </div>
        <div className="relative w-64 shrink-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索订单号/产品/客户..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground shrink-0">下单日期</span>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-[140px] h-8 text-sm"
        />
        <span className="text-muted-foreground">—</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-[140px] h-8 text-sm"
        />
        {(dateFrom || dateTo) && (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => {
              setDateFrom('');
              setDateTo('');
            }}
          >
            清除日期
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">加载中...</p>
          ) : orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {keyword || statusFilter || dateFrom || dateTo
                ? '未找到匹配的订单'
                : '暂无订单数据，点击"新建订单"创建第一个订单'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>订单号</TableHead>
                  <TableHead>客户</TableHead>
                  <TableHead>产品名称</TableHead>
                  <TableHead className="text-right">数量</TableHead>
                  <TableHead className="text-right">总金额</TableHead>
                  <TableHead className="text-right">未收</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>下单日期</TableHead>
                  <TableHead>交货日期</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id} className="cursor-pointer">
                    <TableCell>
                      <Link
                        to={`/orders/${o.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {o.orderNo}
                      </Link>
                    </TableCell>
                    <TableCell>{o.customerName ?? '-'}</TableCell>
                    <TableCell>{o.productName}</TableCell>
                    <TableCell className="text-right">{o.quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{formatMoney(o.totalAmount)}</TableCell>
                    <TableCell
                      className={cn(
                        'text-right',
                        o.unpaidAmount > 0 && 'text-destructive font-medium',
                      )}
                    >
                      {formatMoney(o.unpaidAmount)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={o.status}
                        onChange={(e) =>
                          void handleStatusChange(o.id, e.target.value as OrderStatus)
                        }
                        className="h-7 w-28 text-xs"
                      >
                        {Object.values(ORDER_STATUS).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell>{formatDate(o.orderDate)}</TableCell>
                    <TableCell>{o.deliveryDate ? formatDate(o.deliveryDate) : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
