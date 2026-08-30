import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./assistant-router.js', import.meta.url), 'utf8');

test('assistant router feeds the full context envelope into the conversational fast path', () => {
  assert.match(source, /contextualConversationalReply/);
  assert.match(source, /conversationalFastPath\(latestPrompt, agentEnabled, contextualPrompt\)/);
  assert.doesNotMatch(source, /localConversationalReply\(prompt\)/);
});
