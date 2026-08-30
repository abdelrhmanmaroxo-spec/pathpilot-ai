import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeConversationContext, isFollowUpPrompt } from './conversation-context.js';

test('recognizes elliptical follow-ups across Arabic English and Arabizi', () => {
  for (const prompt of [
    'كمل',
    'عدله وخليه أقصر',
    'وده خليه أسرع',
    'دي كمان',
    'نفس الكلام بس بالإنجليزي',
    'what about the second one',
    'change it to English',
    'w da',
    'nafs elly fat',
    'kml',
  ]) assert.equal(isFollowUpPrompt(prompt), true, prompt);
});

test('does not treat standalone why or explain requests as follow-ups', () => {
  for (const prompt of [
    'ليه السماء زرقا',
    'why is DNS cached',
    'explain dependency injection from scratch',
  ]) assert.equal(isFollowUpPrompt(prompt), false, prompt);
  assert.equal(isFollowUpPrompt('ليه؟'), true);
  assert.equal(isFollowUpPrompt('why'), true);
});

test('mixed-language elliptical follow-up keeps the last two turns for reference resolution', () => {
  const result = analyzeConversationContext({
    prompt: 'دي كمان but shorter',
    turns: [
      { prompt: 'اكتب عنوان أول', answer: 'عنوان أول', tool: 'write' },
      { prompt: 'وده عنوان تاني', answer: 'عنوان تاني', tool: 'write' },
    ],
    currentTool: 'write',
  });

  assert.equal(result.relationship, 'follow_up');
  assert.equal(result.relevantTurns.length, 2);
  assert.match(result.prompt, /عنوان أول/);
  assert.match(result.prompt, /عنوان تاني/);
});

test('standalone why request does not inherit an unrelated previous answer', () => {
  const result = analyzeConversationContext({
    prompt: 'ليه السماء زرقا',
    turns: [{ prompt: 'اكتب رسالة متابعة', answer: 'Hello, following up...', tool: 'email' }],
  });

  assert.equal(result.relationship, 'new_topic');
  assert.equal(result.relevantTurns.length, 0);
  assert.equal(result.prompt, 'ليه السماء زرقا');
});

test('current strong self-reference overrides older grammatical context', () => {
  const femaleNow = analyzeConversationContext({
    prompt: 'انا بنت وعايزة نكمل',
    turns: [{ prompt: 'انا ولد', answer: 'تمام.', tool: 'ask' }],
  });
  assert.equal(femaleNow.grammarGender, 'female');
  assert.match(femaleNow.prompt, /User grammatical form for Arabic address: feminine/);

  const maleNow = analyzeConversationContext({
    prompt: 'انا ولد وعايز نكمل',
    turns: [{ prompt: 'انا بنت', answer: 'تمام.', tool: 'ask' }],
  });
  assert.equal(maleNow.grammarGender, 'male');
  assert.match(maleNow.prompt, /User grammatical form for Arabic address: masculine/);
});

test('ambiguous current wording preserves the newest prior strong grammatical hint', () => {
  const result = analyzeConversationContext({
    prompt: 'كمل',
    turns: [
      { prompt: 'انا ولد', answer: 'تمام.', tool: 'ask' },
      { prompt: 'انا بنت', answer: 'تمام.', tool: 'ask' },
    ],
  });
  assert.equal(result.grammarGender, 'female');
});
