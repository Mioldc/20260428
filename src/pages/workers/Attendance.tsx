import { type ReactElement, useState, useCallback } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Plus, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
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
import { useAttendance, useTempWorkers } from '@/hooks/useWorkers';
import { formatMoney, formatDate } from '@/lib/utils';
import { calculateDailyWage } from '@/lib/business';
import type { ShiftType } from '@/types';
import { SHIFT_TYPE } from '@/types';

const todayStr = new Date().toISOString().slice(0, 10);

interface AttendanceEntry {
  workerId: number;
  workerName: string;
  shift: ShiftType;
  amount: number;
}

export function Attendance(): ReactElement {
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [selectedShift, setSelectedShift] = useState<ShiftType>('白班');

  const { records, loading, create, setPaid, setUnpaid, remove } = useAttendance({
    date: selectedDate,
  });

  const { workers: tempWorkers } = useTempWorkers();

  const addEntry = useCallback((): void => {
    if (!selectedWorker) {
      toast.error('请选择工人');
      return;
    }
    const worker = tempWorkers.find((w) => w.id === Number(selectedWorker));
    if (!worker) return;

    if (entries.some((e) => e.workerId === worker.id)) {
      toast.error(`${worker.name} 已在列表中`);
      return;
    }

    const amount = calculateDailyWage(selectedShift, worker.dayRate ?? 0, worker.nightRate ?? 0);

    setEntries((prev) => [
      ...prev,
      { workerId: worker.id, workerName: worker.name, shift: selectedShift, amount },
    ]);
    setSelectedWorker('');
  }, [selectedWorker, selectedShift, tempWorkers, entries]);

  function removeEntry(workerId: number): void {
    setEntries((prev) => prev.filter((e) => e.workerId !== workerId));
  }

  function updateEntryShift(workerId: number, shift: ShiftType): void {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.workerId !== workerId) return e;
        const worker = tempWorkers.find((w) => w.id === workerId);
        const amount = calculateDailyWage(shift, worker?.dayRate ?? 0, worker?.nightRate ?? 0);
        return { ...e, shift, amount };
      }),
    );
  }

  async function handleBatchSave(): Promise<void> {
    if (entries.length === 0) {
      toast.error('请添加出勤记录');
      return;
    }
    const existingWorkerIds = new Set(records.map((r) => r.workerId));
    const duplicates = entries.filter((e) => existingWorkerIds.has(e.workerId));
    if (duplicates.length > 0) {
      const names = duplicates.map((d) => d.workerName).join('、');
      toast.error(`${names} 当日已有出勤记录，请勿重复录入`);
      return;
    }
    setSaving(true);
    try {
      for (const entry of entries) {
        await create({
          workerId: entry.workerId,
          date: selectedDate,
          shift: entry.shift,
          amount: entry.amount,
        });
      }
      toast.success(`已保存 ${entries.length} 条出勤记录`);
      setEntries([]);
      setDialogOpen(false);
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  }

  const totalToday = records.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/workers">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold">临时工出勤</h2>
            <p className="text-muted-foreground">录入临时工每日出勤记录</p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          批量录入
        </Button>
      </div>

      <div className="flex items-end gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="attDate">查看日期</Label>
          <Input
            id="attDate"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-44"
          />
        </div>
        <span className="text-sm text-muted-foreground pb-2">
          共 {records.length} 条 · 合计 {formatMoney(totalToday)}
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>出勤记录 - {formatDate(selectedDate)}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-4">加载中...</p>
          ) : records.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">当日无出勤记录</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>工人</TableHead>
                  <TableHead>班次</TableHead>
                  <TableHead className="text-right">金额</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-[100px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.workerName}</TableCell>
                    <TableCell>
                      <Badge variant={r.shift === '白班' ? 'info' : 'secondary'}>{r.shift}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatMoney(r.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={r.isPaid ? 'success' : 'warning'}>
                        {r.isPaid ? '已结清' : '未结清'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {r.isPaid ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => void setUnpaid([r.id])}
                            title="标记未结"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              void setPaid([r.id], new Date().toISOString().slice(0, 10))
                            }
                            title="标记已结"
                          >
                            <Check className="h-4 w-4 text-emerald-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => void remove(r.id)}
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

      {/* Batch entry dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>批量录入出勤 - {formatDate(selectedDate)}</DialogTitle>
            <DialogDescription>选择工人和班次，一次录入多人出勤</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1 grid gap-2">
                <Label htmlFor="addWorker">工人</Label>
                <Select
                  id="addWorker"
                  value={selectedWorker}
                  onChange={(e) => setSelectedWorker(e.target.value)}
                >
                  <option value="">选择临时工</option>
                  {tempWorkers
                    .filter(
                      (w) =>
                        !entries.some((e) => e.workerId === w.id) &&
                        !records.some((r) => r.workerId === w.id),
                    )
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="addShift">班次</Label>
                <Select
                  id="addShift"
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value as ShiftType)}
                >
                  {Object.values(SHIFT_TYPE).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
              <Button onClick={addEntry} className="mb-0.5">
                <Plus className="h-4 w-4" />
                添加
              </Button>
            </div>

            {entries.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>工人</TableHead>
                    <TableHead>班次</TableHead>
                    <TableHead className="text-right">金额</TableHead>
                    <TableHead className="w-[60px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.workerId}>
                      <TableCell>{e.workerName}</TableCell>
                      <TableCell>
                        <Select
                          value={e.shift}
                          onChange={(ev) =>
                            updateEntryShift(e.workerId, ev.target.value as ShiftType)
                          }
                          className="w-20"
                        >
                          {Object.values(SHIFT_TYPE).map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">{formatMoney(e.amount)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeEntry(e.workerId)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {entries.length === 0 && (
              <p className="text-center text-muted-foreground py-4">选择工人和班次后点击"添加"</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => void handleBatchSave()}
              disabled={saving || entries.length === 0}
            >
              {saving ? '保存中...' : `保存 (${entries.length} 条)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
