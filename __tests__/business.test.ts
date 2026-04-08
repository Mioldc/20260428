import { describe, it, expect } from 'vitest';
import {
  isValidStatusTransition,
  getNextStatuses,
  calculateTotalAmount,
  calculateUnpaidAmount,
  calculateDailyWage,
} from '@/lib/business';
import { ORDER_STATUS } from '@/types';

describe('订单状态流转', () => {
  it('相同状态转换始终合法', () => {
    for (const status of Object.values(ORDER_STATUS)) {
      expect(isValidStatusTransition(status, status)).toBe(true);
    }
  });

  it('待打样 → 打样中 合法', () => {
    expect(isValidStatusTransition('待打样', '打样中')).toBe(true);
  });

  it('打样中 → 待打样 合法（打样不通过）', () => {
    expect(isValidStatusTransition('打样中', '待打样')).toBe(true);
  });

  it('打样中 → 待生产 合法（客户确认）', () => {
    expect(isValidStatusTransition('打样中', '待生产')).toBe(true);
  });

  it('待生产 → 生产中 合法', () => {
    expect(isValidStatusTransition('待生产', '生产中')).toBe(true);
  });

  it('生产中 → 已完成 合法', () => {
    expect(isValidStatusTransition('生产中', '已完成')).toBe(true);
  });

  it('已完成 → 已发货 合法', () => {
    expect(isValidStatusTransition('已完成', '已发货')).toBe(true);
  });

  it('已发货 → 任何状态 不合法（终态）', () => {
    expect(isValidStatusTransition('已发货', '待打样')).toBe(false);
    expect(isValidStatusTransition('已发货', '生产中')).toBe(false);
    expect(isValidStatusTransition('已发货', '已完成')).toBe(false);
  });

  it('不允许跳过状态', () => {
    expect(isValidStatusTransition('待打样', '生产中')).toBe(false);
    expect(isValidStatusTransition('待打样', '已完成')).toBe(false);
    expect(isValidStatusTransition('打样中', '生产中')).toBe(false);
    expect(isValidStatusTransition('待生产', '已完成')).toBe(false);
  });

  it('不允许从后面回退多步', () => {
    expect(isValidStatusTransition('生产中', '待打样')).toBe(false);
    expect(isValidStatusTransition('已完成', '打样中')).toBe(false);
  });

  it('getNextStatuses 返回正确后续状态列表', () => {
    expect(getNextStatuses('待打样')).toEqual(['打样中']);
    expect(getNextStatuses('打样中')).toEqual(['待打样', '待生产']);
    expect(getNextStatuses('待生产')).toEqual(['生产中']);
    expect(getNextStatuses('生产中')).toEqual(['已完成']);
    expect(getNextStatuses('已完成')).toEqual(['已发货']);
    expect(getNextStatuses('已发货')).toEqual([]);
  });
});

describe('金额计算', () => {
  it('总金额 = 数量 × 单价（分）', () => {
    expect(calculateTotalAmount(100, 500)).toBe(50000);
    expect(calculateTotalAmount(1, 1)).toBe(1);
    expect(calculateTotalAmount(0, 500)).toBe(0);
  });

  it('大数量订单金额计算正确', () => {
    expect(calculateTotalAmount(10000, 3500)).toBe(35000000);
  });

  it('未收金额 = 总金额 - 已付金额', () => {
    expect(calculateUnpaidAmount(50000, 20000)).toBe(30000);
  });

  it('未收金额不小于 0', () => {
    expect(calculateUnpaidAmount(50000, 60000)).toBe(0);
    expect(calculateUnpaidAmount(50000, 50000)).toBe(0);
  });

  it('全额支付后未收金额为 0', () => {
    expect(calculateUnpaidAmount(12345, 12345)).toBe(0);
  });

  it('未付款时未收金额等于总金额', () => {
    expect(calculateUnpaidAmount(99900, 0)).toBe(99900);
  });
});

describe('临时工日结工资计算', () => {
  it('白班使用白班单价', () => {
    expect(calculateDailyWage('白班', 20000, 25000)).toBe(20000);
  });

  it('夜班使用夜班单价', () => {
    expect(calculateDailyWage('夜班', 20000, 25000)).toBe(25000);
  });
});
