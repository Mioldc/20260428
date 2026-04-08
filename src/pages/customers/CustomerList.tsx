import { type ReactElement, useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
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
import { useCustomers } from '@/hooks/useCustomers';
import type { Customer, NewCustomer, SettlementType } from '@/types';
import { SETTLEMENT_TYPE } from '@/types';

const EMPTY_FORM: NewCustomer = {
  name: '',
  contactPerson: '',
  phone: '',
  address: '',
  settlementType: '现结',
  invoiceInfo: '',
  notes: '',
};

export function CustomerList(): ReactElement {
  const [keyword, setKeyword] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<NewCustomer>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { customers, loading, create, update, remove } = useCustomers(keyword || undefined);

  function openCreate(): void {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(customer: Customer): void {
    setEditingId(customer.id);
    setForm({
      name: customer.name,
      contactPerson: customer.contactPerson ?? '',
      phone: customer.phone ?? '',
      address: customer.address ?? '',
      settlementType: customer.settlementType,
      invoiceInfo: customer.invoiceInfo ?? '',
      notes: customer.notes ?? '',
    });
    setDialogOpen(true);
  }

  async function handleSave(): Promise<void> {
    if (!form.name.trim()) {
      toast.error('请输入客户名称');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await update(editingId, form);
        toast.success('客户信息已更新');
      } else {
        await create(form);
        toast.success('客户创建成功');
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
      toast.success('客户已删除');
      setDeleteConfirmId(null);
    } catch {
      toast.error('删除失败，可能存在关联订单');
    }
  }

  function updateField<K extends keyof NewCustomer>(key: K, value: NewCustomer[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">客户管理</h2>
          <p className="text-muted-foreground">管理客户信息</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          新建客户
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>客户列表</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索客户名称/电话..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">加载中...</p>
          ) : customers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {keyword ? '未找到匹配的客户' : '暂无客户数据，点击"新建客户"创建第一个客户'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>客户名称</TableHead>
                  <TableHead>联系人</TableHead>
                  <TableHead>电话</TableHead>
                  <TableHead>结算方式</TableHead>
                  <TableHead>地址</TableHead>
                  <TableHead className="w-[100px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        to={`/customers/${c.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell>{c.contactPerson ?? '-'}</TableCell>
                    <TableCell>{c.phone ?? '-'}</TableCell>
                    <TableCell>{c.settlementType}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{c.address ?? '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(c)}
                          title="编辑"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirmId(c.id)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑客户' : '新建客户'}</DialogTitle>
            <DialogDescription>{editingId ? '修改客户信息' : '填写客户基本信息'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">客户名称 *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="如：xx服装厂"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="contactPerson">联系人</Label>
                <Input
                  id="contactPerson"
                  value={form.contactPerson ?? ''}
                  onChange={(e) => updateField('contactPerson', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">电话</Label>
                <Input
                  id="phone"
                  value={form.phone ?? ''}
                  onChange={(e) => updateField('phone', e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">地址</Label>
              <Input
                id="address"
                value={form.address ?? ''}
                onChange={(e) => updateField('address', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="settlementType">结算方式</Label>
                <Select
                  id="settlementType"
                  value={form.settlementType ?? '现结'}
                  onChange={(e) => updateField('settlementType', e.target.value as SettlementType)}
                >
                  {Object.values(SETTLEMENT_TYPE).map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invoiceInfo">开票信息</Label>
                <Input
                  id="invoiceInfo"
                  value={form.invoiceInfo ?? ''}
                  onChange={(e) => updateField('invoiceInfo', e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">备注</Label>
              <Textarea
                id="notes"
                value={form.notes ?? ''}
                onChange={(e) => updateField('notes', e.target.value)}
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
              确定要删除此客户吗？如果该客户有关联订单，删除将失败。
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
