import { select } from '@/lib/db';
import type { FactoryOverviewData, FactoryOverviewGranularity, FactoryOverviewRow } from '@/types';

interface MetricRow {
  periodKey: string;
  amount: number;
}

interface MetricMaps {
  revenue?: ReadonlyMap<string, number>;
  received?: ReadonlyMap<string, number>;
  wageExpense?: ReadonlyMap<string, number>;
  threadPurchaseExpense?: ReadonlyMap<string, number>;
}

interface PeriodDefinition {
  key: string;
  label: string;
}

function padMonth(month: number): string {
  return String(month).padStart(2, '0');
}

function buildQuarterFromMonth(month: number): number {
  return Math.floor((month - 1) / 3) + 1;
}

export function getFactoryOverviewPeriodKey(
  year: number,
  granularity: FactoryOverviewGranularity,
  index?: number,
): string {
  if (granularity === 'month') {
    return `${year}-${padMonth(index ?? 1)}`;
  }
  if (granularity === 'quarter') {
    return `${year}-Q${index ?? 1}`;
  }
  return String(year);
}

export function buildFactoryOverviewPeriods(
  year: number,
  granularity: FactoryOverviewGranularity,
): PeriodDefinition[] {
  if (granularity === 'month') {
    return Array.from({ length: 12 }, (_, idx) => {
      const month = idx + 1;
      return {
        key: getFactoryOverviewPeriodKey(year, granularity, month),
        label: `${year}年${month}月`,
      };
    });
  }

  if (granularity === 'quarter') {
    return Array.from({ length: 4 }, (_, idx) => {
      const quarter = idx + 1;
      return {
        key: getFactoryOverviewPeriodKey(year, granularity, quarter),
        label: `${year}年Q${quarter}`,
      };
    });
  }

  return [
    {
      key: getFactoryOverviewPeriodKey(year, granularity),
      label: `${year}年`,
    },
  ];
}

export function mergeFactoryOverviewRows(
  year: number,
  granularity: FactoryOverviewGranularity,
  metricMaps: MetricMaps,
): FactoryOverviewRow[] {
  return buildFactoryOverviewPeriods(year, granularity).map(({ key, label }) => {
    const revenueAmount = metricMaps.revenue?.get(key) ?? 0;
    const receivedAmount = metricMaps.received?.get(key) ?? 0;
    const wageExpense = metricMaps.wageExpense?.get(key) ?? 0;
    const threadPurchaseExpense = metricMaps.threadPurchaseExpense?.get(key) ?? 0;
    const totalExpense = wageExpense + threadPurchaseExpense;

    return {
      periodKey: key,
      periodLabel: label,
      revenueAmount,
      receivedAmount,
      wageExpense,
      threadPurchaseExpense,
      totalExpense,
      netCashflow: receivedAmount - totalExpense,
    };
  });
}

function buildDatePeriodExpr(
  column: string,
  granularity: FactoryOverviewGranularity,
  treatAsMonthText = false,
): string {
  if (granularity === 'month') {
    return treatAsMonthText ? `substr(${column}, 1, 7)` : `substr(${column}, 1, 7)`;
  }

  if (granularity === 'quarter') {
    const dateExpr = treatAsMonthText ? `${column} || '-01'` : column;
    return `printf('%s-Q%d', substr(${dateExpr}, 1, 4), CAST(((CAST(strftime('%m', ${dateExpr}) AS INTEGER) - 1) / 3) AS INTEGER) + 1)`;
  }

  return `substr(${column}, 1, 4)`;
}

function buildYearWhereClause(column: string, year: number, treatAsMonthText = false): string {
  if (treatAsMonthText) {
    return `${column} >= '${year}-01' AND ${column} <= '${year}-12'`;
  }

  return `${column} >= '${year}-01-01' AND ${column} <= '${year}-12-31'`;
}

async function getMetricTotals(
  tableName: string,
  periodExpr: string,
  amountExpr: string,
  whereClause: string,
): Promise<Map<string, number>> {
  const rows = await select<MetricRow>(
    `SELECT ${periodExpr} AS periodKey, COALESCE(SUM(${amountExpr}), 0) AS amount
     FROM ${tableName}
     WHERE ${whereClause}
     GROUP BY ${periodExpr}
     ORDER BY periodKey ASC`,
  );

  return new Map(rows.map((row) => [row.periodKey, row.amount]));
}

export async function getFactoryOverviewAvailableYears(): Promise<number[]> {
  const rows = await select<{ year: string }>(
    `SELECT DISTINCT year
     FROM (
       SELECT substr(orderDate, 1, 4) AS year FROM orders
       UNION
       SELECT substr(paymentDate, 1, 4) AS year FROM orderPayments
       UNION
       SELECT substr(month, 1, 4) AS year FROM wageRecords
       UNION
       SELECT substr(date, 1, 4) AS year FROM dailyAttendances
       UNION
       SELECT substr(purchaseDate, 1, 4) AS year FROM threadPurchases
     )
     WHERE year IS NOT NULL AND year <> ''
     ORDER BY year DESC`,
  );

  const years = rows
    .map((row) => Number(row.year))
    .filter((year): year is number => Number.isInteger(year) && year > 0);

  return years.length > 0 ? years : [new Date().getFullYear()];
}

export async function getFactoryOverviewData(
  year: number,
  granularity: FactoryOverviewGranularity,
): Promise<FactoryOverviewData> {
  const orderPeriodExpr = buildDatePeriodExpr('orderDate', granularity);
  const paymentPeriodExpr = buildDatePeriodExpr('paymentDate', granularity);
  const attendancePeriodExpr = buildDatePeriodExpr('date', granularity);
  const wagePeriodExpr = buildDatePeriodExpr('month', granularity, true);
  const purchasePeriodExpr = buildDatePeriodExpr('purchaseDate', granularity);

  const orderWhereClause = buildYearWhereClause('orderDate', year);
  const paymentWhereClause = buildYearWhereClause('paymentDate', year);
  const attendanceWhereClause = buildYearWhereClause('date', year);
  const wageWhereClause = buildYearWhereClause('month', year, true);
  const purchaseWhereClause = buildYearWhereClause('purchaseDate', year);

  const [revenue, received, permanentWages, tempWages, threadPurchases] = await Promise.all([
    getMetricTotals('orders', orderPeriodExpr, 'totalAmount', orderWhereClause),
    getMetricTotals('orderPayments', paymentPeriodExpr, 'amount', paymentWhereClause),
    getMetricTotals('wageRecords', wagePeriodExpr, 'salary', wageWhereClause),
    getMetricTotals('dailyAttendances', attendancePeriodExpr, 'amount', attendanceWhereClause),
    getMetricTotals(
      'threadPurchases',
      purchasePeriodExpr,
      'COALESCE(totalCost, quantity * COALESCE(unitCost, 0), 0)',
      purchaseWhereClause,
    ),
  ]);

  const wageExpense = new Map<string, number>();
  for (const [periodKey, amount] of permanentWages) {
    wageExpense.set(periodKey, amount + (tempWages.get(periodKey) ?? 0));
  }
  for (const [periodKey, amount] of tempWages) {
    if (!wageExpense.has(periodKey)) {
      wageExpense.set(periodKey, amount);
    }
  }

  return {
    granularity,
    year,
    rows: mergeFactoryOverviewRows(year, granularity, {
      revenue,
      received,
      wageExpense,
      threadPurchaseExpense: threadPurchases,
    }),
  };
}

export function getCurrentQuarter(date = new Date()): number {
  return buildQuarterFromMonth(date.getMonth() + 1);
}
