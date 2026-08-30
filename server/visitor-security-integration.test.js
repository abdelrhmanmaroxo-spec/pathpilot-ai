import assert from 'node:assert/strict';
import { createServer as createNetServer } from 'node:net';
import test from 'node:test';
import { hashToken } from './lib/auth.js';
import { createSession, createUser } from './lib/database.js';
import { startPathPilotServer } from './start.js';

async function reservePort() {
  return new Promise((resolve, reject) => {
    const probe = createNetServer();
    probe.unref();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      const port = typeof address === 'object' && address ? address.port : null;
      probe.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function closeServer(server) {
  if (!server.listening) return;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

test('production entrypoint records server-derived guest visit context and exposes it only to admins', { timeout: 15_000 }, async (t) => {
  const port = await reservePort();
  const logger = { info() {}, warn() {}, error() {} };
  const { server, database } = startPathPilotServer({
    logger,
    env: {
      NODE_ENV: 'test',
      PORT: String(port),
      DATABASE_PATH: ':memory:',
      ALLOWED_ORIGINS: 'http://localhost:5173',
      OWNER_EMAIL: 'owner@example.com',
      AI_API_KEY: '',
      AI_MODEL: '',
      TAVILY_API_KEY: '',
      EMAIL_FROM: '',
    },
  });
  t.after(async () => {
    await closeServer(server);
    database.close();
  });
  if (!server.listening) await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${port}`;

  const visitResponse = await fetch(`${baseUrl}/api/events`, {
    method: 'POST',
    headers: {
      Origin: 'http://localhost:5173',
      'Content-Type': 'application/json',
      'X-Forwarded-For': '203.0.113.55, 198.51.100.77',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/151.0.0.0 Safari/537.36',
    },
    body: JSON.stringify({
      anonymousId: 'guest-test-id',
      eventType: 'app_opened',
      metadata: {
        route: 'chat',
        language: 'ar',
        timezone: 'Africa/Cairo',
        security: { ip: 'client-spoofed-ip' },
      },
    }),
  });
  assert.equal(visitResponse.status, 200);

  const stored = database.prepare("SELECT anonymous_id,metadata_json FROM events WHERE event_type = 'app_opened' ORDER BY id DESC LIMIT 1").get();
  assert.equal(stored.anonymous_id, 'guest-test-id');
  const metadata = JSON.parse(stored.metadata_json);
  assert.equal(metadata.security.ip, '198.51.100.77');
  assert.equal(metadata.security.device, 'Chrome · Windows · Desktop');
  assert.equal(metadata.route, 'chat');
  assert.equal(metadata.timezone, 'Africa/Cairo');

  const unauthorized = await fetch(`${baseUrl}/api/admin/visitor-log`, {
    headers: { Origin: 'http://localhost:5173' },
  });
  assert.equal(unauthorized.status, 403);

  const admin = createUser(database, {
    name: 'Security Admin',
    email: 'security-admin@example.com',
    passwordHash: 'unused-test-hash',
    role: 'admin',
    emailVerified: true,
  });
  const token = 'visitor-security-admin-token';
  createSession(database, { tokenHash: hashToken(token), userId: admin.id });

  const authorized = await fetch(`${baseUrl}/api/admin/visitor-log`, {
    headers: {
      Origin: 'http://localhost:5173',
      Authorization: `Bearer ${token}`,
    },
  });
  assert.equal(authorized.status, 200);
  const payload = await authorized.json();
  assert.equal(payload.retentionDays, 30);
  assert.equal(payload.visitors[0].anonymousId, 'guest-test-id');
  assert.equal(payload.visitors[0].ip, '198.51.100.77');
  assert.equal(payload.visitors[0].authenticated, false);
});
