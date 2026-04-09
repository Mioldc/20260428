import { type ReactElement, useState, useCallback } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCustomers } from '@/hooks/useCustomers';
import { useStatement } from '@/hooks/useStatement';
import { formatMoney, formatDate } from '@/lib/utils';
import { exportStatement } from '@/lib/export';

export function Statement(): ReactElement {
  const { customers } = useCustomers();
  const [customerId, setCustomerId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { data, generating, generate } = useStatement();

  const handleGenerate = useCallback(async (): Promise<void> => {
    if (!customerId) {
      toast.error('请选择客户');
      return;
    }
    if (!dateFrom || !dateTo) {
      toast.error('请选择时间范围');
      return;
    }

    try {
      const success = await generate(Number(customerId), dateFrom, dateTo);
      if (!success) {
        toast.error('客户不存在');
      }
    } catch {
      toast.error('生成失败');
    }
  }, [customerId, dateFrom, dateTo, generate]);

  function handleExport(): void {
    if (!data) return;
    exportStatement(data.customer.name, data.dateFrom, data.dateTo, data.orders, data.payments, {
      totalOrderAmount: data.totalOrderAmount,
      totalDeposit: data.totalDeposit,
      totalPaid: data.totalPaid,
      balance: data.balance,
    });
    toast.success('对账单已导出');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/finance">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold">客户对账单</h2>
            <p className="text-muted-foreground">按客户和时间段生成对账单</p>
          </div>
        </div>
        {data && (
          <Button onClick={handleExport}>
            <Download className="h-4 w-4" />
            导出Excel
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="grid gap-2 flex-1">
              <Label htmlFor="stCustomer">客户 *</Label>
              <Select
                id="stCustomer"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">选择客户</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stFrom">开始日期 *</Label>
              <Input
                id="stFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stTo">结束日期 *</Label>
              <Input
                id="stTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <Button onClick={() => void handleGenerate()} disabled={generating}>
              {generating ? '生成中...' : '生成对账单'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">订单总额</p>
                <p className="text-xl font-bold">{formatMoney(data.totalOrderAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">定金总额</p>
                <p className="text-xl font-bold text-blue-600">{formatMoney(data.totalDeposit)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">收款总额</p>
                <p className="text-xl font-bold text-emerald-600">{formatMoney(data.totalPaid)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">未收余额</p>
                <p className={`text-xl font-bold ${data.balance > 0 ? 'text-destructive' : ''}`}>
                  {formatMoney(Math.max(0, data.balance))}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>订单明细 ({data.orders.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {data.orders.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">该时间段内无订单</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>订单号</TableHead>
                      <TableHead>产品</TableHead>
                      <TableHead>下单日期</TableHead>
                      <TableHead className="text-right">数量</TableHead>
                      <TableHead className="text-right">总金额</TableHead>
                      <TableHead className="text-right">定金</TableHead>
                      <TableHead className="text-right">未收</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.orders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell>
                          <Link to={`/orders/${o.id}`} className="text-primary hover:underline">
                            {o.orderNo}
                          </Link>
                        </TableCell>
                        <TableCell>{o.productName}</TableCell>
                        <TableCell>{formatDate(o.orderDate)}</TableCell>
                        <TableCell className="text-right">{o.quantity}</TableCell>
                        <TableCell className="text-right">{formatMoney(o.totalAmount)}</TableCell>
                        <TableCell className="text-right">{formatMoney(o.deposit)}</TableCell>
                        <TableCell className="text-right">{formatMoney(o.unpaidAmount)}</TableCell>
                        <TableCell>{o.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>收款明细 ({data.payments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {data.payments.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">该时间段内无收款记录</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日期</TableHead>
                      <TableHead>订单号</TableHead>
                      <TableHead>方式</TableHead>
                      <TableHead className="text-right">金额</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{formatDate(p.paymentDate)}</TableCell>
                        <TableCell>
                          <Link
                            to={`/orders/${p.orderId}`}
                            className="text-primary hover:underline"
                          >
                            {p.orderNo}
                          </Link>
                        </TableCell>
                        <TableCell>{p.paymentMethod}</TableCell>
                        <TableCell className="text-right font-medium text-emerald-600">
                          {formatMoney(p.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
