import test from 'node:test';
import assert from 'node:assert/strict';
import { localDeviceProfile, selectLocalModelId } from './local-llm.js';

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
