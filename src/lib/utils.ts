import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** 金额（分）格式化为元，例如 12345 → "123.45" */
export function formatCurrency(amountInCents: number): string {
  const yuan = amountInCents / 100;
  return yuan.toFixed(2);
}

/** 金额（分）格式化为带 ¥ 符号的字符串 */
export function formatMoney(amountInCents: number): string {
  return `¥${formatCurrency(amountInCents)}`;
}

/** 元转分（输入框用），四舍五入到整数 */
export function yuanToCents(yuan: number): number {
  return Math.round(yuan * 100);
}

/** 日期格式化：ISO 字符串 → YYYY-MM-DD */
export function formatDate(isoString: string): string {
  return isoString.slice(0, 10);
}

/** 生成订单编号：XH + 日期 + 4位序号 */
export function generateOrderNo(sequence: number): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');
  return `XH${y}${m}${d}${seq}`;
}
