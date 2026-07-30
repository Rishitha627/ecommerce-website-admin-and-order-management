const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let useSQLite = false;
let mysqlPool = null;
let sqliteDb = null;

// Helper to convert MySQL SQL syntax variations to SQLite compatible syntax if needed
function translateSqlForSqlite(sql) {
  let cleanSql = sql;
  
  // DATE_FORMAT(created_at, '%Y-%m') -> strftime('%Y-%m', created_at)
  cleanSql = cleanSql.replace(/DATE_FORMAT\(([^,]+),\s*'%Y-%m'\)/gi, "strftime('%Y-%m', $1)");
  
  // GROUP BY DATE_FORMAT(...) -> GROUP BY strftime(...)
  return cleanSql;
}

async function initDb() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'techmart_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
  };

  try {
    // Attempt MySQL connection with a short timeout
    mysqlPool = mysql.createPool(dbConfig);
    const conn = await mysqlPool.getConnection();
    conn.release();
    console.log('✅ Connected to MySQL database server!');
    useSQLite = false;
    return true;
  } catch (error) {
    console.log('⚠️ Local MySQL server not detected or connection refused.');
    console.log('⚡ Automatically falling back to embedded SQLite database (techmart.db)...');
    
    useSQLite = true;
    const { open } = require('sqlite');
    const sqlite3 = require('sqlite3');

    const dbPath = path.join(__dirname, '..', 'db', 'techmart.db');
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    sqliteDb = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Enable foreign keys in SQLite
    await sqliteDb.run('PRAGMA foreign_keys = ON;');
    console.log('✅ Connected to embedded SQLite database successfully!');
    return true;
  }
}

async function query(sql, params = []) {
  if (!sqliteDb && !mysqlPool) {
    await initDb();
  }

  if (!useSQLite) {
    // Use MySQL Pool
    const [rows, fields] = await mysqlPool.query(sql, params);
    return [rows, fields];
  } else {
    // Use SQLite
    const translatedSql = translateSqlForSqlite(sql);
    const trimmed = translatedSql.trim();
    const isSelect = /^SELECT/i.test(trimmed) || /^SHOW/i.test(trimmed) || /^PRAGMA/i.test(trimmed);

    if (isSelect) {
      const rows = await sqliteDb.all(translatedSql, params);
      return [rows, null];
    } else {
      const result = await sqliteDb.run(translatedSql, params);
      // Format result object to mimic mysql2 result structure
      const resObj = {
        insertId: result.lastID,
        affectedRows: result.changes
      };
      return [resObj, null];
    }
  }
}

async function getConnection() {
  if (!sqliteDb && !mysqlPool) {
    await initDb();
  }

  if (!useSQLite) {
    return await mysqlPool.getConnection();
  } else {
    // Mock MySQL connection interface for transactions in SQLite
    return {
      query: (sql, params) => query(sql, params),
      beginTransaction: async () => await sqliteDb.run('BEGIN TRANSACTION;'),
      commit: async () => await sqliteDb.run('COMMIT;'),
      rollback: async () => await sqliteDb.run('ROLLBACK;'),
      release: () => {}
    };
  }
}

async function checkConnection() {
  return await initDb();
}

module.exports = {
  pool: {
    query,
    getConnection
  },
  checkConnection,
  isSQLite: () => useSQLite
};
