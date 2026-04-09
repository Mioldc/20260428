import { type ReactElement, useState } from 'react';
import { Plus, Pencil, Trash2, Save, Database, Lock, Unlock, Shield } from 'lucide-react';
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
import { useSettingsPageData } from '@/hooks/useSettingsPageData';
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

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { machines, loading, create, update, remove } = useMachines();
  const {
    currentPassword,
    passwordLoading,
    lastBackupTime,
    backingUp,
    restoring,
    licenseInfo,
    updateStartupPassword,
    createBackup,
    restoreFromBackup,
  } = useSettingsPageData();

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

  async function handleSetPassword(): Promise<void> {
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }
    try {
      const result = await updateStartupPassword(newPassword);
      if (result === 'set') {
        toast.success('密码已设置');
      } else {
        toast.success('密码已清除');
      }
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('设置失败');
    }
  }

  async function handleBackup(): Promise<void> {
    try {
      const success = await createBackup();
      if (success) {
        toast.success('备份成功');
      }
    } catch {
      toast.error('备份失败');
    }
  }

  async function handleRestore(): Promise<void> {
    try {
      const success = await restoreFromBackup();
      if (success) {
        toast.success('恢复成功，即将重新加载应用...');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch {
      toast.error('恢复失败');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">系统设置</h2>
          <p className="text-muted-foreground">管理机台、密码和数据备份</p>
        </div>
      </div>

      {/* Machine management */}
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

      {/* License info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>授权信息</CardTitle>
              <CardDescription>{licenseInfo ? '已授权' : '未授权'}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {licenseInfo ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">产品</span>
                <span>{licenseInfo.product}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">版本</span>
                <span>{licenseInfo.edition}</span>
              </div>
              {licenseInfo.expires_at ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">有效期至</span>
                  <span>{licenseInfo.expires_at}</span>
                </div>
              ) : (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">有效期</span>
                  <span>永久</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">机器码</span>
                <code className="text-xs font-mono truncate max-w-[180px]">
                  {licenseInfo.hardware_id}
                </code>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              未找到有效授权。请在启动时导入授权文件。
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Password setting */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              {currentPassword ? (
                <Lock className="h-5 w-5 text-emerald-600" />
              ) : (
                <Unlock className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <CardTitle>启动密码</CardTitle>
                <CardDescription>
                  {passwordLoading
                    ? '加载中...'
                    : currentPassword
                      ? '已设置启动密码'
                      : '未设置启动密码'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="newPwd">新密码（留空则清除密码）</Label>
                <Input
                  id="newPwd"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="输入新密码"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPwd">确认密码</Label>
                <Input
                  id="confirmPwd"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                />
              </div>
              <Button size="sm" onClick={() => void handleSetPassword()} className="w-full">
                <Save className="h-4 w-4" />
                {newPassword ? '设置密码' : '清除密码'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Backup & restore */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <div>
                <CardTitle>数据备份</CardTitle>
                <CardDescription>
                  {lastBackupTime
                    ? `上次备份: ${new Date(lastBackupTime).toLocaleString('zh-CN')}`
                    : '从未备份过数据'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full" onClick={() => void handleBackup()} disabled={backingUp}>
                <Database className="h-4 w-4" />
                {backingUp ? '备份中...' : '一键备份'}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => void handleRestore()}
                disabled={restoring}
              >
                {restoring ? '恢复中...' : '从备份恢复'}
              </Button>
              <p className="text-xs text-muted-foreground">
                建议每周至少备份一次。恢复数据将覆盖当前所有数据，请谨慎操作。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Machine dialog */}
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
