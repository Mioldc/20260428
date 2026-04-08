export const ORDER_STATUS = {
  PENDING_SAMPLE: '待打样',
  SAMPLING: '打样中',
  PENDING_PRODUCTION: '待生产',
  IN_PRODUCTION: '生产中',
  COMPLETED: '已完成',
  SHIPPED: '已发货',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const SETTLEMENT_TYPE = {
  CASH: '现结',
  MONTHLY: '月结',
  BATCH: '批结',
} as const;

export type SettlementType = (typeof SETTLEMENT_TYPE)[keyof typeof SETTLEMENT_TYPE];

export const MACHINE_STATUS = {
  NORMAL: '正常',
  MAINTENANCE: '维修',
  STOPPED: '停机',
} as const;

export type MachineStatus = (typeof MACHINE_STATUS)[keyof typeof MACHINE_STATUS];

export const WORKER_TYPE = {
  PERMANENT: '长工',
  TEMPORARY: '临时工',
} as const;

export type WorkerType = (typeof WORKER_TYPE)[keyof typeof WORKER_TYPE];

export const WORKER_STATUS = {
  ACTIVE: '在职',
  LEFT: '离职',
} as const;

export type WorkerStatus = (typeof WORKER_STATUS)[keyof typeof WORKER_STATUS];

export const SHIFT_TYPE = {
  DAY: '白班',
  NIGHT: '夜班',
} as const;

export type ShiftType = (typeof SHIFT_TYPE)[keyof typeof SHIFT_TYPE];

export const PAYMENT_METHOD = {
  CASH: '现金',
  TRANSFER: '转账',
  OTHER: '其他',
} as const;

export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

export interface Customer {
  id: number;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  address: string | null;
  settlementType: SettlementType;
  invoiceInfo: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Order {
  id: number;
  orderNo: string;
  customerId: number;
  orderDate: string;
  deliveryDate: string | null;
  productName: string;
  patternName: string | null;
  patternNo: string | null;
  fabricType: string | null;
  embPosition: string | null;
  embSize: string | null;
  colorCount: number | null;
  stitchCount: number | null;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  deposit: number;
  unpaidAmount: number;
  status: OrderStatus;
  specialNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Machine {
  id: number;
  name: string;
  model: string | null;
  headCount: number | null;
  status: MachineStatus;
  notes: string | null;
}

export interface Worker {
  id: number;
  name: string;
  type: WorkerType;
  monthlySalary: number | null;
  dayRate: number | null;
  nightRate: number | null;
  joinDate: string | null;
  status: WorkerStatus;
  phone: string | null;
  notes: string | null;
  createdAt: string;
}

export interface ProductionRecord {
  id: number;
  orderId: number;
  machineId: number;
  date: string;
  stitchCount: number | null;
  quantity: number;
  defectCount: number;
  notes: string | null;
  createdAt: string;
}

export interface OrderPayment {
  id: number;
  orderId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  notes: string | null;
  createdAt: string;
}

export interface WageRecord {
  id: number;
  workerId: number;
  month: string;
  salary: number;
  isPaid: boolean;
  paidDate: string | null;
  notes: string | null;
  createdAt: string;
}

export interface DailyAttendance {
  id: number;
  workerId: number;
  date: string;
  shift: ShiftType;
  amount: number;
  isPaid: boolean;
  paidDate: string | null;
  notes: string | null;
  createdAt: string;
}

export interface AppConfig {
  id: number;
  key: string;
  value: string | null;
}

export interface NewCustomer {
  name: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  settlementType?: SettlementType;
  invoiceInfo?: string;
  notes?: string;
}

export interface NewOrder {
  orderNo: string;
  customerId: number;
  orderDate: string;
  deliveryDate?: string;
  productName: string;
  patternName?: string;
  patternNo?: string;
  fabricType?: string;
  embPosition?: string;
  embSize?: string;
  colorCount?: number;
  stitchCount?: number;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  deposit?: number;
  unpaidAmount: number;
  status?: OrderStatus;
  specialNotes?: string;
}

export interface OrderFilters {
  status?: OrderStatus;
  customerId?: number;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface OrderWithCustomer extends Order {
  customerName: string;
}

export interface ProductionRecordWithDetails extends ProductionRecord {
  orderNo: string;
  productName: string;
  machineName: string;
}

export interface NewMachine {
  name: string;
  model?: string;
  headCount?: number;
  status?: MachineStatus;
  notes?: string;
}

export interface NewProductionRecord {
  orderId: number;
  machineId: number;
  date: string;
  stitchCount?: number;
  quantity: number;
  defectCount?: number;
  notes?: string;
}

export interface NewWorker {
  name: string;
  type: WorkerType;
  monthlySalary?: number;
  dayRate?: number;
  nightRate?: number;
  joinDate?: string;
  status?: WorkerStatus;
  phone?: string;
  notes?: string;
}

export interface NewPayment {
  orderId: number;
  amount: number;
  paymentDate: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

export interface NewWageRecord {
  workerId: number;
  month: string;
  salary: number;
  isPaid?: number;
  paidDate?: string;
  notes?: string;
}

export interface NewDailyAttendance {
  workerId: number;
  date: string;
  shift: ShiftType;
  amount: number;
  isPaid?: number;
  paidDate?: string;
  notes?: string;
}

export interface PaymentWithOrder extends OrderPayment {
  orderNo: string;
  productName: string;
  customerName: string;
}

export interface WageRecordWithWorker extends WageRecord {
  workerName: string;
}

export interface DailyAttendanceWithWorker extends DailyAttendance {
  workerName: string;
  dayRate: number | null;
  nightRate: number | null;
}

export interface StatementOrder {
  id: number;
  orderNo: string;
  productName: string;
  orderDate: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  deposit: number;
  unpaidAmount: number;
  status: OrderStatus;
}

export interface StatementPayment {
  id: number;
  orderId: number;
  orderNo: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
}

export interface StatementData {
  customer: Customer;
  dateFrom: string;
  dateTo: string;
  orders: StatementOrder[];
  payments: StatementPayment[];
  totalOrderAmount: number;
  totalDeposit: number;
  totalPaid: number;
  balance: number;
}
