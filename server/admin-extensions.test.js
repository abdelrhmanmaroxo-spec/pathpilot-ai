import assert from 'node:assert/strict';
import test from 'node:test';
import { canModerateUserAccount, createAdminExtensions } from './admin-extensions.js';
import { hashToken } from './lib/auth.js';
import {
  createSession,
  createUser,
  findUserById,
  initializeDatabase,
} from './lib/database.js';

let tokenCounter = 0;

function createUserRecord(database, { email, role = 'user' }) {
  return createUser(database, {
    name: email.split('@')[0],
    email,
    passwordHash: 'not-used-in-this-test',
    role,
    emailVerified: true,
  });
}

function authenticatedRequest(database, actor, body) {
  tokenCounter += 1;
  const token = `admin-test-token-${tokenCounter}`;
  createSession(database, { tokenHash: hashToken(token), userId: actor.id });
  const payload = Buffer.from(JSON.stringify(body));
  return {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    socket: { remoteAddress: '127.0.0.1' },
    async *[Symbol.asyncIterator]() {
      yield payload;
    },
  };
}

function authenticatedGetRequest(database, actor) {
  tokenCounter += 1;
  const token = `admin-get-token-${tokenCounter}`;
  createSession(database, { tokenHash: hashToken(token), userId: actor.id });
  return {
    method: 'GET',
    headers: { authorization: `Bearer ${token}` },
    socket: { remoteAddress: '127.0.0.1' },
  };
}

function anonymousVisitRequest(body, headers = {}) {
  const payload = Buffer.from(JSON.stringify(body));
  return {
    method: 'POST',
    headers,
    socket: { remoteAddress: '10.0.0.2' },
    async *[Symbol.asyncIterator]() {
      yield payload;
    },
  };
}

function createHandler(database, ownerEmail = 'owner@example.com') {
  const state = { status: null, body: null };
  const sendJson = (_response, status, body) => {
    state.status = status;
    state.body = body;
  };
  return {
    state,
    handle: createAdminExtensions({
      database,
      env: { OWNER_EMAIL: ownerEmail },
      sendJson,
      allowedOrigins: new Set(),
    }),
  };
}

test('moderation policy lets admins act only on regular users while owner keeps non-owner moderation', () => {
  const ownerEmail = 'owner@example.com';
  const owner = { role: 'admin', email: ownerEmail };
  const admin = { role: 'admin', email: 'admin@example.com' };
  const regular = { role: 'user', email: 'user@example.com' };
  const otherAdmin = { role: 'admin', email: 'second-admin@example.com' };
  const protectedOwner = { role: 'admin', email: ownerEmail };

  assert.equal(canModerateUserAccount({ actor: admin, target: regular, ownerEmail }), true);
  assert.equal(canModerateUserAccount({ actor: admin, target: otherAdmin, ownerEmail }), false);
  assert.equal(canModerateUserAccount({ actor: admin, target: protectedOwner, ownerEmail }), false);
  assert.equal(canModerateUserAccount({ actor: owner, target: regular, ownerEmail }), true);
  assert.equal(canModerateUserAccount({ actor: owner, target: otherAdmin, ownerEmail }), true);
  assert.equal(canModerateUserAccount({ actor: owner, target: protectedOwner, ownerEmail }), false);
});

test('admin ban endpoint revokes a regular user sessions and records the admin actor', async () => {
  const database = initializeDatabase();
  const admin = createUserRecord(database, { email: 'admin@example.com', role: 'admin' });
  const target = createUserRecord(database, { email: 'user@example.com' });
  const targetToken = 'target-session';
  createSession(database, { tokenHash: hashToken(targetToken), userId: target.id });
  const { state, handle } = createHandler(database);

  const handled = await handle(
    authenticatedRequest(database, admin, { userId: target.id, banned: true, reason: 'Repeated abuse' }),
    {},
    '',
    '/api/admin/users/ban',
  );

  assert.equal(handled, true);
  assert.equal(state.status, 200);
  assert.equal(state.body.user.disabled, true);
  assert.equal(findUserById(database, target.id).disabled, 1);
  assert.equal(findUserById(database, target.id).disabled_reason, 'Repeated abuse');
  assert.equal(findUserById(database, target.id).disabled_by, admin.id);
  assert.ok(findUserById(database, target.id).disabled_at);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM sessions WHERE user_id = ?').get(target.id).count, 0);

  const audit = database.prepare('SELECT user_id,event_type,metadata_json FROM events ORDER BY id DESC LIMIT 1').get();
  assert.equal(audit.user_id, admin.id);
  assert.equal(audit.event_type, 'user_banned_by_admin');
  assert.equal(JSON.parse(audit.metadata_json).targetUserId, target.id);
  assert.equal(JSON.parse(audit.metadata_json).reason, 'Repeated abuse');
});

test('admin ban endpoint rejects another admin and protected owner, while owner may moderate a non-owner admin', async () => {
  const database = initializeDatabase();
  const owner = createUserRecord(database, { email: 'owner@example.com', role: 'admin' });
  const admin = createUserRecord(database, { email: 'admin@example.com', role: 'admin' });
  const otherAdmin = createUserRecord(database, { email: 'second-admin@example.com', role: 'admin' });
  const { state, handle } = createHandler(database);

  await handle(
    authenticatedRequest(database, admin, { userId: otherAdmin.id, banned: true }),
    {},
    '',
    '/api/admin/users/ban',
  );
  assert.equal(state.status, 403);
  assert.equal(findUserById(database, otherAdmin.id).disabled, 0);

  await handle(
    authenticatedRequest(database, admin, { userId: owner.id, banned: true }),
    {},
    '',
    '/api/admin/users/ban',
  );
  assert.equal(state.status, 400);
  assert.equal(findUserById(database, owner.id).disabled, 0);

  await handle(
    authenticatedRequest(database, owner, { userId: otherAdmin.id, banned: true }),
    {},
    '',
    '/api/admin/users/ban',
  );
  assert.equal(state.status, 200);
  assert.equal(findUserById(database, otherAdmin.id).disabled, 1);
  const audit = database.prepare('SELECT user_id,event_type FROM events ORDER BY id DESC LIMIT 1').get();
  assert.equal(audit.user_id, owner.id);
  assert.equal(audit.event_type, 'user_banned_by_owner');
});

test('visit endpoint records server-observed guest network context for admin review', async () => {
  const database = initializeDatabase();
  const admin = createUserRecord(database, { email: 'admin@example.com', role: 'admin' });
  const { state, handle } = createHandler(database);

  await handle(
    anonymousVisitRequest({
      visitorId: 'visitor-browser-1234',
      ipAddress: '1.1.1.1',
      platform: 'Win32',
      language: 'ar-EG',
      timezone: 'Africa/Cairo',
      screen: '1920x1080',
      path: '/chat',
      referrerHost: 'example.com',
    }, {
      'x-forwarded-for': '203.0.113.44, 10.0.0.2',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0) Chrome/140.0 Safari/537.36',
    }),
    {},
    '',
    '/api/security/visit',
  );
  assert.equal(state.status, 202);

  await handle(authenticatedGetRequest(database, admin), {}, '', '/api/admin/security-visits');
  assert.equal(state.status, 200);
  assert.equal(state.body.visits.length, 1);
  assert.equal(state.body.visits[0].ip_address, '203.0.113.44');
  assert.equal(state.body.visits[0].timezone, 'Africa/Cairo');
  assert.match(state.body.visits[0].device, /Chrome/);
  assert.equal(state.body.summary.guestVisitors, 1);
  assert.equal(state.body.summary.retentionDays, 30);
});

test('security visit log requires an admin account', async () => {
  const database = initializeDatabase();
  const { state, handle } = createHandler(database);
  await handle({ method: 'GET', headers: {}, socket: { remoteAddress: '127.0.0.1' } }, {}, '', '/api/admin/security-visits');
  assert.equal(state.status, 403);
});
