import { type ReactElement, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFactoryOverview } from '@/hooks/useFactoryOverview';
import { exportFactoryOverview } from '@/lib/export';
import {
  getCurrentQuarter,
  getFactoryOverviewPeriodKey,
} from '@/lib/queries/factoryOverview';
import { formatMoney } from '@/lib/utils';
import { FACTORY_OVERVIEW_GRANULARITY, type FactoryOverviewGranularity } from '@/types';

const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth() + 1;
const currentQuarter = getCurrentQuarter(today);

const EXPENSE_COLORS = ['#f59e0b', '#3b82f6'] as const;
const CASHFLOW_COLORS = ['#10b981', '#ef4444'] as const;

function getSummaryKey(
  year: number,
  granularity: FactoryOverviewGranularity,
  month: number,
  quarter: number,
): string {
  if (granularity === 'month') {
    return getFactoryOverviewPeriodKey(year, granularity, month);
  }

  if (granularity === 'quarter') {
    return getFactoryOverviewPeriodKey(year, granularity, quarter);
  }

  return getFactoryOverviewPeriodKey(year, granularity);
}

export function FactoryOverview(): ReactElement {
  const [granularity, setGranularity] = useState<FactoryOverviewGranularity>(
    FACTORY_OVERVIEW_GRANULARITY.MONTH,
  );
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [quarter, setQuarter] = useState(currentQuarter);

  const { data, availableYears, loading, error, reload } = useFactoryOverview(year, granularity);

  const yearOptions = useMemo(() => {
    const years = new Set<number>([currentYear, ...availableYears]);
    return [...years].sort((a, b) => b - a);
  }, [availableYears]);

  const selectedKey = getSummaryKey(year, granularity, month, quarter);
  const summaryRow = data?.rows.find((row) => row.periodKey === selectedKey) ?? data?.rows[0] ?? null;

  const expensePieData = useMemo(() => {
    if (!summaryRow) return [];
    return [
      { name: '工资支出', value: summaryRow.wageExpense },
      { name: '线材采购', value: summaryRow.threadPurchaseExpense },
    ].filter((d) => d.value > 0);
  }, [summaryRow]);

  const cashflowPieData = useMemo(() => {
    if (!summaryRow) return [];
    return [
      { name: '实收', value: summaryRow.receivedAmount },
      { name: '总支出', value: summaryRow.totalExpense },
    ].filter((d) => d.value > 0);
  }, [summaryRow]);

  function handleExport(scope: 'current' | 'full'): void {
    if (!data || data.rows.length === 0) {
      toast.error('暂无可导出的经营统计数据');
      return;
    }

    exportFactoryOverview(granularity, year, data.rows, summaryRow, scope);
    toast.success(scope === 'current' ? '当前周期已导出' : '整年明细已导出');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/finance">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold">工厂经营统计</h2>
            <p className="text-muted-foreground">按月、季度、年度查看工厂营收、实收与核心支出</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport('current')}
            disabled={!data || !summaryRow}
          >
            <Download className="h-4 w-4" />
            导出当前周期
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('full')}
            disabled={!data || data.rows.length === 0}
          >
            <Download className="h-4 w-4" />
            导出整年明细
          </Button>
          <Button variant="outline" asChild>
            <Link to="/finance/statement">
              <FileText className="h-4 w-4" />
              客户对账单
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="overviewGranularity">统计维度</Label>
              <Select
                id="overviewGranularity"
                value={granularity}
                onChange={(e) => setGranularity(e.target.value as FactoryOverviewGranularity)}
                className="w-36"
              >
                <option value={FACTORY_OVERVIEW_GRANULARITY.MONTH}>按月</option>
                <option value={FACTORY_OVERVIEW_GRANULARITY.QUARTER}>按季度</option>
                <option value={FACTORY_OVERVIEW_GRANULARITY.YEAR}>按年</option>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="overviewYear">年份</Label>
              <Select
                id="overviewYear"
                value={String(year)}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-32"
              >
                {yearOptions.map((optionYear) => (
                  <option key={optionYear} value={optionYear}>
                    {optionYear}年
                  </option>
                ))}
              </Select>
            </div>

            {granularity === FACTORY_OVERVIEW_GRANULARITY.MONTH && (
              <div className="grid gap-1.5">
                <Label htmlFor="overviewMonth">月份</Label>
                <Select
                  id="overviewMonth"
                  value={String(month)}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="w-28"
                >
                  {Array.from({ length: 12 }, (_, idx) => idx + 1).map((value) => (
                    <option key={value} value={value}>
                      {value}月
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {granularity === FACTORY_OVERVIEW_GRANULARITY.QUARTER && (
              <div className="grid gap-1.5">
                <Label htmlFor="overviewQuarter">季度</Label>
                <Select
                  id="overviewQuarter"
                  value={String(quarter)}
                  onChange={(e) => setQuarter(Number(e.target.value))}
                  className="w-28"
                >
                  {[1, 2, 3, 4].map((value) => (
                    <option key={value} value={value}>
                      Q{value}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <Button variant="outline" onClick={() => void reload()} disabled={loading}>
              刷新
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            当前支出口径仅含工人工资和线材采购，不含房租、水电、设备维修等其他杂费。
          </p>
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={() => void reload()}>
                重试
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">{summaryRow?.periodLabel ?? '统计周期'}</p>
                <p className="text-xl font-bold">{summaryRow?.periodLabel ?? '--'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">营收</p>
                <p className="text-xl font-bold">{formatMoney(summaryRow?.revenueAmount ?? 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">实收</p>
                <p className="text-xl font-bold text-emerald-600">
                  {formatMoney(summaryRow?.receivedAmount ?? 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">工资支出</p>
                <p className="text-xl font-bold text-amber-600">
                  {formatMoney(summaryRow?.wageExpense ?? 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">线材采购</p>
                <p className="text-xl font-bold text-amber-600">
                  {formatMoney(summaryRow?.threadPurchaseExpense ?? 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">总支出 / 净现金结余</p>
                <p className="text-lg font-bold">{formatMoney(summaryRow?.totalExpense ?? 0)}</p>
                <p
                  className={`text-sm font-medium ${
                    (summaryRow?.netCashflow ?? 0) >= 0 ? 'text-emerald-600' : 'text-destructive'
                  }`}
                >
                  {formatMoney(summaryRow?.netCashflow ?? 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          {(expensePieData.length > 0 || cashflowPieData.length > 0) && (
            <div className="grid gap-4 md:grid-cols-2">
              {expensePieData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">支出构成</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={expensePieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(1)}%`
                          }
                        >
                          {expensePieData.map((_, idx) => (
                            <Cell key={idx} fill={EXPENSE_COLORS[idx % EXPENSE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatMoney(value)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {cashflowPieData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">收支对比</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={cashflowPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(1)}%`
                          }
                        >
                          {cashflowPieData.map((_, idx) => (
                            <Cell key={idx} fill={CASHFLOW_COLORS[idx % CASHFLOW_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatMoney(value)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>周期明细</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {loading ? '加载中...' : `共 ${data?.rows.length ?? 0} 个周期`}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>周期</TableHead>
                    <TableHead className="text-right">营收</TableHead>
                    <TableHead className="text-right">实收</TableHead>
                    <TableHead className="text-right">工资支出</TableHead>
                    <TableHead className="text-right">线材采购</TableHead>
                    <TableHead className="text-right">总支出</TableHead>
                    <TableHead className="text-right">净现金结余</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.rows ?? []).map((row) => (
                    <TableRow
                      key={row.periodKey}
                      className={row.periodKey === selectedKey ? 'bg-muted/50' : undefined}
                    >
                      <TableCell className="font-medium">{row.periodLabel}</TableCell>
                      <TableCell className="text-right">{formatMoney(row.revenueAmount)}</TableCell>
                      <TableCell className="text-right text-emerald-600">
                        {formatMoney(row.receivedAmount)}
                      </TableCell>
                      <TableCell className="text-right text-amber-600">
                        {formatMoney(row.wageExpense)}
                      </TableCell>
                      <TableCell className="text-right text-amber-600">
                        {formatMoney(row.threadPurchaseExpense)}
                      </TableCell>
                      <TableCell className="text-right">{formatMoney(row.totalExpense)}</TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          row.netCashflow >= 0 ? 'text-emerald-600' : 'text-destructive'
                        }`}
                      >
                        {formatMoney(row.netCashflow)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
