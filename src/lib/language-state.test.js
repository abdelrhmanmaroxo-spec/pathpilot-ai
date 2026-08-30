import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  LANGUAGE_CHANGED_EVENT,
  getDocumentLanguage,
  normalizeLanguage,
  subscribeLanguageChanges,
} from './language-state.js';

test('language state normalizes document language safely', () => {
  assert.equal(normalizeLanguage('en'), 'en');
  assert.equal(normalizeLanguage('ar'), 'ar');
  assert.equal(normalizeLanguage('anything-else'), 'ar');
  assert.equal(getDocumentLanguage({ body: { dataset: { language: 'en' } } }), 'en');
  assert.equal(getDocumentLanguage({ body: { dataset: { language: 'ar' } } }), 'ar');
  assert.equal(getDocumentLanguage(null), 'ar');
});

test('language subscribers receive the latest document language and unsubscribe cleanly', () => {
  const target = new EventTarget();
  const documentRef = { body: { dataset: { language: 'ar' } } };
  const seen = [];
  const unsubscribe = subscribeLanguageChanges((language) => seen.push(language), target, documentRef);

  documentRef.body.dataset.language = 'en';
  target.dispatchEvent(new Event(LANGUAGE_CHANGED_EVENT));
  assert.deepEqual(seen, ['en']);

  unsubscribe();
  documentRef.body.dataset.language = 'ar';
  target.dispatchEvent(new Event(LANGUAGE_CHANGED_EVENT));
  assert.deepEqual(seen, ['en']);
});

test('chat consumes app-owned reactive language state without remounting', async () => {
  const [appSource, chatSource] = await Promise.all([
    readFile(new URL('../App.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../ChatWorkspace.jsx', import.meta.url), 'utf8'),
  ]);

  assert.match(appSource, /const \[language, setLanguage\] = useState\(getDocumentLanguage\);/);
  assert.match(appSource, /subscribeLanguageChanges\(setLanguage\)/);
  assert.match(appSource, /<ChatWorkspace preferences=\{preferences\} notify=\{setToast\} language=\{language\} \/>/);
  assert.match(appSource, /<ChatDevelopmentNotice language=\{language\} \/>/);
  assert.doesNotMatch(appSource, /key=\{[^}]*language/i);

  assert.match(chatSource, /export function ChatDevelopmentNotice\(\{ language \}\)/);
  assert.match(chatSource, /export default function ChatWorkspace\(\{ preferences, notify, language \}\)/);
  assert.doesNotMatch(chatSource, /document\.body\?\.dataset\?\.language/);
});
