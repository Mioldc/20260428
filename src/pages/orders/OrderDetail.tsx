import { type ReactElement, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { ArrowLeft, Pencil, Trash2, Plus } from 'lucide-react';
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
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useOrderDetail } from '@/hooks/useOrders';
import { createPayment, deletePayment } from '@/lib/queries/payments';
import { formatMoney, formatDate, formatCurrency, yuanToCents } from '@/lib/utils';
import type { OrderStatus, PaymentMethod } from '@/types';
import { ORDER_STATUS, PAYMENT_METHOD } from '@/types';

type Tab = 'info' | 'production' | 'payments';

interface PaymentFormState {
  amount: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  notes: string;
}

const EMPTY_PAYMENT: PaymentFormState = {
  amount: '',
  paymentDate: new Date().toISOString().slice(0, 10),
  paymentMethod: '现金',
  notes: '',
};

export function OrderDetail(): ReactElement {
  const { id } = useParams();
  const navigate = useNavigate();
  const numericId = id ? Number(id) : null;

  const { order, productions, payments, loading, changeStatus, remove, reload } =
    useOrderDetail(numericId);

  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(EMPTY_PAYMENT);
  const [savingPayment, setSavingPayment] = useState(false);
  const [deletePaymentId, setDeletePaymentId] = useState<number | null>(null);

  async function handleStatusChange(newStatus: OrderStatus): Promise<void> {
    try {
      await changeStatus(newStatus);
      toast.success(`状态已更新为"${newStatus}"`);
    } catch {
      toast.error('状态更新失败');
    }
  }

  async function handleDelete(): Promise<void> {
    try {
      await remove();
      toast.success('订单已删除');
      void navigate('/');
    } catch {
      toast.error('删除失败');
    }
  }

  async function handleAddPayment(): Promise<void> {
    if (!numericId) return;
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      toast.error('请输入正确的收款金额');
      return;
    }
    setSavingPayment(true);
    try {
      await createPayment({
        orderId: numericId,
        amount: yuanToCents(Number(paymentForm.amount)),
        paymentDate: paymentForm.paymentDate,
        paymentMethod: paymentForm.paymentMethod,
        notes: paymentForm.notes.trim() || undefined,
      });
      toast.success('收款登记成功');
      setPaymentDialogOpen(false);
      setPaymentForm(EMPTY_PAYMENT);
      await reload();
    } catch {
      toast.error('保存失败');
    } finally {
      setSavingPayment(false);
    }
  }

  async function handleDeletePayment(): Promise<void> {
    if (deletePaymentId === null) return;
    try {
      await deletePayment(deletePaymentId);
      toast.success('收款记录已删除');
      setDeletePaymentId(null);
      await reload();
    } catch {
      toast.error('删除失败');
    }
  }

  if (loading) {
    return <p className="text-center text-muted-foreground py-8">加载中...</p>;
  }

  if (!order) {
    return <p className="text-center text-muted-foreground py-8">订单不存在</p>;
  }

  const totalProduced = productions.reduce((sum, p) => sum + p.quantity, 0);
  const totalDefects = productions.reduce((sum, p) => sum + p.defectCount, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'info', label: '基本信息' },
    { key: 'production', label: `生产记录 (${productions.length})` },
    { key: 'payments', label: `收款记录 (${payments.length})` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{order.orderNo}</h2>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-muted-foreground">
              {order.customerName} · {order.productName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={order.status}
            onChange={(e) => void handleStatusChange(e.target.value as OrderStatus)}
            className="w-32"
          >
            {Object.values(ORDER_STATUS).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Button variant="outline" asChild>
            <Link to={`/orders/${id}/edit`}>
              <Pencil className="h-4 w-4" />
              编辑
            </Link>
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={() => setDeleteDialogOpen(true)}
            title="删除订单"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">总金额</p>
            <p className="text-xl font-bold">{formatMoney(order.totalAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">已收款</p>
            <p className="text-xl font-bold text-emerald-600">{formatMoney(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">未收金额</p>
            <p className={`text-xl font-bold ${order.unpaidAmount > 0 ? 'text-destructive' : ''}`}>
              {formatMoney(order.unpaidAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">已产 / 总量</p>
            <p className="text-xl font-bold">
              {totalProduced} / {order.quantity}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-3">订单信息</h4>
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">客户</dt>
                  <dd>
                    <Link
                      to={`/customers/${order.customerId}`}
                      className="text-primary hover:underline"
                    >
                      {order.customerName}
                    </Link>
                  </dd>
                  <dt className="text-muted-foreground">下单日期</dt>
                  <dd>{formatDate(order.orderDate)}</dd>
                  <dt className="text-muted-foreground">交货日期</dt>
                  <dd>{order.deliveryDate ? formatDate(order.deliveryDate) : '-'}</dd>
                  <dt className="text-muted-foreground">产品名称</dt>
                  <dd>{order.productName}</dd>
                  <dt className="text-muted-foreground">数量</dt>
                  <dd>{order.quantity.toLocaleString()}</dd>
                  <dt className="text-muted-foreground">单价</dt>
                  <dd>¥{formatCurrency(order.unitPrice)}</dd>
                  <dt className="text-muted-foreground">定金</dt>
                  <dd>{formatMoney(order.deposit)}</dd>
                </dl>
              </div>
              <div>
                <h4 className="font-semibold mb-3">绣花参数</h4>
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">花版名称</dt>
                  <dd>{order.patternName ?? '-'}</dd>
                  <dt className="text-muted-foreground">版号</dt>
                  <dd>{order.patternNo ?? '-'}</dd>
                  <dt className="text-muted-foreground">面料类型</dt>
                  <dd>{order.fabricType ?? '-'}</dd>
                  <dt className="text-muted-foreground">绣花位置</dt>
                  <dd>{order.embPosition ?? '-'}</dd>
                  <dt className="text-muted-foreground">绣花尺寸</dt>
                  <dd>{order.embSize ?? '-'}</dd>
                  <dt className="text-muted-foreground">颜色数</dt>
                  <dd>{order.colorCount ?? '-'}</dd>
                  <dt className="text-muted-foreground">针数</dt>
                  <dd>{order.stitchCount?.toLocaleString() ?? '-'}</dd>
                </dl>
              </div>
            </div>
            {order.specialNotes && (
              <div className="mt-6 rounded-lg bg-muted p-4">
                <h4 className="font-semibold mb-1">备注</h4>
                <p className="text-sm whitespace-pre-wrap">{order.specialNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'production' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>生产记录</CardTitle>
              <div className="text-sm text-muted-foreground">
                已产 {totalProduced} / 总量 {order.quantity}
                {totalDefects > 0 && ` · 次品 ${totalDefects}`}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {productions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">暂无生产记录</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日期</TableHead>
                    <TableHead>机台</TableHead>
                    <TableHead className="text-right">完成数量</TableHead>
                    <TableHead className="text-right">针数</TableHead>
                    <TableHead className="text-right">次品</TableHead>
                    <TableHead>备注</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productions.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{formatDate(p.date)}</TableCell>
                      <TableCell>{p.machineName}</TableCell>
                      <TableCell className="text-right">{p.quantity}</TableCell>
                      <TableCell className="text-right">
                        {p.stitchCount?.toLocaleString() ?? '-'}
                      </TableCell>
                      <TableCell className="text-right">{p.defectCount}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{p.notes ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'payments' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>收款记录</CardTitle>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  已收 {formatMoney(totalPaid)} / 总额 {formatMoney(order.totalAmount)}
                </span>
                <Button
                  size="sm"
                  onClick={() => {
                    setPaymentForm({
                      ...EMPTY_PAYMENT,
                      paymentDate: new Date().toISOString().slice(0, 10),
                    });
                    setPaymentDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  登记收款
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">暂无收款记录</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日期</TableHead>
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
                      <TableCell>{p.paymentMethod}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">
                        {formatMoney(p.amount)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{p.notes ?? '-'}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletePaymentId(p.id)}
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
      )}

      {/* Add payment dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>登记收款</DialogTitle>
            <DialogDescription>为订单 {order.orderNo} 登记一笔收款</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="pdAmount">金额（元） *</Label>
              <Input
                id="pdAmount"
                type="number"
                min={0}
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pdDate">收款日期</Label>
              <Input
                id="pdDate"
                type="date"
                value={paymentForm.paymentDate}
                onChange={(e) => setPaymentForm((p) => ({ ...p, paymentDate: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pdMethod">收款方式</Label>
              <Select
                id="pdMethod"
                value={paymentForm.paymentMethod}
                onChange={(e) =>
                  setPaymentForm((p) => ({
                    ...p,
                    paymentMethod: e.target.value as PaymentMethod,
                  }))
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
              <Label htmlFor="pdNotes">备注</Label>
              <Input
                id="pdNotes"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => void handleAddPayment()} disabled={savingPayment}>
              {savingPayment ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete payment confirm */}
      <Dialog open={deletePaymentId !== null} onOpenChange={() => setDeletePaymentId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除此收款记录吗？订单的未收金额将自动更新。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePaymentId(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => void handleDeletePayment()}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete order confirm */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除订单 {order.orderNo}{' '}
              吗？关联的生产记录和收款记录也会被一并删除，此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
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
