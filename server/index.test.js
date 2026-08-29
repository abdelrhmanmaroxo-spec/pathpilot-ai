import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createPathPilotServer } from './index.js';
import { initializeDatabase } from './lib/database.js';

async function startPlatform() {
  const database = initializeDatabase();
  const app = createPathPilotServer({
    database,
    env: { ALLOWED_ORIGINS: 'http://localhost:5173', ADMIN_EMAIL: 'admin@example.com' },
  });
  const server = createServer(app.handle);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    database,
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

async function jsonRequest(url, path, options = {}) {
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  return { status: response.status, body: await response.json() };
}

test('platform exposes honest offline AI status with a live database', async (context) => {
  const platform = await startPlatform();
  context.after(async () => { await platform.close(); platform.database.close(); });
  const response = await jsonRequest(platform.url, '/api/status');
  assert.equal(response.status, 200);
  assert.equal(response.body.apiOnline, false);
  assert.equal(response.body.databaseOnline, true);
  assert.equal(response.body.provider, 'OpenAI');
});

test('admin account can read real users, events, API usage and feedback', async (context) => {
  const platform = await startPlatform();
  context.after(async () => { await platform.close(); platform.database.close(); });
  const registration = await jsonRequest(platform.url, '/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'PathPilot Admin', email: 'admin@example.com', password: 'StrongPass123!' }),
  });
  assert.equal(registration.status, 201);
  assert.equal(registration.body.user.role, 'admin');
  const authorization = { Authorization: `Bearer ${registration.body.token}` };

  await jsonRequest(platform.url, '/api/events', {
    method: 'POST',
    headers: authorization,
    body: JSON.stringify({ eventType: 'tool_request', workspace: 'study', tool: 'explain' }),
  });
  await jsonRequest(platform.url, '/api/feedback', {
    method: 'POST',
    headers: authorization,
    body: JSON.stringify({ rating: 5, workspace: 'study', tool: 'explain' }),
  });

  const summary = await jsonRequest(platform.url, '/api/admin/summary', { headers: authorization });
  const users = await jsonRequest(platform.url, '/api/admin/users', { headers: authorization });
  const apiUsage = await jsonRequest(platform.url, '/api/admin/api-usage', { headers: authorization });
  const feedback = await jsonRequest(platform.url, '/api/admin/feedback', { headers: authorization });
  assert.equal(summary.body.summary.totalUsers, 1);
  assert.equal(summary.body.summary.totalUsage, 1);
  assert.equal(users.body.users.length, 1);
  assert.deepEqual(apiUsage.body.requests, []);
  assert.equal(feedback.body.feedback[0].rating, 5);
});
