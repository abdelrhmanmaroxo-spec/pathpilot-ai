import { visitorSecurityMetadata } from './client-context.js';

export const VISITOR_EVENT_TYPE = 'app_opened';
export const VISITOR_RETENTION_DAYS = 30;

function boundedText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength) || null;
}

function safeMetadata(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function enrichVisitorEventPayload(payload, request) {
  const input = payload && typeof payload === 'object' ? payload : {};
  if (String(input.eventType || '') !== VISITOR_EVENT_TYPE) return input;
  const metadata = safeMetadata(input.metadata);
  return {
    ...input,
    eventType: VISITOR_EVENT_TYPE,
    metadata: {
      route: boundedText(metadata.route, 80),
      language: boundedText(metadata.language, 20),
      timezone: boundedText(metadata.timezone, 80),
      security: visitorSecurityMetadata(request),
    },
  };
}

export function pruneVisitorSecurityEvents(database, {
  now = Date.now(),
  retentionDays = VISITOR_RETENTION_DAYS,
} = {}) {
  const days = Math.max(1, Math.min(365, Number(retentionDays) || VISITOR_RETENTION_DAYS));
  const cutoff = new Date(now - (days * 86_400_000)).toISOString();
  return database.prepare('DELETE FROM events WHERE event_type = ? AND created_at < ?')
    .run(VISITOR_EVENT_TYPE, cutoff).changes;
}

export function listVisitorSecurityEvents(database, limit = 200) {
  const boundedLimit = Math.max(1, Math.min(500, Number(limit) || 200));
  return database.prepare(`
    SELECT e.id,e.user_id,e.anonymous_id,e.metadata_json,e.created_at,
           u.name AS user_name,u.email AS user_email,u.role
    FROM events e
    LEFT JOIN users u ON u.id = e.user_id
    WHERE e.event_type = ?
    ORDER BY e.id DESC
    LIMIT ?
  `).all(VISITOR_EVENT_TYPE, boundedLimit).map((row) => {
    let metadata = {};
    try { metadata = JSON.parse(row.metadata_json || '{}') || {}; } catch { metadata = {}; }
    const security = safeMetadata(metadata.security);
    return {
      id: row.id,
      userId: row.user_id || null,
      userName: row.user_name || null,
      userEmail: row.user_email || null,
      role: row.role || null,
      anonymousId: row.anonymous_id || null,
      authenticated: Boolean(row.user_id),
      ip: boundedText(security.ip, 80) || 'unknown',
      device: boundedText(security.device, 180) || 'Unknown device',
      userAgent: boundedText(security.userAgent, 500),
      route: boundedText(metadata.route, 80) || 'home',
      language: boundedText(metadata.language, 20),
      timezone: boundedText(metadata.timezone, 80),
      createdAt: row.created_at,
    };
  });
}
