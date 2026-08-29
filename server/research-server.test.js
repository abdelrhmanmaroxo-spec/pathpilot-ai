import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createPathPilotServer } from './index.js';
import { createResearchHandler } from './research-server.js';
import { initializeDatabase } from './lib/database.js';

async function startServer() {
  const database = initializeDatabase();
  const env = {
    ALLOWED_ORIGINS: 'http://localhost:5173',
    OWNER_EMAIL: 'owner@example.com',
  };
  const baseApp = createPathPilotServer({ database, env });
  const handler = createResearchHandler({ baseApp, database, env });
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    database,
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

test('production research server boots and exposes health/status routes', async (context) => {
  const app = await startServer();
  context.after(async () => { await app.close(); app.database.close(); });

  const health = await fetch(`${app.url}/health`);
  assert.equal(health.status, 200);
  const healthBody = await health.json();
  assert.equal(healthBody.databaseOnline, true);

  const research = await fetch(`${app.url}/api/research/status`);
  assert.equal(research.status, 200);
  const researchBody = await research.json();
  assert.equal(researchBody.researchAvailable, false);
  assert.equal(researchBody.appliesToAllTools, true);
});

test('security guard blocks common secret-scanning paths', async (context) => {
  const app = await startServer();
  context.after(async () => { await app.close(); app.database.close(); });

  const response = await fetch(`${app.url}/.env`);
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
});
