import { type ReactElement } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useCustomerDetail } from '@/hooks/useCustomers';
import { useCustomerOrders } from '@/hooks/useOrders';
import { formatMoney, formatDate } from '@/lib/utils';

export function CustomerDetail(): ReactElement {
  const { id } = useParams();
  const numericId = id ? Number(id) : null;

  const { customer, loading: loadingCustomer } = useCustomerDetail(numericId);
  const { orders, loading: loadingOrders } = useCustomerOrders(numericId);

  const loading = loadingCustomer || loadingOrders;

  if (loading) {
    return <p className="text-center text-muted-foreground py-8">加载中...</p>;
  }

  if (!customer) {
    return <p className="text-center text-muted-foreground py-8">客户不存在</p>;
  }

  const totalAmount = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalUnpaid = orders.reduce((sum, o) => sum + o.unpaidAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/customers">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{customer.name}</h2>
          <p className="text-muted-foreground">客户详情</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
              <dt className="text-muted-foreground">联系人</dt>
              <dd>{customer.contactPerson ?? '-'}</dd>
              <dt className="text-muted-foreground">电话</dt>
              <dd>{customer.phone ?? '-'}</dd>
              <dt className="text-muted-foreground">地址</dt>
              <dd>{customer.address ?? '-'}</dd>
              <dt className="text-muted-foreground">结算方式</dt>
              <dd>{customer.settlementType}</dd>
              <dt className="text-muted-foreground">开票信息</dt>
              <dd>{customer.invoiceInfo ?? '-'}</dd>
              <dt className="text-muted-foreground">备注</dt>
              <dd>{customer.notes ?? '-'}</dd>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>汇总</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
              <dt className="text-muted-foreground">总订单数</dt>
              <dd className="font-semibold">{orders.length}</dd>
              <dt className="text-muted-foreground">总金额</dt>
              <dd className="font-semibold">{formatMoney(totalAmount)}</dd>
              <dt className="text-muted-foreground">未收金额</dt>
              <dd className="font-semibold text-destructive">{formatMoney(totalUnpaid)}</dd>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>历史订单</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">暂无订单</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>订单号</TableHead>
                  <TableHead>产品名称</TableHead>
                  <TableHead>数量</TableHead>
                  <TableHead>总金额</TableHead>
                  <TableHead>未收</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>下单日期</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link
                        to={`/orders/${o.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {o.orderNo}
                      </Link>
                    </TableCell>
                    <TableCell>{o.productName}</TableCell>
                    <TableCell>{o.quantity}</TableCell>
                    <TableCell>{formatMoney(o.totalAmount)}</TableCell>
                    <TableCell className={o.unpaidAmount > 0 ? 'text-destructive' : ''}>
                      {formatMoney(o.unpaidAmount)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                    </TableCell>
                    <TableCell>{formatDate(o.orderDate)}</TableCell>
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
