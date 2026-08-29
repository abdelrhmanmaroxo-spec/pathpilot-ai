import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createAuthResilience } from './auth-resilience.js';
import { findUserByEmail, initializeDatabase } from './lib/database.js';

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

async function start({ emailSender, emailFrom = 'PathPilot <onboarding@resend.dev>' }) {
  const database = initializeDatabase();
  const handler = createAuthResilience({
    database,
    env: {
      OWNER_EMAIL: 'owner@example.com',
      RESEND_API_KEY: 'test-key',
      EMAIL_FROM: emailFrom,
    },
    sendJson,
    allowedOrigins: new Set(['http://localhost:5173']),
    emailSender,
  });
  const server = createServer(async (request, response) => {
    const url = new URL(request.url || '/', 'http://localhost');
    const handled = await handler(request, response, request.headers.origin || '', url.pathname);
    if (!handled) sendJson(response, 404, { error: 'Not found.' });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    database,
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

async function post(platform, path, body) {
  const response = await fetch(`${platform.url}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

test('registration keeps a pending account when sandbox email delivery fails', async (context) => {
  const platform = await start({
    emailSender: async () => {
      throw new Error('EMAIL_SEND_FAILED:403:You can only send testing emails to your own email address');
    },
  });
  context.after(async () => { await platform.close(); platform.database.close(); });

  const registration = await post(platform, '/api/auth/register', {
    name: 'Pending User',
    email: 'pending@gmail.com',
    password: 'StrongPassword123!',
  });

  assert.equal(registration.status, 202);
  assert.equal(registration.body.requiresVerification, true);
  assert.equal(registration.body.deliveryPending, true);
  assert.equal(registration.body.deliveryCode, 'EMAIL_SANDBOX_RESTRICTED');
  const stored = findUserByEmail(platform.database, 'pending@gmail.com');
  assert.ok(stored);
  assert.equal(Boolean(stored.email_verified), false);

  const duplicate = await post(platform, '/api/auth/register', {
    name: 'Pending User',
    email: 'pending@gmail.com',
    password: 'StrongPassword123!',
  });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.code, 'EMAIL_NOT_VERIFIED');
});

test('registration reports successful verification delivery when sender works', async (context) => {
  const sent = [];
  const platform = await start({
    emailFrom: 'PathPilot <noreply@example.com>',
    emailSender: async (message) => { sent.push(message); },
  });
  context.after(async () => { await platform.close(); platform.database.close(); });

  const registration = await post(platform, '/api/auth/register', {
    name: 'Delivered User',
    email: 'delivered@example.com',
    password: 'StrongPassword123!',
  });

  assert.equal(registration.status, 201);
  assert.equal(registration.body.deliveryPending, false);
  assert.equal(sent.length, 1);
  assert.match(sent[0].verificationUrl, /\/api\/auth\/verify-email\?token=/);
});
