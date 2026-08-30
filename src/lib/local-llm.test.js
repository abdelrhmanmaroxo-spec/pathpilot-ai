import test from 'node:test';
import assert from 'node:assert/strict';
import { consumeLocalCompletionStream, localDeviceProfile, localModelCandidates, selectLocalModelId } from './local-llm.js';

const IDS = [
  'Qwen3-4B-q4f16_1-MLC',
  'Qwen3-1.7B-q4f16_1-MLC',
  'Qwen3.5-0.8B-q4f16_1-MLC',
  'Qwen3-0.6B-q4f16_1-MLC',
  'Llama-3.2-1B-Instruct-q4f16_1-MLC',
];

test('local device profile scales with available memory', () => {
  assert.equal(localDeviceProfile(4), 'lite');
  assert.equal(localDeviceProfile(8), 'strong');
  assert.equal(localDeviceProfile(16), 'expert');
});

test('expert devices prefer a materially larger local model', () => {
  assert.equal(selectLocalModelId(IDS, 16), 'Qwen3-4B-q4f16_1-MLC');
});

test('strong devices prefer 1.7B over tiny models', () => {
  assert.equal(selectLocalModelId(IDS, 8), 'Qwen3-1.7B-q4f16_1-MLC');
});

test('lite devices prioritize small models to reduce memory pressure', () => {
  assert.equal(selectLocalModelId(IDS, 4), 'Qwen3.5-0.8B-q4f16_1-MLC');
});

test('model selector falls back to compatible instruct models', () => {
  assert.equal(selectLocalModelId(['Tiny-1B-Instruct-q4f16_1-MLC'], 8), 'Tiny-1B-Instruct-q4f16_1-MLC');
});

test('expert model candidates degrade progressively instead of ending at one model', () => {
  const candidates = localModelCandidates(IDS, 16);
  assert.deepEqual(candidates.slice(0, 3), [
    'Qwen3-4B-q4f16_1-MLC',
    'Qwen3-1.7B-q4f16_1-MLC',
    'Qwen3.5-0.8B-q4f16_1-MLC',
  ]);
  assert.equal(new Set(candidates).size, candidates.length);
});

test('lite model candidates never start with the 4B model', () => {
  const candidates = localModelCandidates(IDS, 4);
  assert.equal(candidates[0], 'Qwen3.5-0.8B-q4f16_1-MLC');
  assert.notEqual(candidates[0], 'Qwen3-4B-q4f16_1-MLC');
});

async function* completionChunks(parts) {
  for (const content of parts) yield { choices: [{ delta: { content } }] };
}

test('local completion stream emits a cumulative live answer', async () => {
  const updates = [];
  const answer = await consumeLocalCompletionStream(completionChunks(['Path', 'Pilot ', 'is live.']), {
    onDelta: (delta, full) => updates.push({ delta, full }),
  });
  assert.equal(answer, 'PathPilot is live.');
  assert.deepEqual(updates.map((item) => item.full), ['Path', 'PathPilot ', 'PathPilot is live.']);
});

test('local completion stream never exposes hidden reasoning tags', async () => {
  const visible = [];
  const answer = await consumeLocalCompletionStream(completionChunks(['<think>private ', 'reasoning</think>', 'Final answer']), {
    onDelta: (_delta, full) => visible.push(full),
  });
  assert.equal(answer, 'Final answer');
  assert.deepEqual(visible, ['Final answer']);
});

test('local completion stream respects stop requests', async () => {
  const controller = new AbortController();
  const response = completionChunks(['First', ' second']);
  await assert.rejects(
    consumeLocalCompletionStream(response, {
      signal: controller.signal,
      onDelta: () => controller.abort(),
    }),
    { name: 'AbortError' },
  );
});
