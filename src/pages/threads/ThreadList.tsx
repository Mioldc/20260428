import { type ReactElement, useState, useMemo, useCallback } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  PackagePlus,
  History,
  Layers,
  AlertTriangle,
  Archive,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { useThreads } from '@/hooks/useThreads';
import { cn } from '@/lib/utils';
import { ThreadForm } from '@/pages/threads/ThreadForm';
import { StockAdjustDialog } from '@/pages/threads/StockAdjustDialog';
import { PurchaseHistoryDialog } from '@/pages/threads/PurchaseHistoryDialog';
import type { Thread, NewThread, StockStatus } from '@/types';

const STOCK_STATUS_LABELS: Record<string, string> = {
  all: '全部',
  low: '低库存',
  zero: '零库存',
};

function stockBadge(quantity: number, minStock: number): ReactElement {
  if (quantity === 0) {
    return <Badge variant="destructive">缺货</Badge>;
  }
  if (minStock > 0 && quantity <= minStock) {
    return <Badge variant="warning">偏低</Badge>;
  }
  return <Badge variant="success">正常</Badge>;
}

export function ThreadList(): ReactElement {
  const [keyword, setKeyword] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<StockStatus>('all');

  const filters = useMemo(
    () => ({
      keyword: keyword.trim() || undefined,
      brand: brandFilter || undefined,
      stockStatus: stockFilter === 'all' ? undefined : stockFilter,
    }),
    [keyword, brandFilter, stockFilter],
  );

  const { threads, stats, loading, create, update, adjust, remove, addPurchase, reload } =
    useThreads(filters);

  const brands = useMemo(() => {
    const set = new Set<string>();
    threads.forEach((t) => {
      if (t.brand) set.add(t.brand);
    });
    return Array.from(set).sort();
  }, [threads]);

  // ---- Thread form dialog ----
  const [formOpen, setFormOpen] = useState(false);
  const [editingThread, setEditingThread] = useState<Thread | null>(null);

  function openCreate(): void {
    setEditingThread(null);
    setFormOpen(true);
  }

  function openEdit(t: Thread): void {
    setEditingThread(t);
    setFormOpen(true);
  }

  const handleSaveThread = useCallback(
    async (id: number | null, data: NewThread): Promise<void> => {
      if (id) {
        await update(id, data);
        toast.success('线材信息已更新');
      } else {
        await create(data);
        toast.success('线材已添加');
      }
    },
    [update, create],
  );

  // ---- Delete confirm ----
  const [deleteId, setDeleteId] = useState<number | null>(null);

  async function handleDelete(): Promise<void> {
    if (deleteId === null) return;
    try {
      await remove(deleteId);
      toast.success('线材已删除');
      setDeleteId(null);
    } catch {
      toast.error('删除失败');
    }
  }

  // ---- Stock adjust dialog ----
  const [adjustThread, setAdjustThread] = useState<Thread | null>(null);

  // ---- Purchase history dialog ----
  const [historyThread, setHistoryThread] = useState<Thread | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">线材库存</h2>
          <p className="text-muted-foreground">管理绣花线材的库存与采购</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          新增线材
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-4 pb-4">
            <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">总品种数</p>
              <p className="text-2xl font-bold">{stats.totalTypes}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4 pb-4">
            <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600">
              <Archive className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">总库存</p>
              <p className="text-2xl font-bold">
                {stats.totalQuantity}
                <span className="ml-1 text-sm font-normal text-muted-foreground">筒</span>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4 pb-4">
            <div
              className={cn(
                'rounded-lg p-2.5',
                stats.lowStockCount > 0
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">低库存预警</p>
              <p className={cn('text-2xl font-bold', stats.lowStockCount > 0 && 'text-amber-600')}>
                {stats.lowStockCount}
                <span className="ml-1 text-sm font-normal text-muted-foreground">种</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索色号/颜色名称..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          className="w-36"
        >
          <option value="">全部品牌</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </Select>
        <Select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as StockStatus)}
          className="w-32"
        >
          {Object.entries(STOCK_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">加载中...</p>
          ) : threads.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {keyword || brandFilter || stockFilter !== 'all'
                ? '未找到匹配的线材'
                : '暂无线材数据，点击"新增线材"添加第一条记录'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>色号</TableHead>
                  <TableHead>品牌</TableHead>
                  <TableHead>颜色名称</TableHead>
                  <TableHead>材质</TableHead>
                  <TableHead className="text-right">库存(筒)</TableHead>
                  <TableHead className="text-right">预警值</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-[200px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {threads.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.colorNo}</TableCell>
                    <TableCell>{t.brand ?? '-'}</TableCell>
                    <TableCell>{t.colorName ?? '-'}</TableCell>
                    <TableCell>{t.material ?? '-'}</TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-medium',
                        t.quantity === 0
                          ? 'text-destructive'
                          : t.minStock > 0 && t.quantity <= t.minStock
                            ? 'text-amber-600'
                            : 'text-emerald-600',
                      )}
                    >
                      {t.quantity}
                    </TableCell>
                    <TableCell className="text-right">{t.minStock}</TableCell>
                    <TableCell>{stockBadge(t.quantity, t.minStock)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setAdjustThread(t)}
                          title="调整库存"
                        >
                          <PackagePlus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setHistoryThread(t)}
                          title="采购记录"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(t)}
                          title="编辑"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(t.id)}
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

      {/* ---- Thread form dialog (create/edit) ---- */}
      <ThreadForm
        open={formOpen}
        onOpenChange={setFormOpen}
        thread={editingThread}
        onSave={handleSaveThread}
      />

      {/* ---- Delete confirm dialog ---- */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>确定要删除此线材吗？关联的采购记录也将一并删除。</DialogDescription>
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

      {/* ---- Stock adjust dialog ---- */}
      <StockAdjustDialog
        thread={adjustThread}
        onOpenChange={(open) => {
          if (!open) setAdjustThread(null);
        }}
        onAdjust={adjust}
        onAddPurchase={addPurchase}
      />

      {/* ---- Purchase history dialog ---- */}
      {historyThread && (
        <PurchaseHistoryDialog
          thread={historyThread}
          onClose={() => {
            setHistoryThread(null);
            void reload();
          }}
        />
      )}
    </div>
  );
}
