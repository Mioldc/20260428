import * as XLSX from 'xlsx';
import type { FactoryOverviewGranularity, FactoryOverviewRow } from '@/types';

interface ExportColumn<T> {
  header: string;
  accessor: (row: T) => string | number;
}

function exportToExcel<T>(
  data: T[],
  columns: ExportColumn<T>[],
  sheetName: string,
  fileName: string,
): void {
  const headers = columns.map((c) => c.header);
  const rows = data.map((row) => columns.map((c) => c.accessor(row)));

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  const colWidths = columns.map((col, i) => {
    const maxLen = Math.max(col.header.length * 2, ...rows.map((r) => String(r[i] ?? '').length));
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

/** 金额分转元字符串 */
function centsToYuan(cents: number): string {
  return (cents / 100).toFixed(2);
}

// ── Export functions ──

export function exportOrderList(
  orders: {
    orderNo: string;
    customerName?: string;
    productName: string;
    orderDate: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    unpaidAmount: number;
    status: string;
  }[],
): void {
  exportToExcel(
    orders,
    [
      { header: '订单号', accessor: (r) => r.orderNo },
      { header: '客户', accessor: (r) => r.customerName ?? '' },
      { header: '产品', accessor: (r) => r.productName },
      { header: '下单日期', accessor: (r) => r.orderDate },
      { header: '数量', accessor: (r) => r.quantity },
      { header: '单价(元)', accessor: (r) => centsToYuan(r.unitPrice) },
      { header: '总金额(元)', accessor: (r) => centsToYuan(r.totalAmount) },
      { header: '未收(元)', accessor: (r) => centsToYuan(r.unpaidAmount) },
      { header: '状态', accessor: (r) => r.status },
    ],
    '订单列表',
    `订单列表_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

export function exportStatement(
  customerName: string,
  dateFrom: string,
  dateTo: string,
  orders: {
    orderNo: string;
    productName: string;
    orderDate: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    deposit: number;
    status: string;
  }[],
  payments: {
    orderNo: string;
    paymentDate: string;
    paymentMethod: string;
    amount: number;
  }[],
  totals: { totalOrderAmount: number; totalDeposit: number; totalPaid: number; balance: number },
): void {
  const wb = XLSX.utils.book_new();

  // Orders sheet
  const orderHeaders = [
    '订单号',
    '产品',
    '下单日期',
    '数量',
    '单价(元)',
    '总金额(元)',
    '定金(元)',
    '状态',
  ];
  const orderRows = orders.map((r) => [
    r.orderNo,
    r.productName,
    r.orderDate,
    r.quantity,
    centsToYuan(r.unitPrice),
    centsToYuan(r.totalAmount),
    centsToYuan(r.deposit),
    r.status,
  ]);
  orderRows.push([]);
  orderRows.push([
    '合计',
    '',
    '',
    '',
    '',
    centsToYuan(totals.totalOrderAmount),
    centsToYuan(totals.totalDeposit),
    '',
  ]);

  const wsOrders = XLSX.utils.aoa_to_sheet([
    [`客户对账单 - ${customerName}`],
    [`时间范围: ${dateFrom} 至 ${dateTo}`],
    [],
    orderHeaders,
    ...orderRows,
  ]);
  XLSX.utils.book_append_sheet(wb, wsOrders, '订单明细');

  // Payments sheet
  const payHeaders = ['订单号', '收款日期', '收款方式', '金额(元)'];
  const payRows = payments.map((r) => [
    r.orderNo,
    r.paymentDate,
    r.paymentMethod,
    centsToYuan(r.amount),
  ]);
  payRows.push([]);
  payRows.push(['合计', '', '', centsToYuan(totals.totalPaid)]);

  const wsPayments = XLSX.utils.aoa_to_sheet([payHeaders, ...payRows]);
  XLSX.utils.book_append_sheet(wb, wsPayments, '收款明细');

  // Summary sheet
  const wsSummary = XLSX.utils.aoa_to_sheet([
    [`客户对账单 - ${customerName}`],
    [`时间范围: ${dateFrom} 至 ${dateTo}`],
    [],
    ['项目', '金额(元)'],
    ['订单总额', centsToYuan(totals.totalOrderAmount)],
    ['定金总额', centsToYuan(totals.totalDeposit)],
    ['收款总额', centsToYuan(totals.totalPaid)],
    ['未收余额', centsToYuan(totals.balance)],
  ]);
  XLSX.utils.book_append_sheet(wb, wsSummary, '汇总');

  XLSX.writeFile(wb, `对账单_${customerName}_${dateFrom}_${dateTo}.xlsx`);
}

export function exportWageDetail(
  records: {
    workerName: string;
    month: string;
    salary: number;
    isPaid: boolean | number;
    paidDate: string | null;
  }[],
  month: string,
): void {
  exportToExcel(
    records,
    [
      { header: '工人', accessor: (r) => r.workerName },
      { header: '月份', accessor: (r) => r.month },
      { header: '月薪(元)', accessor: (r) => centsToYuan(r.salary) },
      { header: '是否发放', accessor: (r) => (r.isPaid ? '已发放' : '未发放') },
      { header: '发放日期', accessor: (r) => r.paidDate ?? '' },
    ],
    '长工工资',
    `长工工资_${month}.xlsx`,
  );
}

export function exportPaymentList(
  payments: {
    orderNo: string;
    customerName: string;
    productName: string;
    paymentDate: string;
    paymentMethod: string;
    amount: number;
    notes: string | null;
  }[],
): void {
  exportToExcel(
    payments,
    [
      { header: '订单号', accessor: (r) => r.orderNo },
      { header: '客户', accessor: (r) => r.customerName },
      { header: '产品', accessor: (r) => r.productName },
      { header: '收款日期', accessor: (r) => r.paymentDate },
      { header: '收款方式', accessor: (r) => r.paymentMethod },
      { header: '金额(元)', accessor: (r) => centsToYuan(r.amount) },
      { header: '备注', accessor: (r) => r.notes ?? '' },
    ],
    '收款记录',
    `收款记录_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

export function exportTempWageDetail(
  records: {
    workerName: string;
    date: string;
    shift: string;
    amount: number;
    isPaid: boolean | number;
    paidDate: string | null;
  }[],
  dateRange: string,
): void {
  exportToExcel(
    records,
    [
      { header: '工人', accessor: (r) => r.workerName },
      { header: '日期', accessor: (r) => r.date },
      { header: '班次', accessor: (r) => r.shift },
      { header: '金额(元)', accessor: (r) => centsToYuan(r.amount) },
      { header: '是否结清', accessor: (r) => (r.isPaid ? '已结清' : '未结清') },
      { header: '结清日期', accessor: (r) => r.paidDate ?? '' },
    ],
    '临时工工资',
    `临时工工资明细_${dateRange}.xlsx`,
  );
}

export function exportFactoryOverview(
  granularity: FactoryOverviewGranularity,
  year: number,
  rows: FactoryOverviewRow[],
  summaryRow: FactoryOverviewRow | null,
  scope: 'current' | 'full' = 'full',
): void {
  const wb = XLSX.utils.book_new();

  const granularityLabel =
    granularity === 'month' ? '按月' : granularity === 'quarter' ? '按季度' : '按年';

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['工厂经营统计'],
    ['统计维度', granularityLabel],
    ['统计年份', `${year}年`],
    ['当前选中周期', summaryRow?.periodLabel ?? ''],
    [],
    ['项目', '金额(元)'],
    ['营收', centsToYuan(summaryRow?.revenueAmount ?? 0)],
    ['实收', centsToYuan(summaryRow?.receivedAmount ?? 0)],
    ['工资支出', centsToYuan(summaryRow?.wageExpense ?? 0)],
    ['线材采购', centsToYuan(summaryRow?.threadPurchaseExpense ?? 0)],
    ['总支出', centsToYuan(summaryRow?.totalExpense ?? 0)],
    ['净现金结余', centsToYuan(summaryRow?.netCashflow ?? 0)],
    [],
    ['说明', '当前支出口径仅含工人工资和线材采购'],
  ]);
  summarySheet['!cols'] = [{ wch: 18 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, '汇总');

  if (scope === 'current') {
    const currentSheet = XLSX.utils.aoa_to_sheet([
      ['当前选中周期明细'],
      ['统计维度', granularityLabel],
      ['统计年份', `${year}年`],
      ['当前选中周期', summaryRow?.periodLabel ?? ''],
      [],
      ['项目', '金额(元)'],
      ['营收', centsToYuan(summaryRow?.revenueAmount ?? 0)],
      ['实收', centsToYuan(summaryRow?.receivedAmount ?? 0)],
      ['工资支出', centsToYuan(summaryRow?.wageExpense ?? 0)],
      ['线材采购', centsToYuan(summaryRow?.threadPurchaseExpense ?? 0)],
      ['总支出', centsToYuan(summaryRow?.totalExpense ?? 0)],
      ['净现金结余', centsToYuan(summaryRow?.netCashflow ?? 0)],
    ]);
    currentSheet['!cols'] = [{ wch: 18 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, currentSheet, '当前周期');
    XLSX.writeFile(wb, `经营统计_${granularityLabel}_${summaryRow?.periodLabel ?? `${year}年`}.xlsx`);
    return;
  }

  const detailHeaders = ['周期', '营收(元)', '实收(元)', '工资支出(元)', '线材采购(元)', '总支出(元)', '净现金结余(元)'];
  const detailRows = rows.map((row) => [
    row.periodLabel,
    centsToYuan(row.revenueAmount),
    centsToYuan(row.receivedAmount),
    centsToYuan(row.wageExpense),
    centsToYuan(row.threadPurchaseExpense),
    centsToYuan(row.totalExpense),
    centsToYuan(row.netCashflow),
  ]);

  const detailSheet = XLSX.utils.aoa_to_sheet([
    [`工厂经营统计明细 - ${granularityLabel}`],
    [`统计年份: ${year}年`],
    [],
    detailHeaders,
    ...detailRows,
  ]);
  detailSheet['!cols'] = [
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, detailSheet, '周期明细');

  XLSX.writeFile(wb, `经营统计_${granularityLabel}_${year}年_全年明细.xlsx`);
}
