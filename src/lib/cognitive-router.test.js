import test from 'node:test';
import assert from 'node:assert/strict';
import { matchCognitiveRequest, normalizeCognitiveText } from './cognitive-router.js';

test('cognitive normalization handles Arabic spelling and punctuation consistently', () => {
  assert.equal(normalizeCognitiveText('إختار لِي—الأفضل!'), 'اختار لي الافضل');
});

test('Egyptian Arabic choice requests map to the decision pipeline', () => {
  const match = matchCognitiveRequest('اختارلي انهي CV أحسن للشغل وليه');
  assert.equal(match.intent, 'decide');
  assert.ok(match.stages.includes('compare'));
  assert.ok(match.stages.includes('decide'));
});

test('problem descriptions map to diagnosis even without a formal command', () => {
  const match = matchCognitiveRequest('ليه السيرفر بيقع كل شوية بعد النشر؟');
  assert.equal(match.intent, 'diagnose');
  assert.ok(match.stages.includes('analyze'));
});

test('teaching prompts map to explanation in Arabic and English', () => {
  assert.equal(matchCognitiveRequest('اشرحلي RAG ببساطة').intent, 'explain');
  assert.equal(matchCognitiveRequest('Explain how embeddings work').intent, 'explain');
});

test('fresh requests match research while retaining nearby technical intent', () => {
  const match = matchCognitiveRequest('ايه أحدث إصدار من Node دلوقتي؟');
  assert.equal(match.intent, 'research');
  assert.ok(match.alternatives.some((item) => item.id === 'code' || item.id === 'answer'));
});

test('mixed technical planning returns a rich multi-stage plan', () => {
  const match = matchCognitiveRequest('حلل React وNode واعمل خطة deployment آمنة مع الاختبارات');
  assert.equal(match.intent, 'plan');
  assert.ok(match.stages.includes('plan'));
  assert.ok(match.stages.includes('test'));
  assert.ok(['standard', 'deep'].includes(match.complexity));
});
