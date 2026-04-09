-- 线材表
CREATE TABLE IF NOT EXISTS threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  colorNo TEXT NOT NULL,
  brand TEXT,
  colorName TEXT,
  material TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  minStock INTEGER NOT NULL DEFAULT 0,
  unitCost INTEGER,
  supplier TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  UNIQUE(colorNo, brand)
);

-- 线材采购记录表
CREATE TABLE IF NOT EXISTS threadPurchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  threadId INTEGER NOT NULL REFERENCES threads(id),
  quantity INTEGER NOT NULL,
  unitCost INTEGER,
  totalCost INTEGER,
  supplier TEXT,
  purchaseDate TEXT NOT NULL,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
