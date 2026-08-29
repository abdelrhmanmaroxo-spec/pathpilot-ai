import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createPathPilotServer } from './index.js';
import { initializeDatabase } from './lib/database.js';

async function startPlatform() {
  const database = initializeDatabase();
  const sent = [];
  const resetSent = [];
  const app = createPathPilotServer({
    database,
    env: {
      ALLOWED_ORIGINS: 'http://localhost:5173',
      OWNER_EMAIL: 'admin@example.com',
      RESEND_API_KEY: 'test-key',
      EMAIL_FROM: 'PathPilot <noreply@example.com>',
      PUBLIC_APP_URL: 'http://localhost:5173',
    },
    emailSender: async (message) => { sent.push(message); },
    passwordResetSender: async (message) => { resetSent.push(message); },
  });
  const server = createServer(app.handle);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    database,
    sent,
    resetSent,
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

async function jsonRequest(url, path, options = {}) {
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

async function registerAndVerify(platform, details) {
  const registration = await jsonRequest(platform.url, '/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(details),
  });
  assert.equal(registration.status, 201);
  assert.equal(registration.body.requiresVerification, true);
  const verification = platform.sent.at(-1);
  assert.ok(verification?.verificationUrl);
  const verificationUrl = new URL(verification.verificationUrl);
  const response = await fetch(`${platform.url}${verificationUrl.pathname}${verificationUrl.search}`);
  assert.equal(response.status, 200);
  return registration;
}

test('platform exposes honest offline AI status with a live database', async (context) => {
  const platform = await startPlatform();
  context.after(async () => { await platform.close(); platform.database.close(); });
  const response = await jsonRequest(platform.url, '/api/status');
  assert.equal(response.status, 200);
  assert.equal(response.body.apiOnline, false);
  assert.equal(response.body.databaseOnline, true);
  assert.equal(response.body.emailVerificationAvailable, true);
  assert.equal(response.body.passwordResetAvailable, true);
  assert.equal(response.body.provider, 'OpenAI');
});

test('email/password registration cannot sign in before email verification', async (context) => {
  const platform = await startPlatform();
  context.after(async () => { await platform.close(); platform.database.close(); });

  const registration = await jsonRequest(platform.url, '/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'New User', email: 'new@example.com', password: 'StrongPass123!' }),
  });
  assert.equal(registration.status, 201);
  assert.equal(registration.body.requiresVerification, true);

  const blockedLogin = await jsonRequest(platform.url, '/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'new@example.com', password: 'StrongPass123!' }),
  });
  assert.equal(blockedLogin.status, 403);
  assert.equal(blockedLogin.body.code, 'EMAIL_NOT_VERIFIED');

  const verificationUrl = new URL(platform.sent[0].verificationUrl);
  const verification = await fetch(`${platform.url}${verificationUrl.pathname}${verificationUrl.search}`);
  assert.equal(verification.status, 200);

  const login = await jsonRequest(platform.url, '/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'new@example.com', password: 'StrongPass123!' }),
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.emailVerified, true);
});

test('password reset changes the password and invalidates existing sessions', async (context) => {
  const platform = await startPlatform();
  context.after(async () => { await platform.close(); platform.database.close(); });
  await registerAndVerify(platform, { name: 'Reset User', email: 'reset@example.com', password: 'OldPassword123!' });

  const login = await jsonRequest(platform.url, '/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'reset@example.com', password: 'OldPassword123!' }),
  });
  assert.equal(login.status, 200);
  const oldAuthorization = { Authorization: `Bearer ${login.body.token}` };

  const forgot = await jsonRequest(platform.url, '/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: 'reset@example.com' }),
  });
  assert.equal(forgot.status, 200);
  assert.equal(platform.resetSent.length, 1);

  const resetUrl = new URL(platform.resetSent[0].resetUrl);
  const resetToken = resetUrl.searchParams.get('token');
  assert.ok(resetToken);
  const reset = await jsonRequest(platform.url, '/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token: resetToken, password: 'NewPassword456!' }),
  });
  assert.equal(reset.status, 200);

  const oldSession = await jsonRequest(platform.url, '/api/auth/me', { headers: oldAuthorization });
  assert.equal(oldSession.status, 401);

  const oldLogin = await jsonRequest(platform.url, '/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'reset@example.com', password: 'OldPassword123!' }),
  });
  assert.equal(oldLogin.status, 401);

  const newLogin = await jsonRequest(platform.url, '/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'reset@example.com', password: 'NewPassword456!' }),
  });
  assert.equal(newLogin.status, 200);
});

test('forgot password response does not reveal whether an account exists', async (context) => {
  const platform = await startPlatform();
  context.after(async () => { await platform.close(); platform.database.close(); });
  const response = await jsonRequest(platform.url, '/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: 'does-not-exist@example.com' }),
  });
  assert.equal(response.status, 200);
  assert.equal(platform.resetSent.length, 0);
});

test('owner can invite admins and delete users but cannot delete owner account', async (context) => {
  const platform = await startPlatform();
  context.after(async () => { await platform.close(); platform.database.close(); });

  await registerAndVerify(platform, { name: 'PathPilot Owner', email: 'admin@example.com', password: 'StrongPass123!' });
  const ownerLogin = await jsonRequest(platform.url, '/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@example.com', password: 'StrongPass123!' }),
  });
  assert.equal(ownerLogin.status, 200);
  assert.equal(ownerLogin.body.user.role, 'admin');
  assert.equal(ownerLogin.body.user.isOwner, true);
  const authorization = { Authorization: `Bearer ${ownerLogin.body.token}` };

  const invitation = await jsonRequest(platform.url, '/api/admin/invites', {
    method: 'POST',
    headers: authorization,
    body: JSON.stringify({ email: 'future-admin@example.com' }),
  });
  assert.equal(invitation.status, 201);
  assert.equal(invitation.body.status, 'invite_created');

  await registerAndVerify(platform, { name: 'Future Admin', email: 'future-admin@example.com', password: 'StrongPass123!' });
  const adminLogin = await jsonRequest(platform.url, '/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'future-admin@example.com', password: 'StrongPass123!' }),
  });
  assert.equal(adminLogin.status, 200);
  assert.equal(adminLogin.body.user.role, 'admin');

  const users = await jsonRequest(platform.url, '/api/admin/users', { headers: authorization });
  const invitedUser = users.body.users.find((item) => item.email === 'future-admin@example.com');
  const ownerUser = users.body.users.find((item) => item.email === 'admin@example.com');
  assert.equal(Boolean(invitedUser), true);
  assert.equal(invitedUser.emailVerified, true);

  const deleteUser = await jsonRequest(platform.url, '/api/admin/users/delete', {
    method: 'POST',
    headers: authorization,
    body: JSON.stringify({ userId: invitedUser.id }),
  });
  assert.equal(deleteUser.status, 200);

  const deleteOwner = await jsonRequest(platform.url, '/api/admin/users/delete', {
    method: 'POST',
    headers: authorization,
    body: JSON.stringify({ userId: ownerUser.id }),
  });
  assert.equal(deleteOwner.status, 400);
});

test('admin account can read real events API usage and feedback', async (context) => {
  const platform = await startPlatform();
  context.after(async () => { await platform.close(); platform.database.close(); });
  await registerAndVerify(platform, { name: 'PathPilot Admin', email: 'admin@example.com', password: 'StrongPass123!' });
  const login = await jsonRequest(platform.url, '/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@example.com', password: 'StrongPass123!' }),
  });
  const authorization = { Authorization: `Bearer ${login.body.token}` };

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
  const feedback = await jsonRequest(platform.url, '/api/admin/feedback', { headers: authorization });
  assert.equal(summary.body.summary.totalUsers, 1);
  assert.equal(summary.body.summary.verifiedUsers, 1);
  assert.equal(summary.body.summary.totalUsage, 1);
  assert.equal(feedback.body.feedback[0].rating, 5);
});
