import test from 'node:test';
import assert from 'node:assert/strict';
import { extractProviderStreamDelta, iterateProviderTextDeltas } from './provider-stream.js';

function streamFromText(text, splitAt = []) {
  const encoder = new TextEncoder();
  const points = [0, ...splitAt.filter((value) => value > 0 && value < text.length), text.length];
  return new ReadableStream({
    start(controller) {
      for (let index = 0; index < points.length - 1; index += 1) {
        controller.enqueue(encoder.encode(text.slice(points[index], points[index + 1])));
      }
      controller.close();
    },
  });
}

test('extracts only visible chat-completion content deltas', () => {
  assert.equal(extractProviderStreamDelta({ choices: [{ delta: { content: 'مرحبا' } }] }, 'chat-completions'), 'مرحبا');
  assert.equal(extractProviderStreamDelta({ choices: [{ delta: { reasoning_content: 'hidden' } }] }, 'chat-completions'), '');
});

test('extracts Responses API output text without exposing other event types', () => {
  assert.equal(extractProviderStreamDelta({ type: 'response.output_text.delta', delta: 'Hello' }, 'responses'), 'Hello');
  assert.equal(extractProviderStreamDelta({ type: 'response.reasoning.delta', delta: 'hidden' }, 'responses'), '');
});

test('parses SSE events correctly when network chunks split JSON boundaries', async () => {
  const text = [
    'data: {"choices":[{"delta":{"content":"أهلا "}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"بيك"}}]}\n\n',
    'data: [DONE]\n\n',
  ].join('');
  const chunks = [];
  for await (const delta of iterateProviderTextDeltas(streamFromText(text, [7, 29, 63]), { apiMode: 'chat-completions' })) {
    chunks.push(delta);
  }
  assert.deepEqual(chunks, ['أهلا ', 'بيك']);
});
