import { type ReactElement, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { Thread, NewThreadPurchase } from '@/types';

const ADJUST_REASONS = ['采购入库', '生产领用', '盘点调整', '其他'] as const;
type AdjustReason = (typeof ADJUST_REASONS)[number];

interface StockAdjustDialogProps {
  thread: Thread | null;
  onOpenChange: (open: boolean) => void;
  onAdjust: (id: number, delta: number) => Promise<void>;
  onAddPurchase: (data: NewThreadPurchase) => Promise<number>;
}

export function StockAdjustDialog({
  thread,
  onOpenChange,
  onAdjust,
  onAddPurchase,
}: StockAdjustDialogProps): ReactElement {
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState<AdjustReason>('采购入库');
  const [supplier, setSupplier] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (thread) {
      setDelta('');
      setReason('采购入库');
      setSupplier(thread.supplier ?? '');
      setUnitCost('');
      setTotalCost('');
    }
  }, [thread]);

  function close(): void {
    onOpenChange(false);
  }

  async function handleSubmit(): Promise<void> {
    if (!thread) return;
    const qty = parseInt(delta, 10);
    if (isNaN(qty) || qty === 0) {
      toast.error('请输入有效的调整数量');
      return;
    }
    setSaving(true);
    try {
      if (reason === '采购入库' && qty > 0) {
        const purchaseData: NewThreadPurchase = {
          threadId: thread.id,
          quantity: qty,
          unitCost: unitCost ? Math.round(parseFloat(unitCost) * 100) : undefined,
          totalCost: totalCost ? Math.round(parseFloat(totalCost) * 100) : undefined,
          supplier: supplier || undefined,
          purchaseDate: new Date().toISOString().slice(0, 10),
        };
        await onAddPurchase(purchaseData);
        toast.success(`已入库 ${qty} 筒，采购记录已保存`);
      } else {
        await onAdjust(thread.id, qty);
        toast.success(`库存已调整 ${qty > 0 ? '+' : ''}${qty} 筒`);
      }
      close();
    } catch {
      toast.error('调整失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={thread !== null} onOpenChange={() => close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>调整库存</DialogTitle>
          <DialogDescription>
            {thread
              ? `色号: ${thread.colorNo}${thread.brand ? ` · ${thread.brand}` : ''} — 当前库存: ${thread.quantity} 筒`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="adjustReason">调整原因</Label>
            <Select
              id="adjustReason"
              value={reason}
              onChange={(e) => setReason(e.target.value as AdjustReason)}
            >
              {ADJUST_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="adjustDelta">
              调整数量
              <span className="ml-1 text-xs text-muted-foreground">
                {reason === '采购入库' ? '(正数入库)' : '(正数入库，负数出库)'}
              </span>
            </Label>
            <Input
              id="adjustDelta"
              type="number"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder={reason === '采购入库' ? '如 10' : '如 10 或 -5'}
            />
          </div>
          {reason === '采购入库' && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="adjustSupplier">供应商</Label>
                <Input
                  id="adjustSupplier"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="可选"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="adjustUnitCost">单价(元)</Label>
                  <Input
                    id="adjustUnitCost"
                    type="number"
                    min={0}
                    step={0.01}
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    placeholder="可选"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="adjustTotalCost">总价(元)</Label>
                  <Input
                    id="adjustTotalCost"
                    type="number"
                    min={0}
                    step={0.01}
                    value={totalCost}
                    onChange={(e) => setTotalCost(e.target.value)}
                    placeholder="可选"
                  />
                </div>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            取消
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? '保存中...' : '确认调整'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
