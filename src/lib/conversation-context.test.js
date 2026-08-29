import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeConversationContext,
  buildConversationPrompt,
  conversationContextStats,
  isFollowUpPrompt,
  normalizeConversationTurns,
} from './conversation-context.js';

test('detects short follow-up prompts in Arabic and English', () => {
  assert.equal(isFollowUpPrompt('كمل'), true);
  assert.equal(isFollowUpPrompt('عدله وخليه أقصر'), true);
  assert.equal(isFollowUpPrompt('وده خليه أسرع'), true);
  assert.equal(isFollowUpPrompt('what about the second one'), true);
  assert.equal(isFollowUpPrompt('اشرح قواعد البيانات من البداية'), false);
});

test('keeps only bounded recent conversation turns', () => {
  const turns = Array.from({ length: 10 }, (_, index) => ({ prompt: `question ${index}`, answer: `answer ${index}` }));
  const normalized = normalizeConversationTurns(turns);
  assert.equal(normalized.length, 6);
  assert.equal(normalized[0].prompt, 'question 4');
});

test('follow-up analysis keeps the latest relevant turn even without lexical overlap', () => {
  const result = analyzeConversationContext({
    prompt: 'وده خليه أقصر',
    currentTool: 'email',
    turns: [
      { prompt: 'اكتبلي خطة مذاكرة Python', answer: 'خطة من خمس خطوات', tool: 'plan' },
      { prompt: 'اكتب بريد متابعة بعد المقابلة', answer: 'Hello, thank you for the interview...', tool: 'email' },
    ],
  });

  assert.equal(result.relationship, 'follow_up');
  assert.equal(result.relevantTurns.at(-1).tool, 'email');
  assert.match(result.prompt, /اكتب بريد متابعة بعد المقابلة/);
  assert.match(result.prompt, /LATEST USER REQUEST/);
});

test('new unrelated topic does not drag old conversation into the LLM prompt', () => {
  const result = analyzeConversationContext({
    prompt: 'اشرح لي DNS من البداية',
    turns: [
      { prompt: 'اكتب CV bullet عن تقييم الصوت', answer: 'Evaluated speech AI...', tool: 'cv' },
      { prompt: 'قارن بين موبايلين', answer: 'الموبايل الأول أفضل للبطارية...', tool: 'decide' },
    ],
  });

  assert.equal(result.relationship, 'new_topic');
  assert.equal(result.relevantTurns.length, 0);
  assert.equal(result.prompt, 'اشرح لي DNS من البداية');
});

test('continuation inherits explicit constraints from relevant prior user turns', () => {
  const result = analyzeConversationContext({
    prompt: 'طور خطة React دي وحسن الأداء',
    currentTool: 'tasks',
    turns: [{
      prompt: 'اعمل خطة تطوير React خلال يومين بدون تغيير backend',
      answer: 'ابدأ بالقياس ثم حسّن المكونات البطيئة.',
      tool: 'tasks',
    }],
  });

  assert.equal(result.relationship, 'continuation');
  assert.ok(result.inheritedConstraints.some((item) => /بدون تغيير backend/.test(item)));
  assert.match(result.prompt, /Prior explicit constraints/);
});

test('builds context around the latest user request with explicit context rules', () => {
  const result = buildConversationPrompt({
    prompt: 'كمل',
    turns: [{ prompt: 'اعمل خطة من 3 خطوات', answer: '1. أ 2. ب 3. ج' }],
  });
  assert.match(result, /CONVERSATION CONTEXT ANALYSIS/);
  assert.match(result, /LATEST USER REQUEST\nكمل/);
  assert.match(result, /Relationship: follow_up/);
  assert.match(result, /latest user request has priority/i);
});

test('reports context budget stats', () => {
  const stats = conversationContextStats([{ prompt: 'abc', answer: 'def' }]);
  assert.equal(stats.turns, 1);
  assert.equal(stats.maxTurns, 6);
  assert.ok(stats.maxChars >= 9000);
});
