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

test('keeps per-intent history isolated while sharing only wording freshness by language', () => {
  const storage = memoryStorage();
  clearConversationVariationHistory(storage);
  const variants = ['first', 'second'];

  assert.equal(selectConversationVariant({ intent: 'thanks', language: 'ar', variants, storage, random: () => 0 }), 'first');
  assert.equal(selectConversationVariant({ intent: 'thanks', language: 'ar', variants, storage, random: () => 0 }), 'second');
  assert.equal(selectConversationVariant({ intent: 'thanks', language: 'en', variants, storage, random: () => 0 }), 'first');
  assert.equal(selectConversationVariant({ intent: 'greeting', language: 'ar', variants, storage, random: () => 0 }), 'first');
});

test('avoids near-duplicate wording across different intents when another fresh option exists', () => {
  const storage = memoryStorage();
  clearConversationVariationHistory(storage);

  assert.equal(selectConversationVariant({
    intent: 'acknowledgement',
    language: 'ar',
    variants: ['تمام هات اللي بعده ونكمل', 'وصلت نكمل'],
    storage,
    random: () => 0,
  }), 'تمام هات اللي بعده ونكمل');

  assert.equal(selectConversationVariant({
    intent: 'thanks',
    language: 'ar',
    variants: ['تسلم هات اللي بعده ونكمل', 'العفو يا معلم تحت امرك'],
    storage,
    random: () => 0,
  }), 'العفو يا معلم تحت امرك');
});

test('does not let Arabic global freshness suppress English variants', () => {
  const storage = memoryStorage();
  clearConversationVariationHistory(storage);

  selectConversationVariant({
    intent: 'greeting',
    language: 'ar',
    variants: ['hello there friend'],
    storage,
    random: () => 0,
  });

  assert.equal(selectConversationVariant({
    intent: 'greeting',
    language: 'en',
    variants: ['hello there friend', 'ready to go'],
    storage,
    random: () => 0,
  }), 'hello there friend');
});

test('records singleton replies in global freshness without breaking their required fallback', () => {
  const storage = memoryStorage();
  clearConversationVariationHistory(storage);

  assert.equal(selectConversationVariant({
    intent: 'singleton',
    language: 'en',
    variants: ['Send the next thing when ready'],
    storage,
    random: () => 0,
  }), 'Send the next thing when ready');

  assert.equal(selectConversationVariant({
    intent: 'other',
    language: 'en',
    variants: ['Send the next thing when ready', 'I am here when you need me'],
    storage,
    random: () => 0,
  }), 'I am here when you need me');
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
