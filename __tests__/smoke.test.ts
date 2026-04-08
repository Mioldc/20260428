import { describe, it, expect } from 'vitest';

describe('冒烟测试', () => {
  it('环境正常运行', () => {
    expect(1 + 1).toBe(2);
  });

  it('TypeScript 类型系统正常', () => {
    const msg: string = '绣花厂订单管理系统';
    expect(msg).toContain('订单');
  });
});
