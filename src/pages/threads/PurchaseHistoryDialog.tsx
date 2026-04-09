import { type ReactElement, useMemo, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePurchaseHistory } from '@/hooks/useThreads';
import { formatMoney } from '@/lib/utils';
import type { Thread } from '@/types';

interface PurchaseHistoryDialogProps {
  thread: Thread;
  onClose: () => void;
}

export function PurchaseHistoryDialog({
  thread,
  onClose,
}: PurchaseHistoryDialogProps): ReactElement {
  const { purchases, loading, removePurchase } = usePurchaseHistory(thread.id);

  const totals = useMemo(() => {
    let qty = 0;
    let cost = 0;
    for (const p of purchases) {
      qty += p.quantity;
      cost += p.totalCost ?? 0;
    }
    return { qty, cost };
  }, [purchases]);

  const handleRemove = useCallback(
    async (id: number) => {
      try {
        await removePurchase(id);
        toast.success('采购记录已删除');
      } catch {
        toast.error('删除失败');
      }
    },
    [removePurchase],
  );

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>采购记录</DialogTitle>
          <DialogDescription>
            色号: {thread.colorNo}
            {thread.brand ? ` · ${thread.brand}` : ''}
            {thread.colorName ? ` · ${thread.colorName}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">加载中...</p>
          ) : purchases.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">暂无采购记录</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>采购日期</TableHead>
                    <TableHead className="text-right">数量(筒)</TableHead>
                    <TableHead className="text-right">单价</TableHead>
                    <TableHead className="text-right">总价</TableHead>
                    <TableHead>供应商</TableHead>
                    <TableHead>备注</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.purchaseDate}</TableCell>
                      <TableCell className="text-right">{p.quantity}</TableCell>
                      <TableCell className="text-right">
                        {p.unitCost != null ? formatMoney(p.unitCost) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.totalCost != null ? formatMoney(p.totalCost) : '-'}
                      </TableCell>
                      <TableCell>{p.supplier ?? '-'}</TableCell>
                      <TableCell className="max-w-[120px] truncate">{p.notes ?? '-'}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => void handleRemove(p.id)}
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex gap-6 text-sm text-muted-foreground border-t pt-3">
                <span>
                  累计采购: <strong className="text-foreground">{totals.qty} 筒</strong>
                </span>
                <span>
                  总花费: <strong className="text-foreground">{formatMoney(totals.cost)}</strong>
                </span>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
