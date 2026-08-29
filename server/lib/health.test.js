import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initializeDatabase } from './database.js';
import { createCachedHealthProbe, probeDeepHealth } from './health.js';

const env = {
  DATABASE_PATH: ':memory:',
  AI_API_KEY: 'gemini-key',
  AI_MODEL: 'gemini-test',
  AI_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/openai',
  TAVILY_API_KEY: 'tavily-key',
  EMAIL_PROVIDER: 'gmail-api',
  GMAIL_CLIENT_ID: 'client-id',
  GMAIL_CLIENT_SECRET: 'client-secret',
  GMAIL_REFRESH_TOKEN: 'refresh-token',
};

function healthyFetch(url) {
  const value = String(url);
  if (value.includes('oauth2.googleapis.com/token')) {
    return Promise.resolve(new Response(JSON.stringify({ access_token: 'token' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  }
  return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
}

test('deep health checks database, Gemini, Tavily and Gmail API', async () => {
  const database = initializeDatabase(':memory:');
  const health = await probeDeepHealth({ env, database, fetchImpl: healthyFetch });
  assert.equal(health.ok, true);
  assert.equal(health.services.database.ok, true);
  assert.equal(health.services.gemini.ok, true);
  assert.equal(health.services.tavily.ok, true);
  assert.equal(health.services.gmail.ok, true);
});

test('deep health cache avoids repeating provider calls inside the TTL', async () => {
  const database = initializeDatabase(':memory:');
  let calls = 0;
  const fetchImpl = async (url) => {
    calls += 1;
    return healthyFetch(url);
  };
  const getHealth = createCachedHealthProbe({ env, database, fetchImpl }, 60_000);
  const first = await getHealth();
  const firstCalls = calls;
  const second = await getHealth();
  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
  assert.equal(calls, firstCalls);
});
