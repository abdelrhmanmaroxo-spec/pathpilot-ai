import test from 'node:test';
import assert from 'node:assert/strict';
import { detectStrongUserGrammaticalGender, inferUserGrammaticalGender } from './conversation-grammar.js';

test('detects explicit Arabizi self-identification without using names or second-person wording', () => {
  assert.equal(detectStrongUserGrammaticalGender('ana bent'), 'female');
  assert.equal(detectStrongUserGrammaticalGender('ana walad'), 'male');
  assert.equal(detectStrongUserGrammaticalGender('enty bent'), null);
  assert.equal(detectStrongUserGrammaticalGender('esmaha sara'), null);
});

test('latest strong self-reference overrides older context', () => {
  assert.equal(inferUserGrammaticalGender({
    latestPrompt: 'انا عايزة اكمل',
    priorUserPrompts: ['انا عايز ابدأ'],
  }), 'female');
  assert.equal(inferUserGrammaticalGender({
    latestPrompt: 'ana walad',
    priorUserPrompts: ['انا بنت'],
  }), 'male');
});

test('ambiguous mixed signals remain neutral', () => {
  assert.equal(detectStrongUserGrammaticalGender('انا عايز وعايزة مساعدة'), null);
  assert.equal(inferUserGrammaticalGender({
    latestPrompt: 'انا عايزة وعايز افهم',
    priorUserPrompts: ['انا بنت'],
  }), 'female');
});
