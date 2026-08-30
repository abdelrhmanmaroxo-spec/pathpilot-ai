import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeConversationContext, isFollowUpPrompt } from './conversation-context.js';

test('recognizes mixed-language references', () => {
  assert.equal(isFollowUpPrompt('ودي كمان'), true);
  assert.equal(isFollowUpPrompt('what about that one'), true);
  assert.equal(isFollowUpPrompt('w da'), true);
  assert.equal(isFollowUpPrompt('ليه السماء زرقا؟'), false);
});

test('anchors a short reference to the latest matching turn', () => {
  const result = analyzeConversationContext({
    prompt: 'ودي خليه أقصر',
    currentTool: 'email',
    turns: [
      { prompt: 'اعمل خطة مذاكرة Python', answer: 'خطة طويلة', tool: 'plan' },
      { prompt: 'اكتب رسالة متابعة بعد المقابلة', answer: 'رسالة طويلة', tool: 'email' },
    ],
  });
  assert.equal(result.relationship, 'follow_up');
  assert.equal(result.relevantTurns.at(-1).tool, 'email');
  assert.match(result.prompt, /رسالة متابعة بعد المقابلة/);
});

test('keeps explicit constraints for continuations', () => {
  const result = analyzeConversationContext({
    prompt: 'خليها أقصر',
    currentTool: 'email',
    turns: [{
      prompt: 'اكتب رسالة بالعربي فقط بدون إنجليزي',
      answer: 'رسالة عربية طويلة',
      tool: 'email',
    }],
  });
  assert.ok(result.inheritedConstraints.some((item) => /بالعربي فقط بدون إنجليزي/.test(item)));
});
