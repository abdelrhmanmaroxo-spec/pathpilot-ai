import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const I18N_SOURCE_URL = new URL('./i18n.js', import.meta.url);
const APP_CHROME_SOURCE_URL = new URL('../components/AppChrome.jsx', import.meta.url);

async function loadTranslationCatalog() {
  const source = await readFile(I18N_SOURCE_URL, 'utf8');
  const startMarker = 'const AR_TO_EN = {';
  const endMarker = '\n};\n\nconst EN_TO_AR';
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);

  assert.notEqual(start, -1, 'AR_TO_EN catalog declaration must exist');
  assert.notEqual(end, -1, 'AR_TO_EN catalog must remain statically extractable for coverage checks');

  const objectLiteral = source.slice(start + 'const AR_TO_EN = '.length, end + 2);
  return Function(`"use strict"; return (${objectLiteral});`)();
}

function extractQuotedArabicLiterals(source) {
  const literals = new Set();
  const pattern = /'([^'\n]*[\u0600-\u06FF][^'\n]*)'|"([^"\n]*[\u0600-\u06FF][^"\n]*)"/g;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    const value = (match[1] ?? match[2] ?? '').trim();
    if (value) literals.add(value);
  }

  return [...literals].sort();
}

test('i18n catalog keeps every Arabic entry complete and reverse-safe', async () => {
  const catalog = await loadTranslationCatalog();
  const entries = Object.entries(catalog);

  assert.ok(entries.length >= 100, 'translation catalog unexpectedly shrank below the established baseline');

  const englishToArabic = new Map();
  for (const [arabic, english] of entries) {
    assert.match(arabic, /[\u0600-\u06FF]/, `Arabic key must contain Arabic text: ${arabic}`);
    assert.equal(arabic.trim(), arabic, `Arabic key must not contain surrounding whitespace: ${arabic}`);
    assert.equal(typeof english, 'string', `English translation must be a string for: ${arabic}`);
    assert.ok(english.trim().length > 0, `English translation must not be empty for: ${arabic}`);
    assert.equal(english.trim(), english, `English translation must not contain surrounding whitespace: ${arabic}`);

    // Multiple Arabic UI labels may intentionally share one English label (for example,
    // short and long variants of "Sign in"). The runtime reverse map deliberately keeps
    // the final alias, so coverage should verify that every English value resolves to a
    // valid source entry instead of requiring an artificial one-to-one vocabulary.
    englishToArabic.set(english, arabic);
  }

  for (const [english, arabic] of englishToArabic) {
    assert.equal(catalog[arabic], english, `reverse translation target must remain a valid catalog entry: ${english}`);
  }

  assert.ok(englishToArabic.size >= 90, 'unique English translation coverage unexpectedly shrank below baseline');
});

test('AppChrome quoted Arabic UI literals are backed by the translation catalog', async () => {
  const [catalog, source] = await Promise.all([
    loadTranslationCatalog(),
    readFile(APP_CHROME_SOURCE_URL, 'utf8'),
  ]);

  const literals = extractQuotedArabicLiterals(source);
  assert.ok(literals.length >= 10, 'AppChrome Arabic literal coverage unexpectedly found too few UI strings');

  const missing = literals.filter((literal) => !Object.hasOwn(catalog, literal));
  assert.deepEqual(
    missing,
    [],
    `AppChrome contains Arabic quoted UI text without an English catalog entry: ${missing.join(' | ')}`,
  );
});
