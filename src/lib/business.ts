import type { OrderStatus } from '@/types';
import { ORDER_STATUS } from '@/types';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [ORDER_STATUS.PENDING_SAMPLE]: [ORDER_STATUS.SAMPLING],
  [ORDER_STATUS.SAMPLING]: [ORDER_STATUS.PENDING_SAMPLE, ORDER_STATUS.PENDING_PRODUCTION],
  [ORDER_STATUS.PENDING_PRODUCTION]: [ORDER_STATUS.IN_PRODUCTION],
  [ORDER_STATUS.IN_PRODUCTION]: [ORDER_STATUS.COMPLETED],
  [ORDER_STATUS.COMPLETED]: [ORDER_STATUS.SHIPPED],
  [ORDER_STATUS.SHIPPED]: [],
};

export function isValidStatusTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true;
  const allowed = VALID_TRANSITIONS[from];
  return allowed !== undefined && allowed.includes(to);
}

export function getNextStatuses(current: OrderStatus): OrderStatus[] {
  return VALID_TRANSITIONS[current] ?? [];
}

/**
 * All amounts in cents (分). Integer arithmetic only.
 */
export function calculateTotalAmount(quantity: number, unitPriceCents: number): number {
  return quantity * unitPriceCents;
}

export function calculateUnpaidAmount(totalAmountCents: number, paidAmountCents: number): number {
  return Math.max(0, totalAmountCents - paidAmountCents);
}

export function calculateDailyWage(
  shift: '白班' | '夜班',
  dayRate: number,
  nightRate: number,
): number {
  return shift === '白班' ? dayRate : nightRate;
}
