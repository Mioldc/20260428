import { describe, it, expect } from 'vitest';
import { calculateUnpaidAmount, calculateTotalAmount } from '@/lib/business';
import { yuanToCents } from '@/lib/utils';

describe('收款金额计算', () => {
  it('下单金额计算: 100件 x 5.00元 = 500.00元 (50000分)', () => {
    const quantity = 100;
    const unitPrice = yuanToCents(5);
    expect(calculateTotalAmount(quantity, unitPrice)).toBe(50000);
  });

  it('收款后未收金额正确更新', () => {
    const total = yuanToCents(1000);
    const deposit = yuanToCents(200);
    const payment1 = yuanToCents(300);
    expect(calculateUnpaidAmount(total, deposit + payment1)).toBe(yuanToCents(500));
  });

  it('多次收款后未收金额正确累减', () => {
    const total = yuanToCents(2000);
    const payments = [yuanToCents(500), yuanToCents(300), yuanToCents(200)];
    const totalPaid = payments.reduce((s, p) => s + p, 0);
    expect(calculateUnpaidAmount(total, totalPaid)).toBe(yuanToCents(1000));
  });

  it('收款超过总金额时未收金额为0', () => {
    const total = yuanToCents(500);
    const paid = yuanToCents(600);
    expect(calculateUnpaidAmount(total, paid)).toBe(0);
  });

  it('收款等于总金额时完全结清', () => {
    const total = yuanToCents(888.88);
    expect(calculateUnpaidAmount(total, total)).toBe(0);
  });

  it('未收任何款项时欠款等于总金额', () => {
    const total = yuanToCents(3500);
    expect(calculateUnpaidAmount(total, 0)).toBe(total);
  });

  it('定金 + 收款 合计扣减正确', () => {
    const total = yuanToCents(10000);
    const deposit = yuanToCents(3000);
    const payment = yuanToCents(4000);
    expect(calculateUnpaidAmount(total, deposit + payment)).toBe(yuanToCents(3000));
  });

  it('小金额精度不丢失（分级运算）', () => {
    const total = yuanToCents(0.01);
    expect(total).toBe(1);
    expect(calculateUnpaidAmount(total, 0)).toBe(1);
    expect(calculateUnpaidAmount(total, 1)).toBe(0);
  });
});
