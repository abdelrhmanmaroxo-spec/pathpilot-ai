const DEFAULT_RETENTION_DAYS = 30;
const MIN_RETENTION_DAYS = 7;
const MAX_RETENTION_DAYS = 90;

function now() {
  return new Date().toISOString();
}

function clean(value, maxLength) {
  return [...String(value || '')]
    .filter((character) => character.charCodeAt(0) > 31 && character.charCodeAt(0) !== 127)
    .join('')
    .trim()
    .slice(0, maxLength);
}

function ensureTable(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS security_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_id TEXT NOT NULL,
      identity_key TEXT NOT NULL,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      ip_address TEXT NOT NULL,
      user_agent TEXT,
      device TEXT,
      language TEXT,
      timezone TEXT,
      screen TEXT,
      path TEXT,
      referrer_host TEXT,
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      visit_count INTEGER NOT NULL DEFAULT 1,
      UNIQUE(visitor_id, identity_key, ip_address)
    );
    CREATE INDEX IF NOT EXISTS security_visits_last_seen_idx ON security_visits(last_seen_at);
    CREATE INDEX IF NOT EXISTS security_visits_user_idx ON security_visits(user_id);
    CREATE INDEX IF NOT EXISTS security_visits_ip_idx ON security_visits(ip_address);
  `);
}

export function securityVisitRetentionDays(value) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_RETENTION_DAYS;
  return Math.max(MIN_RETENTION_DAYS, Math.min(parsed, MAX_RETENTION_DAYS));
}

export function purgeExpiredSecurityVisits(database, retentionDays = DEFAULT_RETENTION_DAYS) {
  ensureTable(database);
  const days = securityVisitRetentionDays(retentionDays);
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  return database.prepare('DELETE FROM security_visits WHERE last_seen_at < ?').run(cutoff).changes;
}

export function recordSecurityVisit(database, details, retentionDays = DEFAULT_RETENTION_DAYS) {
  ensureTable(database);
  purgeExpiredSecurityVisits(database, retentionDays);
  const visitorId = clean(details?.visitorId, 80);
  if (visitorId.length < 8 || !/^[a-z0-9._:-]+$/i.test(visitorId)) throw new Error('INVALID_VISITOR_ID');

  const userId = clean(details?.userId, 80) || null;
  const identityKey = userId ? `user:${userId}` : 'guest';
  const ipAddress = clean(details?.ipAddress, 80) || 'unknown';
  const recordedAt = now();
  const values = {
    visitorId,
    identityKey,
    userId,
    ipAddress,
    userAgent: clean(details?.userAgent, 500) || null,
    device: clean(details?.device, 180) || null,
    language: clean(details?.language, 40) || null,
    timezone: clean(details?.timezone, 80) || null,
    screen: clean(details?.screen, 40) || null,
    path: clean(details?.path, 160) || '/',
    referrerHost: clean(details?.referrerHost, 160) || null,
    recordedAt,
  };

  database.prepare(`
    INSERT INTO security_visits (
      visitor_id,identity_key,user_id,ip_address,user_agent,device,language,timezone,
      screen,path,referrer_host,first_seen_at,last_seen_at,visit_count
    ) VALUES (
      @visitorId,@identityKey,@userId,@ipAddress,@userAgent,@device,@language,@timezone,
      @screen,@path,@referrerHost,@recordedAt,@recordedAt,1
    )
    ON CONFLICT(visitor_id,identity_key,ip_address) DO UPDATE SET
      user_id=excluded.user_id,
      user_agent=excluded.user_agent,
      device=excluded.device,
      language=excluded.language,
      timezone=excluded.timezone,
      screen=excluded.screen,
      path=excluded.path,
      referrer_host=COALESCE(excluded.referrer_host,security_visits.referrer_host),
      last_seen_at=excluded.last_seen_at,
      visit_count=security_visits.visit_count + 1
  `).run(values);

  return database.prepare(`
    SELECT id,visitor_id,user_id,ip_address,device,language,timezone,screen,path,
           referrer_host,first_seen_at,last_seen_at,visit_count
    FROM security_visits
    WHERE visitor_id = ? AND identity_key = ? AND ip_address = ?
  `).get(visitorId, identityKey, ipAddress);
}

export function listSecurityVisits(database, { limit = 200, retentionDays = DEFAULT_RETENTION_DAYS } = {}) {
  ensureTable(database);
  purgeExpiredSecurityVisits(database, retentionDays);
  const safeLimit = Math.max(1, Math.min(Number(limit) || 200, 500));
  return database.prepare(`
    SELECT v.id,v.visitor_id,v.user_id,v.ip_address,v.user_agent,v.device,v.language,
           v.timezone,v.screen,v.path,v.referrer_host,v.first_seen_at,v.last_seen_at,
           v.visit_count,u.name AS user_name,u.email AS user_email,u.role AS user_role,
           u.disabled AS user_disabled
    FROM security_visits v
    LEFT JOIN users u ON u.id = v.user_id
    ORDER BY v.last_seen_at DESC
    LIMIT ?
  `).all(safeLimit).map((item) => ({
    ...item,
    isGuest: !item.user_id,
    user_disabled: Boolean(item.user_disabled),
  }));
}

export function getSecurityVisitSummary(database, retentionDays = DEFAULT_RETENTION_DAYS) {
  ensureTable(database);
  purgeExpiredSecurityVisits(database, retentionDays);
  const today = new Date(Date.now() - 86_400_000).toISOString();
  const row = database.prepare(`
    SELECT
      COUNT(*) AS tracked_sources,
      COUNT(DISTINCT visitor_id || '|' || identity_key) AS unique_visitors,
      COUNT(DISTINCT ip_address) AS unique_ips,
      COUNT(DISTINCT CASE WHEN user_id IS NULL THEN visitor_id END) AS guest_visitors,
      COUNT(DISTINCT CASE WHEN user_id IS NOT NULL THEN user_id END) AS signed_in_users,
      COALESCE(SUM(visit_count),0) AS recorded_entries,
      COUNT(DISTINCT CASE WHEN last_seen_at >= ? THEN visitor_id || '|' || identity_key END) AS active_last_24h
    FROM security_visits
  `).get(today);
  return {
    trackedSources: Number(row.tracked_sources || 0),
    uniqueVisitors: Number(row.unique_visitors || 0),
    uniqueIps: Number(row.unique_ips || 0),
    guestVisitors: Number(row.guest_visitors || 0),
    signedInUsers: Number(row.signed_in_users || 0),
    recordedEntries: Number(row.recorded_entries || 0),
    activeLast24h: Number(row.active_last_24h || 0),
    retentionDays: securityVisitRetentionDays(retentionDays),
  };
}
