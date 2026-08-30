import assert from 'node:assert/strict';
import test from 'node:test';
import { initializeDatabase, trackEvent } from './database.js';
import {
  enrichVisitorEventPayload,
  listVisitorSecurityEvents,
  pruneVisitorSecurityEvents,
  VISITOR_EVENT_TYPE,
} from './visitor-security.js';

test('visitor event enrichment keeps only bounded useful client context plus server-derived security data', () => {
  const payload = enrichVisitorEventPayload({
    anonymousId: 'anon-1',
    eventType: VISITOR_EVENT_TYPE,
    metadata: {
      route: 'chat',
      language: 'ar',
      timezone: 'Africa/Cairo',
      security: { ip: 'spoofed-by-client' },
      secretExtra: 'must-not-be-kept',
    },
  }, {
    headers: {
      'x-forwarded-for': '203.0.113.9, 198.51.100.88',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/151.0.0.0 Safari/537.36',
    },
    socket: { remoteAddress: '10.0.0.3' },
  });

  assert.deepEqual(Object.keys(payload.metadata).sort(), ['language', 'route', 'security', 'timezone']);
  assert.equal(payload.metadata.security.ip, '198.51.100.88');
  assert.equal(payload.metadata.security.device, 'Chrome · Windows · Desktop');
  assert.equal(payload.metadata.route, 'chat');
  assert.equal(payload.metadata.timezone, 'Africa/Cairo');
});

test('non-visitor usage events are not enriched with security metadata', () => {
  const original = { eventType: 'workspace_opened', metadata: { source: 'test' } };
  assert.equal(enrichVisitorEventPayload(original, {}), original);
});

test('visitor log joins accounts when available and purges records older than retention', () => {
  const database = initializeDatabase();
  const oldDate = new Date('2026-01-01T00:00:00.000Z').toISOString();
  database.prepare(`
    INSERT INTO events (user_id,anonymous_id,event_type,workspace,tool,metadata_json,created_at)
    VALUES (NULL,?,?,?,?,?,?)
  `).run('old-anon', VISITOR_EVENT_TYPE, null, null, JSON.stringify({
    route: 'home',
    security: { ip: '192.0.2.1', device: 'Browser · Unknown OS · Desktop' },
  }), oldDate);

  trackEvent(database, {
    anonymousId: 'fresh-anon',
    eventType: VISITOR_EVENT_TYPE,
    metadata: {
      route: 'chat',
      language: 'en',
      security: { ip: '198.51.100.5', device: 'Chrome · Windows · Desktop', userAgent: 'UA' },
    },
  });

  const before = listVisitorSecurityEvents(database);
  assert.equal(before.length, 2);
  assert.equal(before[0].anonymousId, 'fresh-anon');
  assert.equal(before[0].ip, '198.51.100.5');
  assert.equal(before[0].route, 'chat');

  const removed = pruneVisitorSecurityEvents(database, { now: Date.parse('2026-08-30T00:00:00.000Z'), retentionDays: 30 });
  assert.equal(removed, 1);
  const after = listVisitorSecurityEvents(database);
  assert.equal(after.length, 1);
  assert.equal(after[0].anonymousId, 'fresh-anon');
});
