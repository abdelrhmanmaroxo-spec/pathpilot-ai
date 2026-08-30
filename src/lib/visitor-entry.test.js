import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('app entry emits one privacy-scoped visitor event without browser fingerprint fields', async () => {
  const source = await readFile(new URL('../App.jsx', import.meta.url), 'utf8');
  assert.match(source, /eventType:\s*'app_opened'/);
  assert.match(source, /route:\s*routeFromHash\(\) \|\| 'home'/);
  assert.match(source, /language:\s*getDocumentLanguage\(\)/);
  assert.match(source, /timezone:\s*currentTimezone\(\)/);
  assert.doesNotMatch(source, /canvas|fonts|hardwareConcurrency|deviceMemory|screen:/i);
});
