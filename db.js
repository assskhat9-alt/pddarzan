import sqlite3 from 'sqlite3';
import pg from 'pg';
import crypto from 'crypto';
import path from 'path';

const isPg = !!process.env.DATABASE_URL;
let pgPool = null;
let sqliteDb = null;

if (isPg) {
  pgPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  });
  console.log('Connected to PostgreSQL cloud database.');
} else {
  const DB_PATH = path.resolve('pdd_database.db');
  sqliteDb = new sqlite3.Database(DB_PATH);
  console.log('Connected to local SQLite database at', DB_PATH);
}

function formatSql(sql) {
  if (!isPg) return sql;
  let idx = 1;
  return sql.replace(/\?/g, () => `$${idx++}`);
}

function run(sql, params = []) {
  if (isPg) {
    let formatted = formatSql(sql);
    const isInsert = formatted.trim().toUpperCase().startsWith('INSERT');
    const hasId = formatted.toLowerCase().includes('into users') || formatted.toLowerCase().includes('into test_attempts');
    if (isInsert && hasId && !formatted.toUpperCase().includes('RETURNING')) {
      formatted += ' RETURNING id';
    }
    return pgPool.query(formatted, params).then(res => ({
      lastID: res.rows[0]?.id || null,
      changes: res.rowCount
    }));
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
}

function get(sql, params = []) {
  if (isPg) {
    const formatted = formatSql(sql);
    return pgPool.query(formatted, params).then(res => res.rows[0] || null);
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
}

function all(sql, params = []) {
  if (isPg) {
    const formatted = formatSql(sql);
    return pgPool.query(formatted, params).then(res => res.rows);
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

export async function initDb() {
  if (isPg) {
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        has_access INTEGER NOT NULL DEFAULT 0,
        phone TEXT,
        device_id TEXT,
        current_token TEXT,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        access_expires_at TIMESTAMP
      )
    `);
    await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMP`);
    await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`);
    await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS device_id TEXT`);
    await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS current_token TEXT`);
    await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP`);

    await run(`
      CREATE TABLE IF NOT EXISTS test_attempts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL DEFAULT 40,
        passed INTEGER NOT NULL,
        time_spent_seconds INTEGER NOT NULL,
        language TEXT NOT NULL DEFAULT 'kk',
        answers_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS platform_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
    await run(`CREATE INDEX IF NOT EXISTS idx_test_attempts_user ON test_attempts(user_id)`);
  } else {
    await run(`PRAGMA journal_mode = WAL;`);
    await run(`PRAGMA synchronous = NORMAL;`);
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        has_access INTEGER NOT NULL DEFAULT 0,
        phone TEXT,
        device_id TEXT,
        current_token TEXT,
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Auto-migrate users table if upgrading an existing db
    const userColumns = await all(`PRAGMA table_info(users)`);
    const colNames = userColumns.map(c => c.name);

    if (!colNames.includes('role')) {
      await run(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`);
    }
    if (!colNames.includes('has_access')) {
      await run(`ALTER TABLE users ADD COLUMN has_access INTEGER NOT NULL DEFAULT 0`);
    }
    if (!colNames.includes('phone')) {
      await run(`ALTER TABLE users ADD COLUMN phone TEXT`);
    }
    if (!colNames.includes('device_id')) {
      await run(`ALTER TABLE users ADD COLUMN device_id TEXT`);
    }
    if (!colNames.includes('current_token')) {
      await run(`ALTER TABLE users ADD COLUMN current_token TEXT`);
    }
    if (!colNames.includes('last_login')) {
      await run(`ALTER TABLE users ADD COLUMN last_login DATETIME`);
    }
    if (!colNames.includes('access_expires_at')) {
      await run(`ALTER TABLE users ADD COLUMN access_expires_at DATETIME`);
    }

    await run(`
      CREATE TABLE IF NOT EXISTS test_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL DEFAULT 40,
        passed INTEGER NOT NULL,
        time_spent_seconds INTEGER NOT NULL,
        language TEXT NOT NULL DEFAULT 'kk',
        answers_json TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS platform_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    await run(`CREATE INDEX IF NOT EXISTS idx_test_attempts_user ON test_attempts(user_id)`);
  }

  // Seed default admin account if not exists
  const existingAdmin = await get(`SELECT id FROM users WHERE role = 'admin' OR username = 'admin'`);
  if (!existingAdmin) {
    const adminHash = hashPassword('admin123');
    await run(
      `INSERT INTO users (username, full_name, password_hash, role, has_access) VALUES (?, ?, ?, ?, ?)`,
      ['admin', 'Бас Әкімші', adminHash, 'admin', 1]
    );
    console.log('Default admin account created: admin / admin123');
  } else {
    // Ensure admin has role 'admin' and has_access = 1
    await run(`UPDATE users SET role = 'admin', has_access = 1 WHERE username = 'admin'`);
  }

  // Seed default WhatsApp setting if not exists
  const existingWa = await get(`SELECT value FROM platform_settings WHERE key = 'admin_whatsapp'`);
  if (!existingWa) {
    await run(`INSERT INTO platform_settings (key, value) VALUES ('admin_whatsapp', '77006974143')`);
  }

  console.log('Database initialized successfully with admin, permissions & settings.');
}

// Password hashing helper (salt + sha512)
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// User methods
export async function createUser(username, fullName, password, role = 'user', hasAccess = 0, phone = null, accessExpiresAt = null) {
  const normalizedUsername = username.trim().toLowerCase();
  const passwordHash = hashPassword(password);
  const result = await run(
    `INSERT INTO users (username, full_name, password_hash, role, has_access, access_expires_at, phone) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [normalizedUsername, fullName.trim(), passwordHash, role, hasAccess ? 1 : 0, accessExpiresAt, phone ? phone.trim() : null]
  );
  return {
    id: result.lastID,
    username: normalizedUsername,
    full_name: fullName.trim(),
    role,
    has_access: hasAccess ? 1 : 0,
    access_expires_at: accessExpiresAt,
    phone: phone ? phone.trim() : null
  };
}

export async function findUserByUsername(username) {
  const normalizedUsername = username.trim().toLowerCase();
  return await get(`SELECT * FROM users WHERE username = ?`, [normalizedUsername]);
}

export async function findUserById(id) {
  return await get(
    `SELECT id, username, full_name, role, has_access, access_expires_at, phone, device_id, current_token, last_login, created_at FROM users WHERE id = ?`,
    [id]
  );
}

export async function updateUserSession(userId, deviceId, token) {
  await run(
    `UPDATE users SET device_id = ?, current_token = ?, last_login = CURRENT_TIMESTAMP WHERE id = ?`,
    [deviceId, token, userId]
  );
}

export async function resetUserDevice(userId) {
  await run(
    `UPDATE users SET device_id = NULL, current_token = NULL WHERE id = ?`,
    [userId]
  );
}

export async function toggleUserAccess(userId, hasAccess, accessExpiresAt = null) {
  await run(
    `UPDATE users SET has_access = ?, access_expires_at = ? WHERE id = ?`,
    [hasAccess ? 1 : 0, hasAccess ? accessExpiresAt : null, userId]
  );
}

export async function setUserAccessPeriod(userId, period) {
  // period: '1_month', '3_months', '6_months', 'unlimited', 'revoke'
  let hasAccess = 1;
  let expiresAt = null;

  if (period === 'revoke' || period === 0 || period === false) {
    hasAccess = 0;
    expiresAt = null;
  } else if (period === '1_month') {
    hasAccess = 1;
    expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  } else if (period === '3_months') {
    hasAccess = 1;
    expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  } else if (period === '6_months') {
    hasAccess = 1;
    expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
  } else if (period === 'unlimited' || period === 'lifetime' || period === null) {
    hasAccess = 1;
    expiresAt = null;
  } else {
    hasAccess = 1;
    expiresAt = period;
  }

  await run(
    `UPDATE users SET has_access = ?, access_expires_at = ? WHERE id = ?`,
    [hasAccess, expiresAt, userId]
  );

  return { hasAccess: !!hasAccess, accessExpiresAt: expiresAt };
}

export async function deleteUser(userId) {
  await run(`DELETE FROM test_attempts WHERE user_id = ?`, [userId]);
  await run(`DELETE FROM users WHERE id = ?`, [userId]);
}

export async function getAllUsers() {
  return await all(
    `SELECT id, username, full_name, role, has_access, access_expires_at, phone, device_id, last_login, created_at FROM users ORDER BY id DESC`
  );
}

// Settings methods
export async function getSetting(key, defaultValue = '') {
  const row = await get(`SELECT value FROM platform_settings WHERE key = ?`, [key]);
  return row ? row.value : defaultValue;
}

export async function setSetting(key, value) {
  await run(
    `INSERT INTO platform_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

// Test attempts methods
export async function saveTestAttempt(userId, score, totalQuestions, passed, timeSpentSeconds, language, answersData) {
  const answersJson = JSON.stringify(answersData);
  const result = await run(
    `INSERT INTO test_attempts (user_id, score, total_questions, passed, time_spent_seconds, language, answers_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, score, totalQuestions, passed ? 1 : 0, timeSpentSeconds, language, answersJson]
  );
  return result.lastID;
}

export async function getUserTestHistory(userId) {
  return await all(
    `SELECT id, score, total_questions, passed, time_spent_seconds, language, created_at
     FROM test_attempts
     WHERE user_id = ?
     ORDER BY id DESC`,
    [userId]
  );
}

export async function getTestAttemptById(attemptId, userId) {
  const attempt = await get(
    `SELECT * FROM test_attempts WHERE id = ? AND user_id = ?`,
    [attemptId, userId]
  );
  if (attempt && attempt.answers_json) {
    attempt.answers = JSON.parse(attempt.answers_json);
  }
  return attempt;
}

export async function getUserStats(userId) {
  const rows = await all(
    `SELECT score, total_questions, passed, time_spent_seconds FROM test_attempts WHERE user_id = ?`,
    [userId]
  );
  const total = rows.length;
  if (total === 0) {
    return {
      totalTests: 0,
      passedTests: 0,
      avgScore: 0,
      bestScore: 0,
      passRate: 0
    };
  }

  const passedTests = rows.filter(r => r.passed === 1).length;
  const totalScores = rows.reduce((sum, r) => sum + r.score, 0);
  const bestScore = Math.max(...rows.map(r => r.score));
  const avgScore = Math.round((totalScores / total) * 10) / 10;
  const passRate = Math.round((passedTests / total) * 100);

  return {
    totalTests: total,
    passedTests,
    avgScore,
    bestScore,
    passRate
  };
}

export default {
  initDb,
  createUser,
  findUserByUsername,
  findUserById,
  verifyPassword,
  hashPassword,
  updateUserSession,
  resetUserDevice,
  toggleUserAccess,
  setUserAccessPeriod,
  deleteUser,
  getAllUsers,
  getSetting,
  setSetting,
  saveTestAttempt,
  getUserTestHistory,
  getTestAttemptById,
  getUserStats
};
