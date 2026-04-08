import { describe, it, expect } from 'vitest';
import { formatCurrency, formatMoney, yuanToCents, formatDate, generateOrderNo } from '@/lib/utils';

describe('formatCurrency（分转元字符串）', () => {
  it('正常整数分', () => {
    expect(formatCurrency(12345)).toBe('123.45');
  });

  it('0 分', () => {
    expect(formatCurrency(0)).toBe('0.00');
  });

  it('1 分', () => {
    expect(formatCurrency(1)).toBe('0.01');
  });

  it('整元（无分）', () => {
    expect(formatCurrency(10000)).toBe('100.00');
  });

  it('大金额', () => {
    expect(formatCurrency(9999999)).toBe('99999.99');
  });
});

describe('formatMoney（带 ¥ 符号）', () => {
  it('带符号输出', () => {
    expect(formatMoney(12345)).toBe('¥123.45');
  });

  it('零元', () => {
    expect(formatMoney(0)).toBe('¥0.00');
  });
});

describe('yuanToCents（元转分）', () => {
  it('整数元', () => {
    expect(yuanToCents(100)).toBe(10000);
  });

  it('带小数的元', () => {
    expect(yuanToCents(1.5)).toBe(150);
  });

  it('两位小数', () => {
    expect(yuanToCents(3.14)).toBe(314);
  });

  it('0 元', () => {
    expect(yuanToCents(0)).toBe(0);
  });

  it('浮点精度处理（0.1 + 0.2 场景）', () => {
    expect(yuanToCents(0.1 + 0.2)).toBe(30);
  });
});

describe('formatDate', () => {
  it('ISO 字符串截取前 10 位', () => {
    expect(formatDate('2026-04-08T10:30:00')).toBe('2026-04-08');
  });

  it('纯日期字符串不变', () => {
    expect(formatDate('2026-01-15')).toBe('2026-01-15');
  });
});

describe('generateOrderNo', () => {
  it('生成正确格式的订单号', () => {
    const orderNo = generateOrderNo(1);
    expect(orderNo).toMatch(/^XH\d{8}0001$/);
  });

  it('序号正确填充 4 位', () => {
    const orderNo = generateOrderNo(42);
    expect(orderNo).toMatch(/^XH\d{8}0042$/);
  });

  it('大序号', () => {
    const orderNo = generateOrderNo(9999);
    expect(orderNo).toMatch(/^XH\d{8}9999$/);
  });

  it('以 XH 开头 + 日期 + 序号', () => {
    const orderNo = generateOrderNo(5);
    expect(orderNo.startsWith('XH')).toBe(true);
    expect(orderNo.length).toBe(14);
  });
});
