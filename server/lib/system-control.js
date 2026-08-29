const DEFAULT_STATE = Object.freeze({
  paused: false,
  reason: '',
  updatedAt: null,
  updatedBy: null,
});

function ensureTables(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS system_control (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      paused INTEGER NOT NULL DEFAULT 0,
      reason TEXT NOT NULL DEFAULT '',
      updated_at TEXT,
      updated_by TEXT
    );
    INSERT OR IGNORE INTO system_control (id,paused,reason,updated_at,updated_by)
    VALUES (1,0,'',NULL,NULL);
    CREATE TABLE IF NOT EXISTS security_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      ip TEXT,
      path TEXT,
      details TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS security_events_created_idx ON security_events(created_at);
  `);
}

export function getSystemControl(database) {
  if (!database) return DEFAULT_STATE;
  ensureTables(database);
  const row = database.prepare('SELECT paused,reason,updated_at,updated_by FROM system_control WHERE id = 1').get();
  return {
    paused: Boolean(row?.paused),
    reason: String(row?.reason || ''),
    updatedAt: row?.updated_at || null,
    updatedBy: row?.updated_by || null,
  };
}

export function setSystemPaused(database, { paused, reason = '', updatedBy = null }) {
  ensureTables(database);
  const updatedAt = new Date().toISOString();
  database.prepare('UPDATE system_control SET paused = ?, reason = ?, updated_at = ?, updated_by = ? WHERE id = 1')
    .run(paused ? 1 : 0, String(reason || '').trim().slice(0, 500), updatedAt, updatedBy);
  return getSystemControl(database);
}

export function recordSecurityEvent(database, { eventType, severity = 'medium', ip = '', path = '', details = '' }) {
  if (!database) return;
  ensureTables(database);
  database.prepare('INSERT INTO security_events (event_type,severity,ip,path,details,created_at) VALUES (?,?,?,?,?,?)')
    .run(
      String(eventType || 'UNKNOWN').slice(0, 80),
      String(severity || 'medium').slice(0, 20),
      String(ip || '').slice(0, 80),
      String(path || '').slice(0, 220),
      String(details || '').slice(0, 1200),
      new Date().toISOString(),
    );
}

export function listSecurityEvents(database, limit = 100) {
  if (!database) return [];
  ensureTables(database);
  return database.prepare('SELECT id,event_type,severity,ip,path,details,created_at FROM security_events ORDER BY id DESC LIMIT ?').all(Math.max(1, Math.min(Number(limit) || 100, 500)));
}
