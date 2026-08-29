import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createPathPilotServer } from './index.js';
import { createIntelligenceV3Handler } from './intelligence-v3-server.js';
import { hashToken } from './lib/auth.js';
import { assertRuntimeConfig, logRuntimeConfig } from './lib/config.js';
import { getSessionUser, initializeDatabase } from './lib/database.js';
import { createCachedHealthProbe } from './lib/health.js';
import { installProviderResilience } from './lib/provider-resilience.js';
import { attachRequestContext } from './lib/request-context.js';

function bearerToken(request) {
  const header = String(request.headers.authorization || '');
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function healthCors(request, env) {
  const origin = String(request.headers.origin || '');
  const allowed = new Set(String(env.ALLOWED_ORIGINS || '').split(',').map((item) => item.trim()).filter(Boolean));
  return {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Expose-Headers': 'X-Request-ID',
    ...(origin && allowed.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    Vary: 'Origin',
  };
}

export function startPathPilotServer({ env = process.env, logger = console } = {}) {
  const config = assertRuntimeConfig(env);
  logRuntimeConfig(config, logger);
  installProviderResilience({
    logger,
    options: {
      maxConcurrency: Math.max(1, Number(env.PROVIDER_MAX_CONCURRENCY || 4)),
      failureThreshold: Math.max(1, Number(env.PROVIDER_FAILURE_THRESHOLD || 3)),
      cooldownMs: Math.max(5_000, Number(env.PROVIDER_COOLDOWN_MS || 30_000)),
      maxRetries: Math.max(0, Math.min(3, Number(env.PROVIDER_MAX_RETRIES || 2))),
    },
  });

  const databasePath = env.DATABASE_PATH || 'server/data/pathpilot.sqlite';
  if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true });

  const database = initializeDatabase(databasePath);
  const baseApp = createPathPilotServer({ env, database });
  const appHandler = createIntelligenceV3Handler({ env, baseApp, database });
  const deepHealth = createCachedHealthProbe({ env, database });
  const port = Number(env.PORT || 8787);

  const server = createServer((request, response) => {
    const requestId = attachRequestContext(request, response);
    const url = new URL(request.url || '/', 'http://localhost');

    if (url.pathname === '/api/admin/health/deep') {
      const cors = healthCors(request, env);
      if (request.method === 'OPTIONS') {
        response.writeHead(204, cors);
        response.end();
        return;
      }
      if (request.method !== 'GET') {
        response.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8', ...cors });
        response.end(JSON.stringify({ error: 'Method not allowed.', code: 'METHOD_NOT_ALLOWED', requestId }));
        return;
      }
      const token = bearerToken(request);
      const user = token ? getSessionUser(database, hashToken(token)) : null;
      if (!user || user.role !== 'admin' || user.disabled) {
        response.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors });
        response.end(JSON.stringify({ error: 'Admin access required.', code: 'ADMIN_REQUIRED', requestId }));
        return;
      }
      Promise.resolve(deepHealth({ force: url.searchParams.get('force') === '1' }))
        .then((health) => {
          response.writeHead(health.ok ? 200 : 503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors });
          response.end(JSON.stringify({ ...health, requestId }));
        })
        .catch((error) => {
          logger.error?.(`[PathPilot health ${requestId}]`, error);
          response.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors });
          response.end(JSON.stringify({ error: 'Deep health check failed.', code: 'HEALTH_CHECK_FAILED', requestId }));
        });
      return;
    }

    Promise.resolve(appHandler(request, response)).catch((error) => {
      logger.error?.(`[PathPilot request ${requestId}]`, error);
      if (response.headersSent) {
        response.destroy(error);
        return;
      }
      response.writeHead(500, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Request-ID': requestId,
        'Access-Control-Expose-Headers': 'X-Request-ID',
      });
      response.end(JSON.stringify({ error: 'Internal server error.', code: 'INTERNAL_ERROR', requestId }));
    });
  });

  server.requestTimeout = 65_000;
  server.headersTimeout = 15_000;
  server.keepAliveTimeout = 5_000;
  server.listen(port, '0.0.0.0', () => logger.info?.(`PathPilot production server listening on port ${port}`));

  return { server, database, config };
}

if (process.argv[1]?.endsWith('server/start.js')) {
  startPathPilotServer();
}
