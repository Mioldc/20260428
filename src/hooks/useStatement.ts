import { useCallback, useState } from 'react';
import { getCustomerById } from '@/lib/queries/customers';
import { getStatementData } from '@/lib/queries/payments';
import type { StatementData } from '@/types';

interface UseStatementResult {
  data: StatementData | null;
  generating: boolean;
  generate: (customerId: number, dateFrom: string, dateTo: string) => Promise<boolean>;
}

export function useStatement(): UseStatementResult {
  const [data, setData] = useState<StatementData | null>(null);
  const [generating, setGenerating] = useState(false);

  const generate = useCallback(
    async (customerId: number, dateFrom: string, dateTo: string): Promise<boolean> => {
      setGenerating(true);
      try {
        const customer = await getCustomerById(customerId);
        if (!customer) {
          setData(null);
          return false;
        }

        const { orders, payments } = await getStatementData(customerId, dateFrom, dateTo);
        const totalOrderAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        const totalDeposit = orders.reduce((sum, order) => sum + order.deposit, 0);
        const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

        setData({
          customer,
          dateFrom,
          dateTo,
          orders,
          payments,
          totalOrderAmount,
          totalDeposit,
          totalPaid,
          balance: totalOrderAmount - totalDeposit - totalPaid,
        });

        return true;
      } finally {
        setGenerating(false);
      }
    },
    [],
  );

  return { data, generating, generate };
}
