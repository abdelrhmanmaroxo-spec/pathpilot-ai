import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const entryUrl = new URL('../AdminDashboard.jsx', import.meta.url);
const viewUrl = new URL('./AdminDashboardView.jsx', import.meta.url);

test('admin dashboard entry stays focused on access gating and composition', async () => {
  const [entrySource, viewSource] = await Promise.all([
    readFile(entryUrl, 'utf8'),
    readFile(viewUrl, 'utf8'),
  ]);

  assert.match(entrySource, /useAdminDashboardController/);
  assert.match(entrySource, /AdminDashboardView/);
  assert.doesNotMatch(entrySource, /AdminUsers|AdminSecurity|AdminAnalytics|AdminOwnerLog/);

  assert.match(viewSource, /AdminUsers/);
  assert.match(viewSource, /AdminSecurity/);
  assert.match(viewSource, /AdminAnalytics/);
  assert.match(viewSource, /AdminOwnerLog/);
});
