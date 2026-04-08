import { describe, it, expect } from 'vitest';
import { calculateDailyWage } from '@/lib/business';
import { yuanToCents } from '@/lib/utils';

describe('临时工日结工资计算', () => {
  const dayRate = yuanToCents(200);
  const nightRate = yuanToCents(250);

  it('白班使用白班单价', () => {
    expect(calculateDailyWage('白班', dayRate, nightRate)).toBe(dayRate);
  });

  it('夜班使用夜班单价', () => {
    expect(calculateDailyWage('夜班', dayRate, nightRate)).toBe(nightRate);
  });

  it('白班0元时返回0', () => {
    expect(calculateDailyWage('白班', 0, nightRate)).toBe(0);
  });

  it('夜班0元时返回0', () => {
    expect(calculateDailyWage('夜班', dayRate, 0)).toBe(0);
  });

  it('白班夜班相同单价', () => {
    const rate = yuanToCents(300);
    expect(calculateDailyWage('白班', rate, rate)).toBe(rate);
    expect(calculateDailyWage('夜班', rate, rate)).toBe(rate);
  });
});

describe('临时工月度汇总计算（纯逻辑）', () => {
  interface AttendanceRecord {
    shift: '白班' | '夜班';
    dayRate: number;
    nightRate: number;
    isPaid: boolean;
  }

  function calculateMonthlySummary(records: AttendanceRecord[]): {
    totalDays: number;
    totalAmount: number;
    paidAmount: number;
    unpaidAmount: number;
  } {
    let totalAmount = 0;
    let paidAmount = 0;

    for (const r of records) {
      const amount = calculateDailyWage(r.shift, r.dayRate, r.nightRate);
      totalAmount += amount;
      if (r.isPaid) paidAmount += amount;
    }

    return {
      totalDays: records.length,
      totalAmount,
      paidAmount,
      unpaidAmount: totalAmount - paidAmount,
    };
  }

  const dayRate = yuanToCents(200);
  const nightRate = yuanToCents(250);

  it('全月白班汇总正确', () => {
    const records: AttendanceRecord[] = Array.from({ length: 22 }, () => ({
      shift: '白班' as const,
      dayRate,
      nightRate,
      isPaid: false,
    }));
    const result = calculateMonthlySummary(records);
    expect(result.totalDays).toBe(22);
    expect(result.totalAmount).toBe(22 * dayRate);
    expect(result.paidAmount).toBe(0);
    expect(result.unpaidAmount).toBe(22 * dayRate);
  });

  it('混合班次汇总正确', () => {
    const records: AttendanceRecord[] = [
      { shift: '白班', dayRate, nightRate, isPaid: true },
      { shift: '夜班', dayRate, nightRate, isPaid: false },
      { shift: '白班', dayRate, nightRate, isPaid: true },
      { shift: '夜班', dayRate, nightRate, isPaid: true },
    ];
    const result = calculateMonthlySummary(records);
    expect(result.totalDays).toBe(4);
    expect(result.totalAmount).toBe(2 * dayRate + 2 * nightRate);
    expect(result.paidAmount).toBe(2 * dayRate + nightRate);
    expect(result.unpaidAmount).toBe(nightRate);
  });

  it('全部结清时未结清为0', () => {
    const records: AttendanceRecord[] = [
      { shift: '白班', dayRate, nightRate, isPaid: true },
      { shift: '夜班', dayRate, nightRate, isPaid: true },
    ];
    const result = calculateMonthlySummary(records);
    expect(result.unpaidAmount).toBe(0);
  });

  it('空记录汇总', () => {
    const result = calculateMonthlySummary([]);
    expect(result.totalDays).toBe(0);
    expect(result.totalAmount).toBe(0);
    expect(result.paidAmount).toBe(0);
    expect(result.unpaidAmount).toBe(0);
  });
});

describe('长工月薪逻辑', () => {
  it('月薪存储为分', () => {
    const monthlySalary = yuanToCents(5000);
    expect(monthlySalary).toBe(500000);
  });

  it('年薪累计正确', () => {
    const monthlySalary = yuanToCents(5000);
    expect(monthlySalary * 12).toBe(6000000);
  });

  it('工资发放状态追踪', () => {
    interface WageStatus {
      salary: number;
      isPaid: boolean;
    }

    const months: WageStatus[] = Array.from({ length: 12 }, () => ({
      salary: yuanToCents(5000),
      isPaid: false,
    }));

    const m0 = months[0];
    const m1 = months[1];
    const m2 = months[2];
    if (m0) m0.isPaid = true;
    if (m1) m1.isPaid = true;
    if (m2) m2.isPaid = true;

    const paid = months.filter((m) => m.isPaid).reduce((s, m) => s + m.salary, 0);
    const unpaid = months.filter((m) => !m.isPaid).reduce((s, m) => s + m.salary, 0);
    const total = months.reduce((s, m) => s + m.salary, 0);

    expect(paid).toBe(yuanToCents(15000));
    expect(unpaid).toBe(yuanToCents(45000));
    expect(total).toBe(paid + unpaid);
  });
});
