import { type ReactElement, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useOrderForm } from '@/hooks/useOrders';
import { useCustomers } from '@/hooks/useCustomers';
import { generateOrderNo, yuanToCents, formatCurrency } from '@/lib/utils';
import type { NewOrder, OrderStatus } from '@/types';
import { ORDER_STATUS } from '@/types';

interface OrderFormState {
  orderNo: string;
  customerId: string;
  orderDate: string;
  deliveryDate: string;
  productName: string;
  patternName: string;
  patternNo: string;
  fabricType: string;
  embPosition: string;
  embSize: string;
  colorCount: string;
  stitchCount: string;
  quantity: string;
  unitPrice: string;
  deposit: string;
  status: OrderStatus;
  specialNotes: string;
}

const today = new Date().toISOString().slice(0, 10);

function emptyForm(): OrderFormState {
  return {
    orderNo: '',
    customerId: '',
    orderDate: today,
    deliveryDate: '',
    productName: '',
    patternName: '',
    patternNo: '',
    fabricType: '',
    embPosition: '',
    embSize: '',
    colorCount: '',
    stitchCount: '',
    quantity: '',
    unitPrice: '',
    deposit: '',
    status: ORDER_STATUS.PENDING_SAMPLE,
    specialNotes: '',
  };
}

export function OrderForm(): ReactElement {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const editId = id ? Number(id) : undefined;

  const [form, setForm] = useState<OrderFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const { customers, create: createCustomer, reload: reloadCustomers } = useCustomers();
  const { nextSequence, existingOrder, loading, save } = useOrderForm(editId);

  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  useEffect(() => {
    if (loading) return;
    if (isEditing && existingOrder) {
      setForm({
        orderNo: existingOrder.orderNo,
        customerId: String(existingOrder.customerId),
        orderDate: existingOrder.orderDate.slice(0, 10),
        deliveryDate: existingOrder.deliveryDate?.slice(0, 10) ?? '',
        productName: existingOrder.productName,
        patternName: existingOrder.patternName ?? '',
        patternNo: existingOrder.patternNo ?? '',
        fabricType: existingOrder.fabricType ?? '',
        embPosition: existingOrder.embPosition ?? '',
        embSize: existingOrder.embSize ?? '',
        colorCount: existingOrder.colorCount != null ? String(existingOrder.colorCount) : '',
        stitchCount: existingOrder.stitchCount != null ? String(existingOrder.stitchCount) : '',
        quantity: String(existingOrder.quantity),
        unitPrice: formatCurrency(existingOrder.unitPrice),
        deposit: formatCurrency(existingOrder.deposit),
        status: existingOrder.status,
        specialNotes: existingOrder.specialNotes ?? '',
      });
    } else if (!isEditing && nextSequence > 0) {
      setForm((prev) => ({ ...prev, orderNo: generateOrderNo(nextSequence) }));
    } else if (isEditing && !existingOrder) {
      toast.error('订单不存在');
      void navigate('/');
    }
  }, [loading, isEditing, existingOrder, nextSequence, navigate]);

  const qty = Number(form.quantity) || 0;
  const price = yuanToCents(Number(form.unitPrice) || 0);
  const totalAmount = qty * price;
  const depositCents = yuanToCents(Number(form.deposit) || 0);
  const unpaidAmount = totalAmount - depositCents;

  function updateField<K extends keyof OrderFormState>(key: K, value: OrderFormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(): Promise<void> {
    if (!form.customerId) {
      toast.error('请选择客户');
      return;
    }
    if (!form.productName.trim()) {
      toast.error('请输入产品名称');
      return;
    }
    if (qty <= 0) {
      toast.error('数量必须大于 0');
      return;
    }
    if (price <= 0) {
      toast.error('单价必须大于 0');
      return;
    }

    setSaving(true);
    try {
      const data: NewOrder = {
        orderNo: form.orderNo,
        customerId: Number(form.customerId),
        orderDate: form.orderDate,
        deliveryDate: form.deliveryDate || undefined,
        productName: form.productName.trim(),
        patternName: form.patternName.trim() || undefined,
        patternNo: form.patternNo.trim() || undefined,
        fabricType: form.fabricType.trim() || undefined,
        embPosition: form.embPosition.trim() || undefined,
        embSize: form.embSize.trim() || undefined,
        colorCount: form.colorCount ? Number(form.colorCount) : undefined,
        stitchCount: form.stitchCount ? Number(form.stitchCount) : undefined,
        quantity: qty,
        unitPrice: price,
        totalAmount,
        deposit: depositCents,
        unpaidAmount: Math.max(0, unpaidAmount),
        status: form.status,
        specialNotes: form.specialNotes.trim() || undefined,
      };

      const savedId = await save(data, editId);
      if (isEditing) {
        toast.success('订单已更新');
      } else {
        toast.success('订单创建成功');
      }
      void navigate(`/orders/${savedId}`);
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateCustomer(): Promise<void> {
    if (!newCustomerName.trim()) {
      toast.error('请输入客户名称');
      return;
    }
    try {
      const newId = await createCustomer({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || undefined,
      });
      await reloadCustomers();
      setForm((prev) => ({ ...prev, customerId: String(newId) }));
      setCustomerDialogOpen(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      toast.success('客户创建成功');
    } catch {
      toast.error('创建客户失败');
    }
  }

  if (loading) {
    return <p className="text-center text-muted-foreground py-8">加载中...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => void navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{isEditing ? '编辑订单' : '新建订单'}</h2>
          <p className="text-muted-foreground">
            {isEditing ? `修改订单 ${form.orderNo}` : '填写新订单信息'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="orderNo">订单号</Label>
                <Input id="orderNo" value={form.orderNo} readOnly className="bg-muted" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">状态</Label>
                <Select
                  id="status"
                  value={form.status}
                  onChange={(e) => updateField('status', e.target.value as OrderStatus)}
                >
                  {Object.values(ORDER_STATUS).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="customerId">客户 *</Label>
              <div className="flex gap-2">
                <Select
                  id="customerId"
                  value={form.customerId}
                  onChange={(e) => updateField('customerId', e.target.value)}
                  className="flex-1"
                >
                  <option value="">-- 请选择客户 --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCustomerDialogOpen(true)}
                  title="新建客户"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="orderDate">下单日期 *</Label>
                <Input
                  id="orderDate"
                  type="date"
                  value={form.orderDate}
                  onChange={(e) => updateField('orderDate', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deliveryDate">交货日期</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={form.deliveryDate}
                  onChange={(e) => updateField('deliveryDate', e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="productName">产品名称 *</Label>
              <Input
                id="productName"
                value={form.productName}
                onChange={(e) => updateField('productName', e.target.value)}
                placeholder="如：连衣裙胸口绣花"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>绣花参数</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="patternName">花版名称</Label>
                <Input
                  id="patternName"
                  value={form.patternName}
                  onChange={(e) => updateField('patternName', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="patternNo">版号</Label>
                <Input
                  id="patternNo"
                  value={form.patternNo}
                  onChange={(e) => updateField('patternNo', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fabricType">面料类型</Label>
                <Input
                  id="fabricType"
                  value={form.fabricType}
                  onChange={(e) => updateField('fabricType', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="embPosition">绣花位置</Label>
                <Input
                  id="embPosition"
                  value={form.embPosition}
                  onChange={(e) => updateField('embPosition', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="embSize">绣花尺寸</Label>
                <Input
                  id="embSize"
                  value={form.embSize}
                  onChange={(e) => updateField('embSize', e.target.value)}
                  placeholder="如：10x15cm"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="colorCount">颜色数</Label>
                <Input
                  id="colorCount"
                  type="number"
                  min={0}
                  value={form.colorCount}
                  onChange={(e) => updateField('colorCount', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="stitchCount">针数</Label>
                <Input
                  id="stitchCount"
                  type="number"
                  min={0}
                  value={form.stitchCount}
                  onChange={(e) => updateField('stitchCount', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>价格与数量</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">数量 *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) => updateField('quantity', e.target.value)}
                  placeholder="件数"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unitPrice">单价（元）*</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.unitPrice}
                  onChange={(e) => updateField('unitPrice', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label>总金额</Label>
                <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-base font-semibold">
                  ¥{formatCurrency(totalAmount)}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deposit">定金（元）</Label>
                <Input
                  id="deposit"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.deposit}
                  onChange={(e) => updateField('deposit', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">未收金额：</span>
              <span
                className={unpaidAmount > 0 ? 'font-semibold text-destructive' : 'font-semibold'}
              >
                ¥{formatCurrency(Math.max(0, unpaidAmount))}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>备注</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={form.specialNotes}
              onChange={(e) => updateField('specialNotes', e.target.value)}
              placeholder="特殊要求、注意事项..."
              rows={3}
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => void navigate(-1)}>
          取消
        </Button>
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? '保存中...' : isEditing ? '保存修改' : '创建订单'}
        </Button>
      </div>

      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>快速新建客户</DialogTitle>
            <DialogDescription>输入客户基本信息，后续可在客户管理中补充完善</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="newCustName">客户名称 *</Label>
              <Input
                id="newCustName"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="如：xx服装厂"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newCustPhone">电话</Label>
              <Input
                id="newCustPhone"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomerDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => void handleCreateCustomer()}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
