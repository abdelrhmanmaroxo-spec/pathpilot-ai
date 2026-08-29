import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const commandCss = readFileSync(new URL('../command-palette.css', import.meta.url), 'utf8');
const i18nCss = readFileSync(new URL('../i18n.css', import.meta.url), 'utf8');

function selectorBlock(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  assert.ok(match, `Missing CSS block for ${selector}`);
  return match[1];
}

test('global search stays at the top of the document instead of following scroll', () => {
  const block = selectorBlock(commandCss, '.global-command-trigger');
  assert.match(block, /position:\s*absolute\s*!important;/);
  assert.doesNotMatch(block, /position:\s*(?:fixed|sticky)\b/);
  assert.match(block, /top:\s*var\(--pathpilot-top-control-top\)/);
});

test('language switch stays aligned with the top search row and scrolls away', () => {
  const block = selectorBlock(i18nCss, '.pathpilot-language-switch');
  assert.match(block, /position:\s*absolute\s*!important;/);
  assert.doesNotMatch(block, /position:\s*(?:fixed|sticky)\b/);
  assert.match(block, /inset-block-start:\s*var\(--pathpilot-top-control-top/);
  assert.match(block, /height:\s*var\(--pathpilot-top-control-height/);
});

test('top controls preserve keyboard focus visibility and document spacing', () => {
  assert.match(commandCss, /\.global-command-trigger:focus-visible\s*\{/);
  assert.match(i18nCss, /\.pathpilot-language-switch:focus-visible\s*\{/);
  assert.match(commandCss, /\.command-dock-spacer\s*\{[\s\S]*?height:\s*64px;/);
});
