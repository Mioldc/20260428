import { type ReactElement, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import type { Thread, NewThread, ThreadMaterial } from '@/types';
import { THREAD_MATERIAL } from '@/types';

interface ThreadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  thread: Thread | null;
  onSave: (id: number | null, data: NewThread) => Promise<void>;
}

const EMPTY_FORM: NewThread = {
  colorNo: '',
  brand: '',
  colorName: '',
  material: undefined,
  quantity: 0,
  minStock: 0,
  unitCost: undefined,
  supplier: '',
  notes: '',
};

function threadToForm(t: Thread): NewThread {
  return {
    colorNo: t.colorNo,
    brand: t.brand ?? '',
    colorName: t.colorName ?? '',
    material: (t.material as ThreadMaterial) ?? undefined,
    quantity: t.quantity,
    minStock: t.minStock,
    unitCost: t.unitCost ?? undefined,
    supplier: t.supplier ?? '',
    notes: t.notes ?? '',
  };
}

export function ThreadForm({ open, onOpenChange, thread, onSave }: ThreadFormProps): ReactElement {
  const isEditing = thread !== null;
  const [form, setForm] = useState<NewThread>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(thread ? threadToForm(thread) : EMPTY_FORM);
    }
  }, [open, thread]);

  const updateField = useCallback(<K extends keyof NewThread>(key: K, value: NewThread[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  async function handleSave(): Promise<void> {
    if (!form.colorNo.trim()) {
      toast.error('请输入色号');
      return;
    }
    setSaving(true);
    try {
      await onSave(thread?.id ?? null, form);
      onOpenChange(false);
    } catch {
      toast.error('保存失败，可能色号+品牌已存在');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? '编辑线材' : '新增线材'}</DialogTitle>
          <DialogDescription>
            {isEditing ? '修改线材基本信息' : '填写线材信息以添加到库存'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="tf-colorNo">色号 *</Label>
              <Input
                id="tf-colorNo"
                value={form.colorNo}
                onChange={(e) => updateField('colorNo', e.target.value)}
                placeholder="如 8000"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tf-brand">品牌</Label>
              <Input
                id="tf-brand"
                value={form.brand ?? ''}
                onChange={(e) => updateField('brand', e.target.value)}
                placeholder="如 Madeira"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="tf-colorName">颜色名称</Label>
              <Input
                id="tf-colorName"
                value={form.colorName ?? ''}
                onChange={(e) => updateField('colorName', e.target.value)}
                placeholder="如 大红"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tf-material">材质</Label>
              <Select
                id="tf-material"
                value={form.material ?? ''}
                onChange={(e) =>
                  updateField(
                    'material',
                    (e.target.value || undefined) as ThreadMaterial | undefined,
                  )
                }
              >
                <option value="">请选择</option>
                {Object.values(THREAD_MATERIAL).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {!isEditing && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tf-quantity">初始库存(筒)</Label>
                <Input
                  id="tf-quantity"
                  type="number"
                  min={0}
                  value={form.quantity ?? 0}
                  onChange={(e) => updateField('quantity', parseInt(e.target.value, 10) || 0)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tf-minStock-new">最低库存预警值</Label>
                <Input
                  id="tf-minStock-new"
                  type="number"
                  min={0}
                  value={form.minStock ?? 0}
                  onChange={(e) => updateField('minStock', parseInt(e.target.value, 10) || 0)}
                />
              </div>
            </div>
          )}
          {isEditing && (
            <div className="grid gap-2">
              <Label htmlFor="tf-minStock-edit">最低库存预警值</Label>
              <Input
                id="tf-minStock-edit"
                type="number"
                min={0}
                value={form.minStock ?? 0}
                onChange={(e) => updateField('minStock', parseInt(e.target.value, 10) || 0)}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="tf-unitCost">单价(元)</Label>
              <Input
                id="tf-unitCost"
                type="number"
                min={0}
                step={0.01}
                value={form.unitCost != null ? (form.unitCost / 100).toFixed(2) : ''}
                onChange={(e) =>
                  updateField(
                    'unitCost',
                    e.target.value ? Math.round(parseFloat(e.target.value) * 100) : undefined,
                  )
                }
                placeholder="可选"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tf-supplier">供应商</Label>
              <Input
                id="tf-supplier"
                value={form.supplier ?? ''}
                onChange={(e) => updateField('supplier', e.target.value)}
                placeholder="可选"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tf-notes">备注</Label>
            <Textarea
              id="tf-notes"
              value={form.notes ?? ''}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
