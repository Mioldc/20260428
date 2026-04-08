import { type ReactElement, useState, useMemo } from 'react';
import { Link } from 'react-router';
import { Plus, Pencil, Trash2, Download, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { useWorkers, useWageRecords, useTempWorkerSummary } from '@/hooks/useWorkers';
import { formatMoney } from '@/lib/utils';
import { exportWageDetail, exportTempWageDetail } from '@/lib/export';
import {
  getDailyAttendances,
  markAttendancePaid,
  markAttendanceUnpaid,
} from '@/lib/queries/workers';
import type { Worker, NewWorker, WorkerType, WorkerStatus } from '@/types';
import { WORKER_TYPE, WORKER_STATUS } from '@/types';

type Tab = 'list' | 'wages' | 'temp';

interface WorkerFormState {
  name: string;
  type: WorkerType;
  monthlySalary: string;
  dayRate: string;
  nightRate: string;
  joinDate: string;
  status: WorkerStatus;
  phone: string;
  notes: string;
}

const EMPTY_FORM: WorkerFormState = {
  name: '',
  type: '长工',
  monthlySalary: '',
  dayRate: '',
  nightRate: '',
  joinDate: '',
  status: '在职',
  phone: '',
  notes: '',
};

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthStart(month: string): string {
  return `${month}-01`;
}

function monthEnd(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  if (year === undefined || mon === undefined) return `${month}-31`;
  const lastDay = new Date(year, mon, 0).getDate();
  return `${month}-${String(lastDay).padStart(2, '0')}`;
}

export function WorkerList(): ReactElement {
  const [activeTab, setActiveTab] = useState<Tab>('list');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<WorkerFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [wageMonth, setWageMonth] = useState(currentMonth());
  const [tempMonth, setTempMonth] = useState(currentMonth());

  const { workers, loading, create, update, remove } = useWorkers();
  const {
    records: wageRecords,
    loading: wagesLoading,
    generate,
    setPaid,
    setUnpaid,
    remove: removeWage,
  } = useWageRecords(wageMonth);
  const {
    summary: tempSummary,
    loading: tempLoading,
    reload: reloadTempSummary,
  } = useTempWorkerSummary(monthStart(tempMonth), monthEnd(tempMonth));

  const wageTotals = useMemo(() => {
    const total = wageRecords.reduce((s, r) => s + r.salary, 0);
    const paid = wageRecords.filter((r) => r.isPaid).reduce((s, r) => s + r.salary, 0);
    return { total, paid, unpaid: total - paid };
  }, [wageRecords]);

  const tempTotals = useMemo(() => {
    const total = tempSummary.reduce((s, r) => s + r.totalAmount, 0);
    const paid = tempSummary.reduce((s, r) => s + r.paidAmount, 0);
    return { total, paid, unpaid: total - paid };
  }, [tempSummary]);

  function openCreate(): void {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(w: Worker): void {
    setEditingId(w.id);
    setForm({
      name: w.name,
      type: w.type,
      monthlySalary: w.monthlySalary != null ? String(w.monthlySalary / 100) : '',
      dayRate: w.dayRate != null ? String(w.dayRate / 100) : '',
      nightRate: w.nightRate != null ? String(w.nightRate / 100) : '',
      joinDate: w.joinDate ?? '',
      status: w.status,
      phone: w.phone ?? '',
      notes: w.notes ?? '',
    });
    setDialogOpen(true);
  }

  async function handleSave(): Promise<void> {
    if (!form.name.trim()) {
      toast.error('请输入工人姓名');
      return;
    }
    setSaving(true);
    try {
      const data: NewWorker = {
        name: form.name.trim(),
        type: form.type,
        monthlySalary: form.monthlySalary
          ? Math.round(Number(form.monthlySalary) * 100)
          : undefined,
        dayRate: form.dayRate ? Math.round(Number(form.dayRate) * 100) : undefined,
        nightRate: form.nightRate ? Math.round(Number(form.nightRate) * 100) : undefined,
        joinDate: form.joinDate || undefined,
        status: form.status,
        phone: form.phone.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      if (editingId) {
        await update(editingId, data);
        toast.success('工人信息已更新');
      } else {
        await create(data);
        toast.success('工人添加成功');
      }
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
      toast.success('工人已删除');
      setDeleteId(null);
    } catch {
      toast.error('删除失败');
    }
  }

  async function handleGenerateWages(): Promise<void> {
    try {
      const count = await generate(wageMonth);
      if (count > 0) {
        toast.success(`已为 ${count} 位长工生成工资记录`);
      } else {
        toast.info('本月工资已全部生成，无需重复操作');
      }
    } catch {
      toast.error('生成失败');
    }
  }

  function handleExportWages(): void {
    exportWageDetail(wageRecords, wageMonth);
    toast.success('工资明细已导出');
  }

  async function handleSettleWorker(workerId: number): Promise<void> {
    try {
      const records = await getDailyAttendances({
        workerId,
        dateFrom: monthStart(tempMonth),
        dateTo: monthEnd(tempMonth),
        isPaid: 0,
      });
      if (records.length === 0) {
        toast.info('该工人本月无未结清记录');
        return;
      }
      const ids = records.map((r) => r.id);
      await markAttendancePaid(ids, new Date().toISOString().slice(0, 10));
      await reloadTempSummary();
      toast.success(`已结清 ${records.length} 条记录`);
    } catch {
      toast.error('结清失败');
    }
  }

  async function handleUnsettleWorker(workerId: number): Promise<void> {
    try {
      const records = await getDailyAttendances({
        workerId,
        dateFrom: monthStart(tempMonth),
        dateTo: monthEnd(tempMonth),
        isPaid: 1,
      });
      if (records.length === 0) {
        toast.info('该工人本月无已结清记录');
        return;
      }
      const ids = records.map((r) => r.id);
      await markAttendanceUnpaid(ids);
      await reloadTempSummary();
      toast.success(`已取消结清 ${records.length} 条记录`);
    } catch {
      toast.error('操作失败');
    }
  }

  async function handleExportTempWages(): Promise<void> {
    const records = await getDailyAttendances({
      dateFrom: monthStart(tempMonth),
      dateTo: monthEnd(tempMonth),
    });
    exportTempWageDetail(records, tempMonth);
    toast.success('临时工工资明细已导出');
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'list', label: '工人列表' },
    { key: 'wages', label: '长工工资' },
    { key: 'temp', label: '临时工汇总' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">工人工资</h2>
          <p className="text-muted-foreground">管理工人信息和工资发放</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/workers/attendance">出勤录入</Link>
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            添加工人
          </Button>
        </div>
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

      {/* Worker list tab */}
      {activeTab === 'list' && (
        <Card>
          <CardHeader>
            <CardTitle>工人列表 ({workers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-4">加载中...</p>
            ) : workers.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">暂无工人，点击"添加工人"添加</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>薪资</TableHead>
                    <TableHead>入职日期</TableHead>
                    <TableHead>电话</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="w-[100px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workers.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium">{w.name}</TableCell>
                      <TableCell>
                        <Badge variant={w.type === '长工' ? 'default' : 'info'}>{w.type}</Badge>
                      </TableCell>
                      <TableCell>
                        {w.type === '长工'
                          ? w.monthlySalary != null
                            ? `月薪 ${formatMoney(w.monthlySalary)}`
                            : '-'
                          : `白班 ${w.dayRate != null ? formatMoney(w.dayRate) : '-'} / 夜班 ${w.nightRate != null ? formatMoney(w.nightRate) : '-'}`}
                      </TableCell>
                      <TableCell>{w.joinDate ?? '-'}</TableCell>
                      <TableCell>{w.phone ?? '-'}</TableCell>
                      <TableCell>
                        <Badge variant={w.status === '在职' ? 'success' : 'secondary'}>
                          {w.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(w)}
                            title="编辑"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(w.id)}
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
      )}

      {/* Permanent worker wages tab */}
      {activeTab === 'wages' && (
        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="wageMonth">月份</Label>
              <Input
                id="wageMonth"
                type="month"
                value={wageMonth}
                onChange={(e) => setWageMonth(e.target.value)}
                className="w-44"
              />
            </div>
            <Button variant="outline" onClick={() => void handleGenerateWages()}>
              生成本月工资
            </Button>
            <Button
              variant="outline"
              onClick={handleExportWages}
              disabled={wageRecords.length === 0}
            >
              <Download className="h-4 w-4" />
              导出
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">应发总额</p>
                <p className="text-lg font-semibold tabular-nums">{formatMoney(wageTotals.total)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">已发放</p>
                <p className="text-lg font-semibold tabular-nums text-emerald-600">{formatMoney(wageTotals.paid)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">未发放</p>
                <p
                  className={`text-lg font-semibold tabular-nums ${wageTotals.unpaid > 0 ? 'text-destructive' : ''}`}
                >
                  {formatMoney(wageTotals.unpaid)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>长工工资 - {wageMonth}</CardTitle>
            </CardHeader>
            <CardContent>
              {wagesLoading ? (
                <p className="text-center text-muted-foreground py-4">加载中...</p>
              ) : wageRecords.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  本月无工资记录，点击"生成本月工资"生成
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>工人</TableHead>
                      <TableHead className="text-right">月薪</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>发放日期</TableHead>
                      <TableHead>备注</TableHead>
                      <TableHead className="w-[100px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wageRecords.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.workerName}</TableCell>
                        <TableCell className="text-right">{formatMoney(r.salary)}</TableCell>
                        <TableCell>
                          <Badge variant={r.isPaid ? 'success' : 'warning'}>
                            {r.isPaid ? '已发放' : '未发放'}
                          </Badge>
                        </TableCell>
                        <TableCell>{r.paidDate ?? '-'}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{r.notes ?? '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {r.isPaid ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => void setUnpaid(r.id)}
                                title="标记未发"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  void setPaid(r.id, new Date().toISOString().slice(0, 10))
                                }
                                title="标记已发"
                              >
                                <Check className="h-4 w-4 text-emerald-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => void removeWage(r.id)}
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
        </div>
      )}

      {/* Temp worker summary tab */}
      {activeTab === 'temp' && (
        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="tempMonth">月份</Label>
              <Input
                id="tempMonth"
                type="month"
                value={tempMonth}
                onChange={(e) => setTempMonth(e.target.value)}
                className="w-44"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => void handleExportTempWages()}
              disabled={tempSummary.length === 0}
            >
              <Download className="h-4 w-4" />
              导出明细
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">应付总额</p>
                <p className="text-lg font-semibold tabular-nums">{formatMoney(tempTotals.total)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">已结清</p>
                <p className="text-lg font-semibold tabular-nums text-emerald-600">{formatMoney(tempTotals.paid)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">未结清</p>
                <p
                  className={`text-lg font-semibold tabular-nums ${tempTotals.unpaid > 0 ? 'text-destructive' : ''}`}
                >
                  {formatMoney(tempTotals.unpaid)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>临时工汇总 - {tempMonth}</CardTitle>
            </CardHeader>
            <CardContent>
              {tempLoading ? (
                <p className="text-center text-muted-foreground py-4">加载中...</p>
              ) : tempSummary.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">本月无临时工出勤记录</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>工人</TableHead>
                      <TableHead className="text-right">出勤天数</TableHead>
                      <TableHead className="text-right">应付金额</TableHead>
                      <TableHead className="text-right">已结清</TableHead>
                      <TableHead className="text-right">未结清</TableHead>
                      <TableHead className="w-[100px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tempSummary.map((s) => (
                      <TableRow key={s.workerId}>
                        <TableCell className="font-medium">{s.workerName}</TableCell>
                        <TableCell className="text-right">{s.totalDays}</TableCell>
                        <TableCell className="text-right">{formatMoney(s.totalAmount)}</TableCell>
                        <TableCell className="text-right text-emerald-600">
                          {formatMoney(s.paidAmount)}
                        </TableCell>
                        <TableCell
                          className={`text-right ${s.unpaidAmount > 0 ? 'text-destructive' : ''}`}
                        >
                          {formatMoney(s.unpaidAmount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {s.unpaidAmount > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => void handleSettleWorker(s.workerId)}
                                title="全部结清"
                              >
                                <Check className="h-4 w-4 text-emerald-600" />
                              </Button>
                            )}
                            {s.paidAmount > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => void handleUnsettleWorker(s.workerId)}
                                title="取消结清"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Worker create/edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑工人' : '添加工人'}</DialogTitle>
            <DialogDescription>{editingId ? '修改工人信息' : '填写工人基本信息'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="wName">姓名 *</Label>
                <Input
                  id="wName"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="工人姓名"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wType">类型</Label>
                <Select
                  id="wType"
                  value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as WorkerType }))}
                >
                  {Object.values(WORKER_TYPE).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {form.type === '长工' && (
              <div className="grid gap-2">
                <Label htmlFor="wSalary">月薪（元）</Label>
                <Input
                  id="wSalary"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.monthlySalary}
                  onChange={(e) => setForm((p) => ({ ...p, monthlySalary: e.target.value }))}
                  placeholder="如: 5000"
                />
              </div>
            )}

            {form.type === '临时工' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="wDayRate">白班单价（元/天）</Label>
                  <Input
                    id="wDayRate"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.dayRate}
                    onChange={(e) => setForm((p) => ({ ...p, dayRate: e.target.value }))}
                    placeholder="如: 200"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="wNightRate">夜班单价（元/天）</Label>
                  <Input
                    id="wNightRate"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.nightRate}
                    onChange={(e) => setForm((p) => ({ ...p, nightRate: e.target.value }))}
                    placeholder="如: 250"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="wJoinDate">入职日期</Label>
                <Input
                  id="wJoinDate"
                  type="date"
                  value={form.joinDate}
                  onChange={(e) => setForm((p) => ({ ...p, joinDate: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wStatus">状态</Label>
                <Select
                  id="wStatus"
                  value={form.status}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, status: e.target.value as WorkerStatus }))
                  }
                >
                  {Object.values(WORKER_STATUS).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="wPhone">电话</Label>
              <Input
                id="wPhone"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="wNotes">备注</Label>
              <Textarea
                id="wNotes"
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

      {/* Delete confirm */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除此工人吗？关联的工资和出勤记录也会被一并删除。
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
