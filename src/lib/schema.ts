import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const timestamp = () =>
  text()
    .notNull()
    .default(sql`(datetime('now','localtime'))`);

export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  contactPerson: text('contactPerson'),
  phone: text('phone'),
  address: text('address'),
  settlementType: text('settlementType').notNull().default('现结'),
  invoiceInfo: text('invoiceInfo'),
  notes: text('notes'),
  createdAt: timestamp(),
});

export const orders = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderNo: text('orderNo').notNull().unique(),
  customerId: integer('customerId')
    .notNull()
    .references(() => customers.id),
  orderDate: text('orderDate').notNull(),
  deliveryDate: text('deliveryDate'),
  productName: text('productName').notNull(),
  patternName: text('patternName'),
  patternNo: text('patternNo'),
  fabricType: text('fabricType'),
  embPosition: text('embPosition'),
  embSize: text('embSize'),
  colorCount: integer('colorCount'),
  stitchCount: integer('stitchCount'),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unitPrice').notNull(),
  totalAmount: integer('totalAmount').notNull(),
  deposit: integer('deposit').notNull().default(0),
  unpaidAmount: integer('unpaidAmount').notNull(),
  status: text('status').notNull().default('待打样'),
  specialNotes: text('specialNotes'),
  createdAt: timestamp(),
  updatedAt: timestamp(),
});

export const machines = sqliteTable('machines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  model: text('model'),
  headCount: integer('headCount'),
  status: text('status').notNull().default('正常'),
  notes: text('notes'),
});

export const workers = sqliteTable('workers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type').notNull(),
  monthlySalary: integer('monthlySalary'),
  dayRate: integer('dayRate'),
  nightRate: integer('nightRate'),
  joinDate: text('joinDate'),
  status: text('status').notNull().default('在职'),
  phone: text('phone'),
  notes: text('notes'),
  createdAt: timestamp(),
});

export const productionRecords = sqliteTable('productionRecords', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('orderId')
    .notNull()
    .references(() => orders.id),
  machineId: integer('machineId')
    .notNull()
    .references(() => machines.id),
  date: text('date').notNull(),
  stitchCount: integer('stitchCount'),
  quantity: integer('quantity').notNull(),
  defectCount: integer('defectCount').default(0),
  notes: text('notes'),
  createdAt: timestamp(),
});

export const orderPayments = sqliteTable('orderPayments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('orderId')
    .notNull()
    .references(() => orders.id),
  amount: integer('amount').notNull(),
  paymentDate: text('paymentDate').notNull(),
  paymentMethod: text('paymentMethod').notNull().default('现金'),
  notes: text('notes'),
  createdAt: timestamp(),
});

export const wageRecords = sqliteTable('wageRecords', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workerId: integer('workerId')
    .notNull()
    .references(() => workers.id),
  month: text('month').notNull(),
  salary: integer('salary').notNull(),
  isPaid: integer('isPaid').notNull().default(0),
  paidDate: text('paidDate'),
  notes: text('notes'),
  createdAt: timestamp(),
});

export const dailyAttendances = sqliteTable('dailyAttendances', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workerId: integer('workerId')
    .notNull()
    .references(() => workers.id),
  date: text('date').notNull(),
  shift: text('shift').notNull(),
  amount: integer('amount').notNull(),
  isPaid: integer('isPaid').notNull().default(0),
  paidDate: text('paidDate'),
  notes: text('notes'),
  createdAt: timestamp(),
});

export const appConfig = sqliteTable('appConfig', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value'),
});
