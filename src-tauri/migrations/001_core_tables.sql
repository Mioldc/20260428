-- 客户表
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contactPerson TEXT,
  phone TEXT,
  address TEXT,
  settlementType TEXT NOT NULL DEFAULT '现结',
  invoiceInfo TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orderNo TEXT NOT NULL UNIQUE,
  customerId INTEGER NOT NULL REFERENCES customers(id),
  orderDate TEXT NOT NULL,
  deliveryDate TEXT,
  productName TEXT NOT NULL,
  patternName TEXT,
  patternNo TEXT,
  fabricType TEXT,
  embPosition TEXT,
  embSize TEXT,
  colorCount INTEGER,
  stitchCount INTEGER,
  quantity INTEGER NOT NULL,
  unitPrice INTEGER NOT NULL,
  totalAmount INTEGER NOT NULL,
  deposit INTEGER NOT NULL DEFAULT 0,
  unpaidAmount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT '待打样',
  specialNotes TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- 机台表
CREATE TABLE IF NOT EXISTS machines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  model TEXT,
  headCount INTEGER,
  status TEXT NOT NULL DEFAULT '正常',
  notes TEXT
);

-- 工人表
CREATE TABLE IF NOT EXISTS workers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  monthlySalary INTEGER,
  dayRate INTEGER,
  nightRate INTEGER,
  joinDate TEXT,
  status TEXT NOT NULL DEFAULT '在职',
  phone TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- 生产记录表
CREATE TABLE IF NOT EXISTS productionRecords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId INTEGER NOT NULL REFERENCES orders(id),
  machineId INTEGER NOT NULL REFERENCES machines(id),
  date TEXT NOT NULL,
  stitchCount INTEGER,
  quantity INTEGER NOT NULL,
  defectCount INTEGER DEFAULT 0,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- 收款记录表
CREATE TABLE IF NOT EXISTS orderPayments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId INTEGER NOT NULL REFERENCES orders(id),
  amount INTEGER NOT NULL,
  paymentDate TEXT NOT NULL,
  paymentMethod TEXT NOT NULL DEFAULT '现金',
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- 长工工资发放记录
CREATE TABLE IF NOT EXISTS wageRecords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workerId INTEGER NOT NULL REFERENCES workers(id),
  month TEXT NOT NULL,
  salary INTEGER NOT NULL,
  isPaid INTEGER NOT NULL DEFAULT 0,
  paidDate TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- 临时工出勤记录
CREATE TABLE IF NOT EXISTS dailyAttendances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workerId INTEGER NOT NULL REFERENCES workers(id),
  date TEXT NOT NULL,
  shift TEXT NOT NULL,
  amount INTEGER NOT NULL,
  isPaid INTEGER NOT NULL DEFAULT 0,
  paidDate TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS appConfig (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT
);
