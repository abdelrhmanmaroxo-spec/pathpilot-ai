import assert from 'node:assert/strict';
import test from 'node:test';
import { createUser, initializeDatabase } from './database.js';
import {
  getSecurityVisitSummary,
  listSecurityVisits,
  recordSecurityVisit,
  securityVisitRetentionDays,
} from './visitor-security.js';

test('security visit records merge repeat entries without mixing guests and accounts', () => {
  const database = initializeDatabase();
  const visitorId = 'visitor-test-1234';
  recordSecurityVisit(database, { visitorId, ipAddress: '203.0.113.9', device: 'Chrome · Windows · Desktop' });
  recordSecurityVisit(database, { visitorId, ipAddress: '203.0.113.9', device: 'Chrome · Windows · Desktop', path: '/chat' });

  const user = createUser(database, {
    name: 'Test User',
    email: 'user@example.com',
    passwordHash: 'unused',
    emailVerified: true,
  });
  recordSecurityVisit(database, { visitorId, userId: user.id, ipAddress: '203.0.113.9', path: '/work' });

  const visits = listSecurityVisits(database);
  assert.equal(visits.length, 2);
  assert.equal(visits.find((item) => item.isGuest).visit_count, 2);
  assert.equal(visits.find((item) => !item.isGuest).user_email, 'user@example.com');
  assert.deepEqual(getSecurityVisitSummary(database), {
    trackedSources: 2,
    uniqueVisitors: 2,
    uniqueIps: 1,
    guestVisitors: 1,
    signedInUsers: 1,
    recordedEntries: 3,
    activeLast24h: 2,
    retentionDays: 30,
  });
});

test('security visit retention is bounded and expired records are purged', () => {
  const database = initializeDatabase();
  recordSecurityVisit(database, { visitorId: 'visitor-old-1234', ipAddress: '198.51.100.4' });
  database.prepare('UPDATE security_visits SET last_seen_at = ?').run('2020-01-01T00:00:00.000Z');

  assert.equal(securityVisitRetentionDays('1'), 7);
  assert.equal(securityVisitRetentionDays('365'), 90);
  assert.equal(listSecurityVisits(database, { retentionDays: 7 }).length, 0);
});

test('security visit rejects malformed visitor identifiers', () => {
  const database = initializeDatabase();
  assert.throws(
    () => recordSecurityVisit(database, { visitorId: '<script>', ipAddress: '127.0.0.1' }),
    /INVALID_VISITOR_ID/,
  );
});
