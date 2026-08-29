import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const I18N_SOURCE_URL = new URL('./i18n.js', import.meta.url);

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

test('i18n catalog keeps every Arabic entry complete and reversible', async () => {
  const catalog = await loadTranslationCatalog();
  const entries = Object.entries(catalog);

  assert.ok(entries.length >= 100, 'translation catalog unexpectedly shrank below the established baseline');

  const seenEnglish = new Map();
  for (const [arabic, english] of entries) {
    assert.match(arabic, /[\u0600-\u06FF]/, `Arabic key must contain Arabic text: ${arabic}`);
    assert.equal(arabic.trim(), arabic, `Arabic key must not contain surrounding whitespace: ${arabic}`);
    assert.equal(typeof english, 'string', `English translation must be a string for: ${arabic}`);
    assert.ok(english.trim().length > 0, `English translation must not be empty for: ${arabic}`);
    assert.equal(english.trim(), english, `English translation must not contain surrounding whitespace: ${arabic}`);

    const previousArabic = seenEnglish.get(english);
    assert.equal(
      previousArabic,
      undefined,
      `English translation must be unique so EN_TO_AR remains reversible: "${english}" maps from both "${previousArabic}" and "${arabic}"`,
    );
    seenEnglish.set(english, arabic);
  }

  assert.equal(seenEnglish.size, entries.length, 'reverse translation must preserve every catalog entry');
});
