import { type ReactElement, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router';
import { Plus, Trash2, Download, Search } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { usePayments } from '@/hooks/usePayments';
import { useOrders } from '@/hooks/useOrders';
import { formatMoney, formatDate, yuanToCents } from '@/lib/utils';
import { exportPaymentList } from '@/lib/export';
import type { PaymentMethod, OrderWithCustomer } from '@/types';
import { PAYMENT_METHOD } from '@/types';

interface PaymentFormState {
  orderId: string;
  amount: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  notes: string;
}

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const now = new Date();
const today = toLocalDateStr(now);
const monthFirstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
const monthLastDay = toLocalDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0));

const EMPTY_FORM: PaymentFormState = {
  orderId: '',
  amount: '',
  paymentDate: today,
  paymentMethod: '现金',
  notes: '',
};

function loadSavedDate(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function Finance(): ReactElement {
  const [keyword, setKeyword] = useState('');
  const [dateFrom, _setDateFrom] = useState(() => loadSavedDate('finance_dateFrom', monthFirstDay));
  const [dateTo, _setDateTo] = useState(() => loadSavedDate('finance_dateTo', monthLastDay));

  const setDateFrom = useCallback((v: string) => {
    _setDateFrom(v);
    try { localStorage.setItem('finance_dateFrom', v); } catch { /* ignore */ }
  }, []);
  const setDateTo = useCallback((v: string) => {
    _setDateTo(v);
    try { localStorage.setItem('finance_dateTo', v); } catch { /* ignore */ }
  }, []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<PaymentFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [orderSearch, setOrderSearch] = useState('');

  const { payments, loading, create, remove } = usePayments({
    keyword: keyword || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const { orders } = useOrders({ keyword: orderSearch || undefined });

  const totalAmount = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);

  function openCreate(): void {
    setForm({ ...EMPTY_FORM, paymentDate: new Date().toISOString().slice(0, 10) });
    setOrderSearch('');
    setDialogOpen(true);
  }

  async function handleSave(): Promise<void> {
    if (!form.orderId) {
      toast.error('请选择订单');
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error('请输入正确的收款金额');
      return;
    }
    setSaving(true);
    try {
      await create({
        orderId: Number(form.orderId),
        amount: yuanToCents(Number(form.amount)),
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod,
        notes: form.notes.trim() || undefined,
      });
      toast.success('收款登记成功');
      setDialogOpen(false);
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (deleteId === null) return;
    try {
      await remove(deleteId);
      toast.success('收款记录已删除');
      setDeleteId(null);
    } catch {
      toast.error('删除失败');
    }
  }

  function handleExport(): void {
    exportPaymentList(
      payments.map((p) => ({
        orderNo: p.orderNo,
        customerName: p.customerName,
        productName: p.productName,
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
        amount: p.amount,
        notes: p.notes,
      })),
    );
    toast.success('导出成功');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">收款对账</h2>
          <p className="text-muted-foreground">管理收款记录和客户对账</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={payments.length === 0}>
            <Download className="h-4 w-4" />
            导出
          </Button>
          <Button variant="outline" asChild>
            <Link to="/finance/statement">生成对账单</Link>
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            登记收款
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label htmlFor="search" className="sr-only">
                搜索
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="搜索订单号、产品、客户..."
                  className="pl-10"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dateFrom">开始日期</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dateTo">结束日期</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
            {(keyword || dateFrom !== monthFirstDay || dateTo !== monthLastDay) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setKeyword('');
                  setDateFrom(monthFirstDay);
                  setDateTo(monthLastDay);
                }}
              >
                清除
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>收款记录</CardTitle>
            <div className="text-sm text-muted-foreground">
              共 {payments.length} 笔 · 合计 {formatMoney(totalAmount)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-4">加载中...</p>
          ) : payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">暂无收款记录</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日期</TableHead>
                  <TableHead>订单号</TableHead>
                  <TableHead>客户</TableHead>
                  <TableHead>产品</TableHead>
                  <TableHead>方式</TableHead>
                  <TableHead className="text-right">金额</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead className="w-[60px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.paymentDate)}</TableCell>
                    <TableCell>
                      <Link to={`/orders/${p.orderId}`} className="text-primary hover:underline">
                        {p.orderNo}
                      </Link>
                    </TableCell>
                    <TableCell>{p.customerName}</TableCell>
                    <TableCell>{p.productName}</TableCell>
                    <TableCell>{p.paymentMethod}</TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">
                      {formatMoney(p.amount)}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">{p.notes ?? '-'}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(p.id)}
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add payment dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>登记收款</DialogTitle>
            <DialogDescription>记录一笔订单收款</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="payOrder">订单 *</Label>
              <Input
                placeholder="输入订单号搜索..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
              {orderSearch && (
                <Select
                  id="payOrder"
                  value={form.orderId}
                  onChange={(e) => setForm((p) => ({ ...p, orderId: e.target.value }))}
                >
                  <option value="">选择订单</option>
                  {orders.map((o: OrderWithCustomer) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNo} - {o.customerName} - {o.productName} (欠
                      {formatMoney(o.unpaidAmount)})
                    </option>
                  ))}
                </Select>
              )}
              {!orderSearch && (
                <Select
                  id="payOrder"
                  value={form.orderId}
                  onChange={(e) => setForm((p) => ({ ...p, orderId: e.target.value }))}
                >
                  <option value="">选择订单</option>
                  {orders.map((o: OrderWithCustomer) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNo} - {o.customerName} - {o.productName} (欠
                      {formatMoney(o.unpaidAmount)})
                    </option>
                  ))}
                </Select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="payAmount">金额（元） *</Label>
                <Input
                  id="payAmount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="payDate">收款日期</Label>
                <Input
                  id="payDate"
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) => setForm((p) => ({ ...p, paymentDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payMethod">收款方式</Label>
              <Select
                id="payMethod"
                value={form.paymentMethod}
                onChange={(e) =>
                  setForm((p) => ({ ...p, paymentMethod: e.target.value as PaymentMethod }))
                }
              >
                {Object.values(PAYMENT_METHOD).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payNotes">备注</Label>
              <Input
                id="payNotes"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除此收款记录吗？订单的未收金额将自动更新。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
