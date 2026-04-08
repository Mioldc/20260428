import { type ReactElement, useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
import { useProductionRecords } from '@/hooks/useProduction';
import { useMachines } from '@/hooks/useMachines';
import { useOrders } from '@/hooks/useOrders';
import { formatDate } from '@/lib/utils';
import type { OrderFilters } from '@/types';

const today = new Date().toISOString().slice(0, 10);

interface RecordForm {
  machineId: string;
  orderId: string;
  quantity: string;
  stitchCount: string;
  defectCount: string;
  notes: string;
}

const EMPTY_RECORD_FORM: RecordForm = {
  machineId: '',
  orderId: '',
  quantity: '',
  stitchCount: '',
  defectCount: '',
  notes: '',
};

const ACTIVE_ORDER_FILTER: OrderFilters = { status: '生产中' };

export function ProductionRecord(): ReactElement {
  const [date, setDate] = useState(today);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<RecordForm>(EMPTY_RECORD_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);

  const { records, loading: loadingRecords, create, remove } = useProductionRecords(date);
  const { machines, loading: loadingMachines } = useMachines();
  const { orders: activeOrders, loading: loadingOrders } = useOrders(ACTIVE_ORDER_FILTER);

  useEffect(() => {
    if (!loadingMachines && !loadingOrders) {
      setInitialized(true);
    }
  }, [loadingMachines, loadingOrders]);

  function updateField<K extends keyof RecordForm>(key: K, value: RecordForm[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(): Promise<void> {
    if (!form.machineId) {
      toast.error('请选择机台');
      return;
    }
    if (!form.orderId) {
      toast.error('请选择订单');
      return;
    }
    const qty = Number(form.quantity);
    if (!qty || qty <= 0) {
      toast.error('完成数量必须大于 0');
      return;
    }

    setSaving(true);
    try {
      await create({
        orderId: Number(form.orderId),
        machineId: Number(form.machineId),
        date,
        quantity: qty,
        stitchCount: form.stitchCount ? Number(form.stitchCount) : undefined,
        defectCount: form.defectCount ? Number(form.defectCount) : undefined,
        notes: form.notes.trim() || undefined,
      });
      toast.success('生产记录已保存');
      setForm(EMPTY_RECORD_FORM);
      setShowForm(false);
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (deleteConfirmId === null) return;
    try {
      await remove(deleteConfirmId);
      toast.success('记录已删除');
      setDeleteConfirmId(null);
    } catch {
      toast.error('删除失败');
    }
  }

  if (!initialized) {
    return <p className="text-center text-muted-foreground py-8">加载中...</p>;
  }

  const totalQty = records.reduce((sum, r) => sum + r.quantity, 0);
  const totalDefects = records.reduce((sum, r) => sum + r.defectCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">生产管理</h2>
          <p className="text-muted-foreground">录入和查看生产记录</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          录入产量
        </Button>
      </div>

      <div className="flex items-end gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="prodDate">日期</Label>
          <Input
            id="prodDate"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
        </div>
        <span className="text-sm text-muted-foreground pb-2">
          共 {records.length} 条记录 · 总产量 {totalQty}
          {totalDefects > 0 && ` · 次品 ${totalDefects}`}
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>生产记录 — {formatDate(date)}</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRecords ? (
            <p className="text-center text-muted-foreground py-8">加载中...</p>
          ) : records.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">当日暂无生产记录</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>机台</TableHead>
                  <TableHead>订单号</TableHead>
                  <TableHead>产品</TableHead>
                  <TableHead className="text-right">完成数量</TableHead>
                  <TableHead className="text-right">针数</TableHead>
                  <TableHead className="text-right">次品</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead className="w-[60px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.machineName}</TableCell>
                    <TableCell className="font-medium">{r.orderNo}</TableCell>
                    <TableCell>{r.productName}</TableCell>
                    <TableCell className="text-right">{r.quantity}</TableCell>
                    <TableCell className="text-right">
                      {r.stitchCount?.toLocaleString() ?? '-'}
                    </TableCell>
                    <TableCell className="text-right">{r.defectCount}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{r.notes ?? '-'}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirmId(r.id)}
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

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>录入产量</DialogTitle>
            <DialogDescription>日期：{formatDate(date)}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="machineId">机台 *</Label>
              <Select
                id="machineId"
                value={form.machineId}
                onChange={(e) => updateField('machineId', e.target.value)}
              >
                <option value="">-- 选择机台 --</option>
                {machines
                  .filter((m) => m.status === '正常')
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.headCount ? ` (${m.headCount}头)` : ''}
                    </option>
                  ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="orderId">订单 *</Label>
              <Select
                id="orderId"
                value={form.orderId}
                onChange={(e) => updateField('orderId', e.target.value)}
              >
                <option value="">-- 选择订单 --</option>
                {activeOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNo} - {o.productName} ({o.customerName})
                  </option>
                ))}
              </Select>
              {activeOrders.length === 0 && (
                <p className="text-xs text-muted-foreground">暂无"生产中"状态的订单</p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="recQty">完成数量 *</Label>
                <Input
                  id="recQty"
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) => updateField('quantity', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="recStitch">针数</Label>
                <Input
                  id="recStitch"
                  type="number"
                  min={0}
                  value={form.stitchCount}
                  onChange={(e) => updateField('stitchCount', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="recDefect">次品数</Label>
                <Input
                  id="recDefect"
                  type="number"
                  min={0}
                  value={form.defectCount}
                  onChange={(e) => updateField('defectCount', e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="recNotes">备注</Label>
              <Textarea
                id="recNotes"
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              取消
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>确定要删除此生产记录吗？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
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
