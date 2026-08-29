import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const CATALOG_SOURCES = [
  { url: new URL('./i18n.js', import.meta.url), name: 'AR_TO_EN' },
  { url: new URL('./i18n-overrides.js', import.meta.url), name: 'EXTRA_AR_TO_EN' },
  { url: new URL('./i18n-runtime-hardening.js', import.meta.url), name: 'AR_TO_EN' },
];

const CRITICAL_UI_SOURCES = [
  new URL('../components/AppChrome.jsx', import.meta.url),
  new URL('../components/Landing.jsx', import.meta.url),
  new URL('../components/WorkspacePanels.jsx', import.meta.url),
  new URL('../components/PinnedPrompts.jsx', import.meta.url),
  new URL('../components/VoiceControls.jsx', import.meta.url),
];

async function loadObjectCatalog(sourceUrl, declarationName) {
  const source = await readFile(sourceUrl, 'utf8');
  const startMarker = `const ${declarationName} = {`;
  const start = source.indexOf(startMarker);

  assert.notEqual(start, -1, `${declarationName} catalog declaration must exist in ${sourceUrl.pathname}`);

  const objectStart = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  let objectEnd = -1;

  for (let index = objectStart; index < source.length; index += 1) {
    const character = source[index];

    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }

    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        objectEnd = index;
        break;
      }
    }
  }

  assert.notEqual(objectEnd, -1, `${declarationName} catalog must remain statically extractable in ${sourceUrl.pathname}`);
  const objectLiteral = source.slice(objectStart, objectEnd + 1);
  return Function(`"use strict"; return (${objectLiteral});`)();
}

async function loadTranslationCatalog() {
  const catalogs = await Promise.all(CATALOG_SOURCES.map(({ url, name }) => loadObjectCatalog(url, name)));
  return Object.assign({}, ...catalogs);
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

function extractCatalogBackedArabicLiterals(source) {
  const literals = new Set();

  for (const line of source.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;

    // Newer components can render explicit bilingual ternaries such as
    // `en ? 'English' : 'العربية'`. Those do not depend on the runtime catalog.
    if (line.includes('?') && line.includes(':')) continue;

    for (const literal of extractQuotedArabicLiterals(line)) literals.add(literal);
  }

  return [...literals].sort();
}

test('i18n catalogs keep every Arabic entry complete and reverse-safe', async () => {
  const catalog = await loadTranslationCatalog();
  const entries = Object.entries(catalog);

  assert.ok(entries.length >= 180, 'combined translation catalogs unexpectedly shrank below the established baseline');

  const englishToArabic = new Map();
  for (const [arabic, english] of entries) {
    assert.match(arabic, /[\u0600-\u06FF]/, `Arabic key must contain Arabic text: ${arabic}`);
    assert.equal(arabic.trim(), arabic, `Arabic key must not contain surrounding whitespace: ${arabic}`);
    assert.equal(typeof english, 'string', `English translation must be a string for: ${arabic}`);
    assert.ok(english.trim().length > 0, `English translation must not be empty for: ${arabic}`);
    assert.equal(english.trim(), english, `English translation must not contain surrounding whitespace: ${arabic}`);
    englishToArabic.set(english, arabic);
  }

  for (const [english, arabic] of englishToArabic) {
    assert.equal(catalog[arabic], english, `reverse translation target must remain a valid catalog entry: ${english}`);
  }

  assert.ok(englishToArabic.size >= 150, 'unique English translation coverage unexpectedly shrank below baseline');
});

test('critical Arabic-only UI literals are backed by the combined translation catalogs', async () => {
  const catalog = await loadTranslationCatalog();
  const sources = await Promise.all(CRITICAL_UI_SOURCES.map(async (url) => ({
    url,
    source: await readFile(url, 'utf8'),
  })));

  let checkedLiteralCount = 0;
  const missing = [];

  for (const { url, source } of sources) {
    const literals = extractCatalogBackedArabicLiterals(source);
    checkedLiteralCount += literals.length;

    for (const literal of literals) {
      if (!Object.hasOwn(catalog, literal)) missing.push(`${url.pathname.split('/').at(-1)}: ${literal}`);
    }
  }

  assert.ok(checkedLiteralCount >= 30, 'critical UI Arabic literal coverage unexpectedly found too few catalog-backed strings');
  assert.deepEqual(
    missing,
    [],
    `Critical UI contains Arabic-only quoted text without an English catalog entry:\n${missing.join('\n')}`,
  );
});
