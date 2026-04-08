import { type ReactElement, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { useMachines } from '@/hooks/useMachines';
import type { Machine, NewMachine, MachineStatus } from '@/types';
import { MACHINE_STATUS } from '@/types';

interface MachineFormState {
  name: string;
  model: string;
  headCount: string;
  status: MachineStatus;
  notes: string;
}

const EMPTY_MACHINE: MachineFormState = {
  name: '',
  model: '',
  headCount: '',
  status: '正常',
  notes: '',
};

const MACHINE_STATUS_VARIANT: Record<MachineStatus, 'success' | 'warning' | 'secondary'> = {
  正常: 'success',
  维修: 'warning',
  停机: 'secondary',
};

export function SettingsPage(): ReactElement {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<MachineFormState>(EMPTY_MACHINE);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { machines, loading, create, update, remove } = useMachines();

  function openCreate(): void {
    setEditingId(null);
    setForm(EMPTY_MACHINE);
    setDialogOpen(true);
  }

  function openEdit(machine: Machine): void {
    setEditingId(machine.id);
    setForm({
      name: machine.name,
      model: machine.model ?? '',
      headCount: machine.headCount != null ? String(machine.headCount) : '',
      status: machine.status,
      notes: machine.notes ?? '',
    });
    setDialogOpen(true);
  }

  async function handleSave(): Promise<void> {
    if (!form.name.trim()) {
      toast.error('请输入机台名称');
      return;
    }
    setSaving(true);
    try {
      const data: NewMachine = {
        name: form.name.trim(),
        model: form.model.trim() || undefined,
        headCount: form.headCount ? Number(form.headCount) : undefined,
        status: form.status,
        notes: form.notes.trim() || undefined,
      };
      if (editingId) {
        await update(editingId, data);
        toast.success('机台信息已更新');
      } else {
        await create(data);
        toast.success('机台添加成功');
      }
      setDialogOpen(false);
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
      toast.success('机台已删除');
      setDeleteConfirmId(null);
    } catch {
      toast.error('删除失败，可能存在关联的生产记录');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">系统设置</h2>
        <p className="text-muted-foreground">管理机台、密码和数据备份</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>机台管理</CardTitle>
              <CardDescription>添加和管理绣花机台</CardDescription>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              添加机台
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-4">加载中...</p>
          ) : machines.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              暂无机台，点击"添加机台"添加第一台绣花机
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>型号</TableHead>
                  <TableHead>机头数</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead className="w-[100px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {machines.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>{m.model ?? '-'}</TableCell>
                    <TableCell>{m.headCount ?? '-'}</TableCell>
                    <TableCell>
                      <Badge variant={MACHINE_STATUS_VARIANT[m.status]}>{m.status}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{m.notes ?? '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(m)}
                          title="编辑"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirmId(m.id)}
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>启动密码</CardTitle>
            <CardDescription>设置应用启动密码</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">密码设置功能即将实现。</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>数据备份</CardTitle>
            <CardDescription>备份和恢复数据库</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">备份功能将在 Phase 3 实现。</p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑机台' : '添加机台'}</DialogTitle>
            <DialogDescription>{editingId ? '修改机台信息' : '填写机台基本信息'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="machineName">机台名称 *</Label>
              <Input
                id="machineName"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="如：1号机"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="machineModel">型号</Label>
                <Input
                  id="machineModel"
                  value={form.model}
                  onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
                  placeholder="如：田岛TMCE"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="headCount">机头数</Label>
                <Input
                  id="headCount"
                  type="number"
                  min={1}
                  value={form.headCount}
                  onChange={(e) => setForm((p) => ({ ...p, headCount: e.target.value }))}
                  placeholder="如：6"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="machineStatus">状态</Label>
              <Select
                id="machineStatus"
                value={form.status}
                onChange={(e) =>
                  setForm((p) => ({ ...p, status: e.target.value as MachineStatus }))
                }
              >
                {Object.values(MACHINE_STATUS).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="machineNotes">备注</Label>
              <Textarea
                id="machineNotes"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
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

      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除此机台吗？如果有关联的生产记录，删除将失败。
            </DialogDescription>
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
