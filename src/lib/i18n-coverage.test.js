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
  new URL('../ChatWorkspace.jsx', import.meta.url),
  new URL('../components/ConversationThread.jsx', import.meta.url),
  new URL('../AccountExperience.jsx', import.meta.url),
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
  let quote = '';
  let current = '';
  let escaped = false;

  for (const character of source) {
    if (!quote) {
      if (character === "'" || character === '"') {
        quote = character;
        current = '';
      }
      continue;
    }

    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }
    if (character === '\\') {
      current += character;
      escaped = true;
      continue;
    }
    if (character === quote) {
      const value = current.trim();
      if (/[\u0600-\u06FF]/.test(value)) literals.add(value);
      quote = '';
      current = '';
      continue;
    }
    current += character;
  }

  return [...literals].sort();
}

function extractJsxArabicText(source) {
  const literals = new Set();
  const pattern = />([^<>]*[\u0600-\u06FF][^<>]*)</g;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    const value = match[1].trim();
    if (!value || value.includes('{') || value.includes('}')) continue;
    literals.add(value);
  }

  return [...literals].sort();
}

function stripExplicitBilingualTernaries(line) {
  return line.replace(
    /\?\s*(['"])(.*?)\1\s*:\s*(['"])(.*?)\3/g,
    (match, _leftQuote, left, _rightQuote, right) => {
      const leftArabic = /[\u0600-\u06FF]/.test(left);
      const rightArabic = /[\u0600-\u06FF]/.test(right);
      const leftLatin = /[A-Za-z]/.test(left);
      const rightLatin = /[A-Za-z]/.test(right);
      const isBilingualPair = (leftArabic && rightLatin) || (rightArabic && leftLatin);
      return isBilingualPair ? '? __BILINGUAL__ : __BILINGUAL__' : match;
    },
  );
}

function extractCatalogBackedArabicLiterals(source) {
  const literals = new Set();

  for (const line of source.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;

    // Newer components may render an explicit bilingual ternary such as
    // `en ? 'English' : 'العربية'`. Strip only that exact pair rather than
    // skipping the entire line, so unrelated Arabic-only UI copy on the same
    // line is still required to exist in the runtime translation catalog.
    const catalogBackedLine = stripExplicitBilingualTernaries(line);

    for (const literal of extractQuotedArabicLiterals(catalogBackedLine)) literals.add(literal);
    for (const literal of extractJsxArabicText(catalogBackedLine)) literals.add(literal);
  }

  return [...literals].sort();
}

test('bilingual ternary filtering ignores only the paired translation', () => {
  assert.deepEqual(
    extractCatalogBackedArabicLiterals("const label = en ? 'Settings' : 'الإعدادات';"),
    [],
  );
  assert.deepEqual(
    extractCatalogBackedArabicLiterals("const label = en ? 'Settings' : 'الإعدادات'; const title = 'عنوان ناقص';"),
    ['عنوان ناقص'],
  );
  assert.deepEqual(
    extractCatalogBackedArabicLiterals("const label = ready ? 'جاهز' : 'غير جاهز';"),
    ['جاهز', 'غير جاهز'],
  );
});

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

  // Keep a modest floor so the guard cannot silently become a no-op after future
  // component refactors. The exact count is intentionally not coupled to UI copy.
  assert.ok(checkedLiteralCount >= 10, 'critical UI Arabic literal coverage unexpectedly found too few catalog-backed strings');
  assert.deepEqual(
    missing,
    [],
    `Critical UI contains Arabic-only text without an English catalog entry:\n${missing.join('\n')}`,
  );
});
