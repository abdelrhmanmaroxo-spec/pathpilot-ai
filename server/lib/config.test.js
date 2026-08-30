import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertRuntimeConfig, inspectRuntimeConfig } from './config.js';

test('gmail api email readiness is recognized without Resend', () => {
  const report = inspectRuntimeConfig({
    NODE_ENV: 'production',
    PORT: '8787',
    DATABASE_PATH: '/data/pathpilot.sqlite',
    ALLOWED_ORIGINS: 'https://example.com',
    EMAIL_PROVIDER: 'gmail-api',
    EMAIL_FROM: 'PathPilot <pathpilot@example.com>',
    GMAIL_CLIENT_ID: 'id',
    GMAIL_CLIENT_SECRET: 'secret',
    GMAIL_REFRESH_TOKEN: 'refresh',
    AI_API_KEY: 'key',
    AI_MODEL: 'model',
    TAVILY_API_KEY: 'search',
    OWNER_EMAIL: 'owner@example.com',
  });

  assert.equal(report.ok, true);
  assert.equal(report.features.email, true);
  assert.equal(report.features.emailProvider, 'gmail-api');
  assert.equal(report.features.ai, true);
  assert.equal(report.features.research, true);
  assert.equal(report.features.persistentDatabase, true);
});

test('production requires a persistent database path and allowed origin', () => {
  const report = inspectRuntimeConfig({ NODE_ENV: 'production', PORT: '8787' });
  assert.equal(report.ok, false);
  assert.ok(report.errors.includes('DATABASE_PATH_REQUIRED_IN_PRODUCTION'));
  assert.ok(report.errors.includes('ALLOWED_ORIGINS_REQUIRED_IN_PRODUCTION'));
  assert.throws(() => assertRuntimeConfig({ NODE_ENV: 'production', PORT: '8787' }), /INVALID_RUNTIME_CONFIG/);
});

test('production rejects an in-memory database to protect persistent data', () => {
  const env = {
    NODE_ENV: 'production',
    PORT: '8787',
    DATABASE_PATH: ':memory:',
    ALLOWED_ORIGINS: 'https://example.com',
  };
  const report = inspectRuntimeConfig(env);

  assert.equal(report.ok, false);
  assert.equal(report.features.persistentDatabase, false);
  assert.ok(report.errors.includes('DATABASE_PATH_MUST_BE_PERSISTENT_IN_PRODUCTION'));
  assert.throws(() => assertRuntimeConfig(env), /DATABASE_PATH_MUST_BE_PERSISTENT_IN_PRODUCTION/);
});

test('Railway runtime also rejects an in-memory database even without NODE_ENV', () => {
  const report = inspectRuntimeConfig({
    RAILWAY_ENVIRONMENT: 'production',
    PORT: '8787',
    DATABASE_PATH: ':memory:',
    ALLOWED_ORIGINS: 'https://example.com',
  });

  assert.equal(report.ok, false);
  assert.ok(report.errors.includes('DATABASE_PATH_MUST_BE_PERSISTENT_IN_PRODUCTION'));
});

test('development keeps optional providers as warnings instead of startup failures', () => {
  const report = inspectRuntimeConfig({ PORT: '8787', DATABASE_PATH: ':memory:' });
  assert.equal(report.ok, true);
  assert.equal(report.features.persistentDatabase, false);
  assert.ok(report.warnings.includes('TAVILY_NOT_CONFIGURED'));
  assert.ok(report.warnings.includes('GOOGLE_SIGN_IN_NOT_CONFIGURED'));
});
