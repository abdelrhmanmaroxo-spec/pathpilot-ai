import assert from 'node:assert/strict';
import test from 'node:test';
import { translateRuntimeText } from './i18n-runtime-hardening.js';

test('short translation entries never corrupt larger English words', () => {
  const translated = translateRuntimeText('Universal Workspace · Bug Reports or QA', 'ar');
  assert.equal(translated, 'Universal Workspace · Bug Reports أو QA');
  assert.doesNotMatch(translated, /Wأوkspace|Repأوts/);
});

test('short standalone entries still translate in both languages', () => {
  assert.equal(translateRuntimeText('خيار أول أو خيار ثان', 'en'), 'خيار أول or خيار ثان');
  assert.equal(translateRuntimeText('Study or Work', 'ar'), 'Study أو Work');
});

test('catalog words never replace matching letters inside Arabic words', () => {
  assert.equal(translateRuntimeText('الحسابات المحظورة وبيانات الحساب', 'en'), 'الحسابات المحظورة وبيانات الحساب');
  assert.equal(translateRuntimeText('حساب', 'en'), 'Account');
  assert.equal(translateRuntimeText('Account', 'ar'), 'حساب');
});
