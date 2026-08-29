import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';

export function initializeDatabase(filename = ':memory:') {
  const database = new DatabaseSync(filename);
  database.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
      disabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      anonymous_id TEXT,
      event_type TEXT NOT NULL,
      workspace TEXT,
      tool TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ai_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      workspace TEXT NOT NULL,
      tool TEXT NOT NULL,
      model TEXT,
      status TEXT NOT NULL,
      latency_ms INTEGER,
      error_code TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS client_errors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      message TEXT NOT NULL,
      context TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      rating INTEGER CHECK(rating BETWEEN 1 AND 5),
      message TEXT,
      workspace TEXT,
      tool TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS events_created_idx ON events(created_at);
    CREATE INDEX IF NOT EXISTS ai_created_idx ON ai_requests(created_at);
  `);
  return database;
}

const now = () => new Date().toISOString();

export function createUser(database, { name, email, passwordHash, role = 'user' }) {
  const id = randomUUID();
  const createdAt = now();
  database.prepare('INSERT INTO users (id,name,email,password_hash,role,created_at,last_seen_at) VALUES (?,?,?,?,?,?,?)')
    .run(id, name, email, passwordHash, role, createdAt, createdAt);
  return { id, name, email, role, createdAt, lastSeenAt: createdAt };
}

export function findUserByEmail(database, email) {
  return database.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

export function createSession(database, { tokenHash, userId, days = 30 }) {
  const createdAt = now();
  const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
  database.prepare('INSERT INTO sessions (token_hash,user_id,created_at,expires_at) VALUES (?,?,?,?)')
    .run(tokenHash, userId, createdAt, expiresAt);
  return { expiresAt };
}

export function getSessionUser(database, tokenHash) {
  const user = database.prepare(`
    SELECT users.id,users.name,users.email,users.role,users.disabled,users.created_at,users.last_seen_at
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `).get(tokenHash, now());
  if (user && !user.disabled) database.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').run(now(), user.id);
  return user && !user.disabled ? user : null;
}

export function deleteSession(database, tokenHash) {
  database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
}

export function trackEvent(database, { userId = null, anonymousId = null, eventType, workspace = null, tool = null, metadata = null }) {
  database.prepare('INSERT INTO events (user_id,anonymous_id,event_type,workspace,tool,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)')
    .run(userId, anonymousId, eventType, workspace, tool, metadata ? JSON.stringify(metadata) : null, now());
}

export function trackAiRequest(database, { userId = null, workspace, tool, model, status, latencyMs = null, errorCode = null }) {
  database.prepare('INSERT INTO ai_requests (user_id,workspace,tool,model,status,latency_ms,error_code,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(userId, workspace, tool, model, status, latencyMs, errorCode, now());
}

export function trackClientError(database, { userId = null, message, context = '' }) {
  database.prepare('INSERT INTO client_errors (user_id,message,context,created_at) VALUES (?,?,?,?)')
    .run(userId, message, context, now());
}

export function createFeedback(database, { userId = null, rating, message = '', workspace = null, tool = null }) {
  database.prepare('INSERT INTO feedback (user_id,rating,message,workspace,tool,created_at) VALUES (?,?,?,?,?,?)')
    .run(userId, rating, message, workspace, tool, now());
}

export function getAdminSummary(database, aiConfigured) {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const totalUsers = database.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  const activeToday = database.prepare('SELECT COUNT(*) AS count FROM users WHERE last_seen_at >= ?').get(since).count;
  const aiRequests = database.prepare('SELECT COUNT(*) AS count FROM ai_requests').get().count;
  const successfulAiRequests = database.prepare("SELECT COUNT(*) AS count FROM ai_requests WHERE status = 'success'").get().count;
  const usageRows = database.prepare("SELECT workspace,COUNT(*) AS count FROM events WHERE event_type = 'tool_request' GROUP BY workspace").all();
  const usage = Object.fromEntries(usageRows.map((row) => [row.workspace || 'unknown', row.count]));
  const totalUsage = Object.values(usage).reduce((sum, value) => sum + value, 0);
  return {
    totalUsers,
    activeToday,
    aiRequests,
    aiSuccessRate: aiRequests ? Math.round((successfulAiRequests / aiRequests) * 100) : 0,
    usage,
    totalUsage,
    apiOnline: Boolean(aiConfigured),
    errors: database.prepare('SELECT COUNT(*) AS count FROM client_errors').get().count,
    feedback: database.prepare('SELECT COUNT(*) AS count FROM feedback').get().count,
  };
}

export function listUsers(database, limit = 50) {
  return database.prepare('SELECT id,name,email,role,disabled,created_at,last_seen_at FROM users ORDER BY created_at DESC LIMIT ?').all(limit);
}

export function listErrors(database, limit = 30) {
  return database.prepare('SELECT id,message,context,created_at FROM client_errors ORDER BY created_at DESC LIMIT ?').all(limit);
}

export function listAiRequests(database, limit = 50) {
  return database.prepare('SELECT id,workspace,tool,model,status,latency_ms,error_code,created_at FROM ai_requests ORDER BY created_at DESC LIMIT ?').all(limit);
}

export function listFeedback(database, limit = 30) {
  return database.prepare('SELECT id,rating,message,workspace,tool,created_at FROM feedback ORDER BY created_at DESC LIMIT ?').all(limit);
}
