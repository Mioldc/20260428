/**
 * Mock for window.__TAURI_INTERNALS__ that intercepts Tauri IPC calls
 * and backs them with an in-memory SQLite database via sql.js (WASM).
 *
 * Injected via Playwright's page.addInitScript before any page scripts run.
 */
(function () {
  'use strict';

  var SCHEMA =
    "CREATE TABLE IF NOT EXISTS customers (" +
    "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "  name TEXT NOT NULL," +
    "  contactPerson TEXT," +
    "  phone TEXT," +
    "  address TEXT," +
    "  settlementType TEXT NOT NULL DEFAULT '现结'," +
    "  invoiceInfo TEXT," +
    "  notes TEXT," +
    "  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))" +
    ");" +
    "CREATE TABLE IF NOT EXISTS orders (" +
    "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "  orderNo TEXT NOT NULL UNIQUE," +
    "  customerId INTEGER NOT NULL REFERENCES customers(id)," +
    "  orderDate TEXT NOT NULL," +
    "  deliveryDate TEXT," +
    "  productName TEXT NOT NULL," +
    "  patternName TEXT," +
    "  patternNo TEXT," +
    "  fabricType TEXT," +
    "  embPosition TEXT," +
    "  embSize TEXT," +
    "  colorCount INTEGER," +
    "  stitchCount INTEGER," +
    "  quantity INTEGER NOT NULL," +
    "  unitPrice INTEGER NOT NULL," +
    "  totalAmount INTEGER NOT NULL," +
    "  deposit INTEGER NOT NULL DEFAULT 0," +
    "  unpaidAmount INTEGER NOT NULL," +
    "  status TEXT NOT NULL DEFAULT '待打样'," +
    "  specialNotes TEXT," +
    "  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))," +
    "  updatedAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))" +
    ");" +
    "CREATE TABLE IF NOT EXISTS machines (" +
    "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "  name TEXT NOT NULL," +
    "  model TEXT," +
    "  headCount INTEGER," +
    "  status TEXT NOT NULL DEFAULT '正常'," +
    "  notes TEXT" +
    ");" +
    "CREATE TABLE IF NOT EXISTS workers (" +
    "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "  name TEXT NOT NULL," +
    "  type TEXT NOT NULL," +
    "  monthlySalary INTEGER," +
    "  dayRate INTEGER," +
    "  nightRate INTEGER," +
    "  joinDate TEXT," +
    "  status TEXT NOT NULL DEFAULT '在职'," +
    "  phone TEXT," +
    "  notes TEXT," +
    "  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))" +
    ");" +
    "CREATE TABLE IF NOT EXISTS productionRecords (" +
    "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "  orderId INTEGER NOT NULL REFERENCES orders(id)," +
    "  machineId INTEGER NOT NULL REFERENCES machines(id)," +
    "  date TEXT NOT NULL," +
    "  stitchCount INTEGER," +
    "  quantity INTEGER NOT NULL," +
    "  defectCount INTEGER DEFAULT 0," +
    "  notes TEXT," +
    "  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))" +
    ");" +
    "CREATE TABLE IF NOT EXISTS orderPayments (" +
    "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "  orderId INTEGER NOT NULL REFERENCES orders(id)," +
    "  amount INTEGER NOT NULL," +
    "  paymentDate TEXT NOT NULL," +
    "  paymentMethod TEXT NOT NULL DEFAULT '现金'," +
    "  notes TEXT," +
    "  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))" +
    ");" +
    "CREATE TABLE IF NOT EXISTS wageRecords (" +
    "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "  workerId INTEGER NOT NULL REFERENCES workers(id)," +
    "  month TEXT NOT NULL," +
    "  salary INTEGER NOT NULL," +
    "  isPaid INTEGER NOT NULL DEFAULT 0," +
    "  paidDate TEXT," +
    "  notes TEXT," +
    "  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))" +
    ");" +
    "CREATE TABLE IF NOT EXISTS dailyAttendances (" +
    "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "  workerId INTEGER NOT NULL REFERENCES workers(id)," +
    "  date TEXT NOT NULL," +
    "  shift TEXT NOT NULL," +
    "  amount INTEGER NOT NULL," +
    "  isPaid INTEGER NOT NULL DEFAULT 0," +
    "  paidDate TEXT," +
    "  notes TEXT," +
    "  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))" +
    ");" +
    "CREATE TABLE IF NOT EXISTS appConfig (" +
    "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "  key TEXT NOT NULL UNIQUE," +
    "  value TEXT" +
    ");" +
    "CREATE TABLE IF NOT EXISTS threads (" +
    "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "  colorNo TEXT NOT NULL," +
    "  brand TEXT," +
    "  colorName TEXT," +
    "  material TEXT," +
    "  quantity INTEGER NOT NULL DEFAULT 0," +
    "  minStock INTEGER NOT NULL DEFAULT 0," +
    "  unitCost INTEGER," +
    "  supplier TEXT," +
    "  notes TEXT," +
    "  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))," +
    "  updatedAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))," +
    "  UNIQUE(colorNo, brand)" +
    ");" +
    "CREATE TABLE IF NOT EXISTS threadPurchases (" +
    "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "  threadId INTEGER NOT NULL REFERENCES threads(id)," +
    "  quantity INTEGER NOT NULL," +
    "  unitCost INTEGER," +
    "  totalCost INTEGER," +
    "  supplier TEXT," +
    "  purchaseDate TEXT NOT NULL," +
    "  notes TEXT," +
    "  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))" +
    ");";

  var dbResolve;
  var dbReady = new Promise(function (resolve) { dbResolve = resolve; });
  var sqlDb = null;

  // Load sql.js and create the database
  (function init() {
    var s = document.createElement('script');
    s.src = '/test-assets/sql-wasm.js';
    s.onload = function () {
      window.initSqlJs({
        locateFile: function (file) { return '/test-assets/' + file; }
      }).then(function (SQL) {
        sqlDb = new SQL.Database();
        sqlDb.run(SCHEMA);
        dbResolve();
      }).catch(function (err) {
        console.error('[TauriMock] sql.js init failed:', err);
        dbResolve();
      });
    };
    s.onerror = function () {
      console.error('[TauriMock] Failed to load sql-wasm.js');
      dbResolve();
    };
    var target = document.head || document.documentElement;
    if (target) {
      target.appendChild(s);
    } else {
      var iv = setInterval(function () {
        var t = document.head || document.documentElement;
        if (t) { clearInterval(iv); t.appendChild(s); }
      }, 5);
    }
  })();

  /**
   * Convert $1, $2 style params to ? style and build the new values array.
   * Handles repeated references like $2 appearing multiple times.
   */
  function convertParams(sql, values) {
    if (!values || values.length === 0) return { sql: sql, values: [] };
    var newValues = [];
    var converted = sql.replace(/\$(\d+)/g, function (_, num) {
      var idx = parseInt(num, 10) - 1;
      var v = idx < values.length ? values[idx] : null;
      newValues.push(v === undefined ? null : v);
      return '?';
    });
    return { sql: converted, values: newValues };
  }

  function executeSql(sql, values) {
    var p = convertParams(sql, values || []);
    sqlDb.run(p.sql, p.values);
    var lastIdRes = sqlDb.exec('SELECT last_insert_rowid() as id');
    var changesRes = sqlDb.exec('SELECT changes() as c');
    var rowsAffected = changesRes.length > 0 ? changesRes[0].values[0][0] : 0;
    var lastInsertId = lastIdRes.length > 0 ? lastIdRes[0].values[0][0] : 0;

    return {
      rowsAffected: rowsAffected,
      lastInsertId: lastInsertId,
    };
  }

  function selectSql(sql, values) {
    var ps = convertParams(sql, values || []);
    var stmt = sqlDb.prepare(ps.sql);
    if (ps.values.length > 0) {
      stmt.bind(ps.values);
    }
    var results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }

  window.__TAURI_INTERNALS__ = {
    invoke: function (cmd, args) {
      return dbReady.then(function () {
        if (!sqlDb && (cmd.indexOf('plugin:sql') === 0)) {
          throw new Error('[TauriMock] Database not initialized');
        }

        switch (cmd) {
          case 'check_license':
            return {
              valid: true,
              hardware_id: 'playwright-hwid',
              product: 'xiuhua',
              edition: 'dev',
              expires_at: null,
            };

          case 'db_execute':
            return executeSql(args.sql, args.params || []);

          case 'db_select':
            return selectSql(args.sql, args.params || []);

          case 'db_close':
            return true;

          case 'plugin:sql|load':
            return undefined;

          case 'plugin:sql|execute':
            return executeSql(args.query, args.values || []);

          case 'plugin:sql|select':
            return selectSql(args.query, args.values || []);

          case 'plugin:sql|close':
            return true;

          case 'plugin:dialog|save':
          case 'plugin:dialog|open':
            return null;

          case 'backup_database':
          case 'restore_database':
            return undefined;

          default:
            console.warn('[TauriMock] Unhandled command:', cmd);
            return null;
        }
      });
    },

    metadata: {
      currentWebview: { windowLabel: 'main', label: 'main' },
      currentWindow: { label: 'main' },
    },

    convertFileSrc: function (path) {
      return path;
    },
  };
})();
