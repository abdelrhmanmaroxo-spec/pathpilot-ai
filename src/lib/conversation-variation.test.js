import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearConversationVariationHistory,
  selectConversationVariant,
} from './conversation-variation.js';

function memoryStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

test('rotates through variants before repeating recent wording', () => {
  const storage = memoryStorage();
  clearConversationVariationHistory(storage);
  const variants = ['one', 'two', 'three'];
  const pick = () => selectConversationVariant({
    intent: 'greeting',
    language: 'en',
    variants,
    storage,
    random: () => 0,
  });

  assert.equal(pick(), 'one');
  assert.equal(pick(), 'two');
  assert.equal(pick(), 'three');
  assert.equal(pick(), 'one');
});

test('keeps variation history isolated by intent and language', () => {
  const storage = memoryStorage();
  clearConversationVariationHistory(storage);
  const variants = ['first', 'second'];

  assert.equal(selectConversationVariant({ intent: 'thanks', language: 'ar', variants, storage, random: () => 0 }), 'first');
  assert.equal(selectConversationVariant({ intent: 'thanks', language: 'ar', variants, storage, random: () => 0 }), 'second');
  assert.equal(selectConversationVariant({ intent: 'thanks', language: 'en', variants, storage, random: () => 0 }), 'first');
  assert.equal(selectConversationVariant({ intent: 'greeting', language: 'ar', variants, storage, random: () => 0 }), 'first');
});

test('recovers safely from corrupt or unavailable browser storage', () => {
  const corruptStorage = memoryStorage({ 'pathpilot.conversation.variants.v1': '{broken-json' });
  const answer = selectConversationVariant({
    intent: 'greeting',
    language: 'ar',
    variants: ['أهلًا', 'يا أهلا'],
    storage: corruptStorage,
    random: () => 0,
  });
  assert.equal(answer, 'أهلًا');

  const withoutStorage = selectConversationVariant({
    intent: 'greeting-fallback',
    language: 'ar',
    variants: ['أ', 'ب'],
    storage: null,
    random: () => 0,
  });
  assert.equal(withoutStorage, 'أ');
});
