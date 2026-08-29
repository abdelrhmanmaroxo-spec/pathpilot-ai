import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildProviderRequest, extractProviderText } from './lib/ai-provider.js';
import { createSessionToken, hashPassword, hashToken, normalizeEmail, verifyPassword } from './lib/auth.js';
import {
  createFeedback,
  createSession,
  createUser,
  deleteSession,
  findUserByEmail,
  getAdminSummary,
  getSessionUser,
  initializeDatabase,
  listAiRequests,
  listErrors,
  listFeedback,
  listUsers,
  trackAiRequest,
  trackClientError,
  trackEvent,
} from './lib/database.js';

const VALID_MODES = new Set(['general', 'study', 'work']);

function getBearerToken(request) {
  const header = request.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 100_000) throw new Error('REQUEST_TOO_LARGE');
  }
  return JSON.parse(body || '{}');
}

export function createPathPilotServer({ env = process.env, database = initializeDatabase() } = {}) {
  const apiKey = env.AI_API_KEY || '';
  const model = env.AI_MODEL || '';
  const apiMode = env.AI_API_MODE === 'responses' ? 'responses' : 'chat-completions';
  const baseUrl = (env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const provider = env.AI_PROVIDER || (baseUrl.includes('openai.com') ? 'OpenAI' : baseUrl.includes('googleapis.com') ? 'Gemini' : baseUrl.includes('anthropic.com') ? 'Claude' : 'Compatible API');
  const endpoint = env.AI_ENDPOINT || `${baseUrl}/${apiMode === 'responses' ? 'responses' : 'chat/completions'}`;
  const reasoningEffort = env.AI_REASONING_EFFORT || '';
  const allowedOrigins = new Set((env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map((item) => item.trim()).filter(Boolean));
  const adminEmail = normalizeEmail(env.ADMIN_EMAIL);
  const aiConfigured = Boolean(apiKey && model);
  const rateLimits = new Map();

  function corsHeaders(origin) {
    const allowed = origin && allowedOrigins.has(origin) ? origin : '';
    return {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...(allowed ? { 'Access-Control-Allow-Origin': allowed } : {}),
      Vary: 'Origin',
    };
  }

  function sendJson(response, status, body, origin = '') {
    response.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      ...corsHeaders(origin),
    });
    response.end(JSON.stringify(body));
  }

  function checkRateLimit(request, limit = 60) {
    const key = `${request.socket.remoteAddress || 'unknown'}:${request.url}`;
    const minute = Math.floor(Date.now() / 60_000);
    const record = rateLimits.get(key);
    if (!record || record.minute !== minute) {
      rateLimits.set(key, { minute, count: 1 });
      return true;
    }
    record.count += 1;
    return record.count <= limit;
  }

  function currentUser(request) {
    const token = getBearerToken(request);
    return token ? getSessionUser(database, hashToken(token)) : null;
  }

  function requireAdmin(request, response, origin) {
    const user = currentUser(request);
    if (!user || user.role !== 'admin') {
      sendJson(response, 403, { error: 'Admin access required.' }, origin);
      return null;
    }
    return user;
  }

  async function handle(request, response) {
    const origin = request.headers.origin || '';
    if (origin && !allowedOrigins.has(origin)) return sendJson(response, 403, { error: 'Origin not allowed.' });
    if (request.method === 'OPTIONS') {
      response.writeHead(204, corsHeaders(origin));
      response.end();
      return;
    }
    if (!checkRateLimit(request, request.url === '/api/assistant' ? 30 : 90)) {
      return sendJson(response, 429, { error: 'Too many requests. Try again shortly.' }, origin);
    }

    if (request.method === 'GET' && ['/health', '/api/status'].includes(request.url)) {
      return sendJson(response, 200, { ok: true, apiOnline: aiConfigured, apiMode, provider, model: aiConfigured ? model : null, databaseOnline: true }, origin);
    }

    if (request.method === 'POST' && request.url === '/api/auth/register') {
      try {
        const body = await readJson(request);
        const name = String(body.name || '').trim().slice(0, 60);
        const email = normalizeEmail(body.email);
        if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email)) return sendJson(response, 400, { error: 'Name or email is invalid.' }, origin);
        if (findUserByEmail(database, email)) return sendJson(response, 409, { error: 'An account already exists for this email.' }, origin);
        const passwordHash = await hashPassword(body.password);
        const role = adminEmail && email === adminEmail ? 'admin' : 'user';
        const user = createUser(database, { name, email, passwordHash, role });
        const token = createSessionToken();
        createSession(database, { tokenHash: hashToken(token), userId: user.id });
        trackEvent(database, { userId: user.id, eventType: 'account_created' });
        return sendJson(response, 201, { token, user }, origin);
      } catch (error) {
        return sendJson(response, 400, { error: error.message === 'PASSWORD_LENGTH' ? 'Password must be 8–128 characters.' : 'Could not create the account.' }, origin);
      }
    }

    if (request.method === 'POST' && request.url === '/api/auth/login') {
      const body = await readJson(request);
      const userRecord = findUserByEmail(database, normalizeEmail(body.email));
      if (!userRecord || userRecord.disabled || !(await verifyPassword(body.password, userRecord.password_hash))) {
        return sendJson(response, 401, { error: 'Email or password is incorrect.' }, origin);
      }
      const token = createSessionToken();
      createSession(database, { tokenHash: hashToken(token), userId: userRecord.id });
      trackEvent(database, { userId: userRecord.id, eventType: 'login' });
      return sendJson(response, 200, { token, user: { id: userRecord.id, name: userRecord.name, email: userRecord.email, role: userRecord.role } }, origin);
    }

    if (request.method === 'GET' && request.url === '/api/auth/me') {
      const user = currentUser(request);
      return user ? sendJson(response, 200, { user }, origin) : sendJson(response, 401, { error: 'Not signed in.' }, origin);
    }

    if (request.method === 'POST' && request.url === '/api/auth/logout') {
      const token = getBearerToken(request);
      if (token) deleteSession(database, hashToken(token));
      return sendJson(response, 200, { ok: true }, origin);
    }

    if (request.method === 'POST' && request.url === '/api/events') {
      const body = await readJson(request);
      const user = currentUser(request);
      trackEvent(database, {
        userId: user?.id || null,
        anonymousId: String(body.anonymousId || '').slice(0, 80) || null,
        eventType: String(body.eventType || 'unknown').slice(0, 60),
        workspace: VALID_MODES.has(body.workspace) ? body.workspace : null,
        tool: String(body.tool || '').slice(0, 60) || null,
        metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : null,
      });
      return sendJson(response, 202, { ok: true }, origin);
    }

    if (request.method === 'POST' && request.url === '/api/feedback') {
      const body = await readJson(request);
      const user = currentUser(request);
      const rating = Number(body.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) return sendJson(response, 400, { error: 'Rating must be from 1 to 5.' }, origin);
      createFeedback(database, { userId: user?.id || null, rating, message: String(body.message || '').slice(0, 2000), workspace: body.workspace, tool: body.tool });
      return sendJson(response, 201, { ok: true }, origin);
    }

    if (request.method === 'POST' && request.url === '/api/client-errors') {
      const body = await readJson(request);
      const user = currentUser(request);
      trackClientError(database, { userId: user?.id || null, message: String(body.message || 'Unknown error').slice(0, 1000), context: String(body.context || '').slice(0, 2000) });
      return sendJson(response, 202, { ok: true }, origin);
    }

    if (request.method === 'GET' && request.url === '/api/admin/summary') {
      if (!requireAdmin(request, response, origin)) return;
      return sendJson(response, 200, { summary: getAdminSummary(database, aiConfigured) }, origin);
    }
    if (request.method === 'GET' && request.url === '/api/admin/users') {
      if (!requireAdmin(request, response, origin)) return;
      return sendJson(response, 200, { users: listUsers(database) }, origin);
    }
    if (request.method === 'GET' && request.url === '/api/admin/api-usage') {
      if (!requireAdmin(request, response, origin)) return;
      return sendJson(response, 200, { requests: listAiRequests(database) }, origin);
    }
    if (request.method === 'GET' && request.url === '/api/admin/errors') {
      if (!requireAdmin(request, response, origin)) return;
      return sendJson(response, 200, { errors: listErrors(database) }, origin);
    }
    if (request.method === 'GET' && request.url === '/api/admin/feedback') {
      if (!requireAdmin(request, response, origin)) return;
      return sendJson(response, 200, { feedback: listFeedback(database) }, origin);
    }

    if (request.method === 'POST' && request.url === '/api/assistant') {
      if (!aiConfigured) return sendJson(response, 503, { error: 'Live AI is not configured. The frontend will continue using Smart Demo mode.' }, origin);
      const startedAt = Date.now();
      const user = currentUser(request);
      let mode = 'general';
      let tool = 'ask';
      try {
        const body = await readJson(request);
        const prompt = String(body.prompt || '').trim();
        mode = VALID_MODES.has(body.mode) ? body.mode : 'general';
        tool = String(body.tool || 'ask').slice(0, 60);
        if (prompt.length < 2 || prompt.length > 12_000) return sendJson(response, 400, { error: 'Prompt length is invalid.' }, origin);
        const providerResponse = await fetch(endpoint, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(buildProviderRequest({ apiMode, model, prompt, mode, tool, preferences: body.preferences || {}, reasoningEffort })),
          signal: AbortSignal.timeout(60_000),
        });
        const providerPayload = await providerResponse.json();
        if (!providerResponse.ok) throw new Error(`PROVIDER_${providerResponse.status}`);
        const answer = extractProviderText(providerPayload, apiMode);
        if (!answer) throw new Error('EMPTY_RESPONSE');
        trackAiRequest(database, { userId: user?.id || null, workspace: mode, tool, model, status: 'success', latencyMs: Date.now() - startedAt });
        trackEvent(database, { userId: user?.id || null, eventType: 'tool_request', workspace: mode, tool, metadata: { source: 'live' } });
        return sendJson(response, 200, { answer }, origin);
      } catch (error) {
        trackAiRequest(database, { userId: user?.id || null, workspace: mode, tool, model, status: 'error', latencyMs: Date.now() - startedAt, errorCode: error.message.slice(0, 80) });
        return sendJson(response, 502, { error: 'The AI provider could not complete the request.' }, origin);
      }
    }

    return sendJson(response, 404, { error: 'Not found.' }, origin);
  }

  const safeHandle = async (request, response) => {
    try {
      await handle(request, response);
    } catch {
      if (!response.headersSent) sendJson(response, 400, { error: 'Invalid request.' }, request.headers.origin || '');
      else response.end();
    }
  };

  return { handle: safeHandle, database, aiConfigured };
}

if (process.argv[1]?.endsWith('server/index.js')) {
  const databasePath = process.env.DATABASE_PATH || 'server/data/pathpilot.sqlite';
  if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true });
  const app = createPathPilotServer({ database: initializeDatabase(databasePath) });
  const port = Number(process.env.PORT || 8787);
  createServer(app.handle).listen(port, () => console.log(`PathPilot platform listening on port ${port}`));
}
