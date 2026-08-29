import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeDatabase } from './database.js';
import { getSystemControl, listSecurityEvents, recordSecurityEvent, setSystemPaused } from './system-control.js';

test('emergency pause persists in the database', () => {
  const database = initializeDatabase(':memory:');
  assert.equal(getSystemControl(database).paused, false);
  const paused = setSystemPaused(database, { paused: true, reason: 'Incident response', updatedBy: 'admin-1' });
  assert.equal(paused.paused, true);
  assert.equal(paused.reason, 'Incident response');
  assert.equal(getSystemControl(database).updatedBy, 'admin-1');
  const resumed = setSystemPaused(database, { paused: false, reason: '', updatedBy: 'admin-1' });
  assert.equal(resumed.paused, false);
});

test('security events are recorded for admin review', () => {
  const database = initializeDatabase(':memory:');
  recordSecurityEvent(database, { eventType: 'UNSAFE_INPUT_BLOCKED', severity: 'high', ip: '203.0.113.9', path: '/api/research', details: 'SCRIPT_TAG' });
  const events = listSecurityEvents(database, 10);
  assert.equal(events.length, 1);
  assert.equal(events[0].event_type, 'UNSAFE_INPUT_BLOCKED');
  assert.equal(events[0].severity, 'high');
});
