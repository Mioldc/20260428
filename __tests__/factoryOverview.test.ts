import { describe, expect, it } from 'vitest';
import {
  buildFactoryOverviewPeriods,
  getCurrentQuarter,
  getFactoryOverviewPeriodKey,
  mergeFactoryOverviewRows,
} from '@/lib/queries/factoryOverview';

describe('工厂经营统计周期工具', () => {
  it('按月生成全年 12 个周期', () => {
    const periods = buildFactoryOverviewPeriods(2026, 'month');

    expect(periods).toHaveLength(12);
    expect(periods[0]).toEqual({ key: '2026-01', label: '2026年1月' });
    expect(periods[11]).toEqual({ key: '2026-12', label: '2026年12月' });
  });

  it('按季度生成 4 个周期', () => {
    const periods = buildFactoryOverviewPeriods(2026, 'quarter');

    expect(periods).toEqual([
      { key: '2026-Q1', label: '2026年Q1' },
      { key: '2026-Q2', label: '2026年Q2' },
      { key: '2026-Q3', label: '2026年Q3' },
      { key: '2026-Q4', label: '2026年Q4' },
    ]);
  });

  it('能生成月、季、年的周期 key', () => {
    expect(getFactoryOverviewPeriodKey(2026, 'month', 4)).toBe('2026-04');
    expect(getFactoryOverviewPeriodKey(2026, 'quarter', 3)).toBe('2026-Q3');
    expect(getFactoryOverviewPeriodKey(2026, 'year')).toBe('2026');
  });

  it('合并多来源统计时会补齐空周期并计算总支出与净现金结余', () => {
    const rows = mergeFactoryOverviewRows(2026, 'month', {
      revenue: new Map([
        ['2026-01', 100000],
        ['2026-02', 50000],
      ]),
      received: new Map([['2026-01', 80000]]),
      wageExpense: new Map([
        ['2026-01', 20000],
        ['2026-03', 12000],
      ]),
      threadPurchaseExpense: new Map([['2026-01', 5000]]),
    });

    expect(rows).toHaveLength(12);
    expect(rows[0]).toMatchObject({
      periodKey: '2026-01',
      revenueAmount: 100000,
      receivedAmount: 80000,
      wageExpense: 20000,
      threadPurchaseExpense: 5000,
      totalExpense: 25000,
      netCashflow: 55000,
    });
    expect(rows[1]).toMatchObject({
      periodKey: '2026-02',
      revenueAmount: 50000,
      receivedAmount: 0,
      wageExpense: 0,
      threadPurchaseExpense: 0,
      totalExpense: 0,
      netCashflow: 0,
    });
    expect(rows[2]).toMatchObject({
      periodKey: '2026-03',
      wageExpense: 12000,
      totalExpense: 12000,
      netCashflow: -12000,
    });
  });

  it('按年视图只返回一个周期', () => {
    const rows = mergeFactoryOverviewRows(2026, 'year', {
      revenue: new Map([['2026', 250000]]),
      received: new Map([['2026', 200000]]),
      wageExpense: new Map([['2026', 80000]]),
      threadPurchaseExpense: new Map([['2026', 20000]]),
    });

    expect(rows).toEqual([
      {
        periodKey: '2026',
        periodLabel: '2026年',
        revenueAmount: 250000,
        receivedAmount: 200000,
        wageExpense: 80000,
        threadPurchaseExpense: 20000,
        totalExpense: 100000,
        netCashflow: 100000,
      },
    ]);
  });

  it('当前季度计算正确', () => {
    expect(getCurrentQuarter(new Date('2026-01-10'))).toBe(1);
    expect(getCurrentQuarter(new Date('2026-04-01'))).toBe(2);
    expect(getCurrentQuarter(new Date('2026-08-20'))).toBe(3);
    expect(getCurrentQuarter(new Date('2026-12-31'))).toBe(4);
  });
});
