import test from 'node:test';
import assert from 'node:assert/strict';
import { createFeedback, createUser, getAdminSummary, initializeDatabase, trackEvent } from './database.js';

test('database stores real users, usage, and feedback for admin analytics', () => {
  const database = initializeDatabase();
  createUser(database, { name: 'Test User', email: 'test@example.com', passwordHash: 'salt:hash' });
  trackEvent(database, { eventType: 'tool_request', workspace: 'general', tool: 'ask' });
  createFeedback(database, { rating: 5, message: 'Useful', workspace: 'general', tool: 'ask' });
  const summary = getAdminSummary(database, false);
  assert.equal(summary.totalUsers, 1);
  assert.equal(summary.usage.general, 1);
  assert.equal(summary.feedback, 1);
  assert.equal(summary.apiOnline, false);
  database.close();
});
