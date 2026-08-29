import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createPathPilotServer } from './index.js';
import { createIntelligenceV3Handler } from './intelligence-v3-server.js';
import { assertRuntimeConfig, logRuntimeConfig } from './lib/config.js';
import { initializeDatabase } from './lib/database.js';
import { attachRequestContext } from './lib/request-context.js';

export function startPathPilotServer({ env = process.env, logger = console } = {}) {
  const config = assertRuntimeConfig(env);
  logRuntimeConfig(config, logger);

  const databasePath = env.DATABASE_PATH || 'server/data/pathpilot.sqlite';
  if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true });

  const database = initializeDatabase(databasePath);
  const baseApp = createPathPilotServer({ env, database });
  const appHandler = createIntelligenceV3Handler({ env, baseApp, database });
  const port = Number(env.PORT || 8787);

  const server = createServer((request, response) => {
    const requestId = attachRequestContext(request, response);
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
