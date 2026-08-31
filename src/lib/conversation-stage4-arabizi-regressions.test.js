import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectConversationLanguage,
  detectConversationalArchetype,
  normalizeConversationText,
} from './conversation-intent.js';

test('normalizes mixed-case and whitespace-heavy Egyptian Arabizi variants', () => {
  assert.equal(normalizeConversationText('  MMKN   TSA3DNI?  '), 'mmkn tsa3dni');
  assert.equal(normalizeConversationText('momken msa3da'), 'ممكن مساعده');
  assert.equal(normalizeConversationText('FEHM   3ARFA'), 'فاهم عارفه');
  assert.equal(normalizeConversationText('msh   fahma'), 'مش فاهمه');
});

test('keeps Arabizi self-state variants in Arabic mode without inventing intent', () => {
  assert.equal(detectConversationLanguage('3arfa'), 'ar');
  assert.equal(detectConversationLanguage('msh fahma'), 'ar');
  assert.equal(detectConversationalArchetype('msh fahma')?.intent, 'confusion');
  assert.equal(detectConversationalArchetype('msh fahma', { hasPriorContext: true }), null);
});

test('does not let Arabizi social cues swallow substantive mixed-language work', () => {
  for (const prompt of [
    'momken tsa3dni debug this API',
    'shokran bas explain OAuth',
    'tmam kml el shar7',
  ]) {
    assert.equal(detectConversationalArchetype(prompt), null, prompt);
  }
});
