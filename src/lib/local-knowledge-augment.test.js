import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExpertKnowledgeContext } from './local-knowledge-augment.js';
import { LOCAL_EXPERTISE_PRO_STATS } from './local-expertise-pro.js';

test('professional pack materially expands local specialist coverage', () => {
  assert.ok(LOCAL_EXPERTISE_PRO_STATS.domains >= 24);
  assert.ok(LOCAL_EXPERTISE_PRO_STATS.facts >= 70);
  assert.ok(LOCAL_EXPERTISE_PRO_STATS.playbookSteps >= 100);
});

test('augmented retrieval adds spreadsheet and finance expertise when relevant', () => {
  const result = buildExpertKnowledgeContext({
    prompt: 'اعمل financial model في Excel فيه cash flow و valuation وراجع ال formulas',
    tool: 'ask',
    mode: 'work',
    preferences: { responseStyle: 'detailed' },
    maxChars: 12000,
  });

  assert.ok(result.domains.some((id) => /financial-modeling|spreadsheets-excel/.test(id)));
  assert.ok(result.stats.proPackVersion);
  assert.ok(result.context.length <= 12000);
});

test('augmented retrieval adds product and UX expertise for product questions', () => {
  const result = buildExpertKnowledgeContext({
    prompt: 'ازاي اختبر feature جديدة مع المستخدمين واعرف هل فعلا حسنت المنتج؟',
    tool: 'ask',
    mode: 'general',
    preferences: { responseStyle: 'balanced' },
  });

  assert.ok(result.domains.some((id) => /product-management|ux-research|statistics-experimentation/.test(id)));
});
