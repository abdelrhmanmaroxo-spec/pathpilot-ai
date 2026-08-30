import test from 'node:test';
import assert from 'node:assert/strict';
import { detectConversationalIntent, localConversationalReply } from './local-conversation.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

function reply(prompt, options = {}) {
  return localConversationalReply(prompt, {
    storage: options.storage ?? memoryStorage(),
    random: options.random ?? (() => 0),
    language: options.language,
  });
}

test('answers simple Arabic meta chat naturally without a research template', () => {
  const answer = reply('انت بتعمل اي؟');
  assert.match(answer, /بقرأ كلامك|بسياق المحادثة/);
  assert.doesNotMatch(answer, /تحليل أولي|أفضل طريقة للبدء|البحث الحي غير متاح/);
});

test('normalizes punctuation, Arabic letter variants and tatweel for Egyptian casual chat', () => {
  for (const prompt of ['عامل اي', 'عامل اية؟', 'إيه الأخبار؟', 'الدنيا ايه', 'عــامل إيه؟؟']) {
    assert.equal(detectConversationalIntent(prompt), 'how_are_you');
    const answer = reply(prompt);
    assert.match(answer, /تمام|جاهز|الحمد لله/);
    assert.doesNotMatch(answer, /تحليل أولي|RAG|framework|خطوات/);
  }
});

test('covers broad lightweight conversational intents without invoking the reasoning pipeline', () => {
  const cases = [
    ['صباح الخير', 'morning_greeting'],
    ['مساء الخير', 'evening_greeting'],
    ['شكرا جدا', 'thanks'],
    ['تمام كده', 'acknowledgement'],
    ['يلا سلام', 'goodbye'],
    ['معلش', 'apology'],
    ['مش فاهم', 'confusion'],
    ['ممكن تساعدني', 'vague_help'],
    ['الموضوع مستفز', 'frustration'],
    ['جامد', 'compliment'],
    ['😂😂', 'laughter'],
    ['good morning', 'morning_greeting'],
    ['I am confused', 'confusion'],
    ['can you help me', 'vague_help'],
  ];

  for (const [prompt, intent] of cases) {
    assert.equal(detectConversationalIntent(prompt), intent, prompt);
    const answer = reply(prompt);
    assert.ok(answer?.length > 2, prompt);
    assert.doesNotMatch(answer, /تحليل أولي|research template|RAG context/);
  }
});

test('varies repeated casual replies across new chats on the same device', () => {
  const storage = memoryStorage();
  const first = reply('عامل ايه؟', { storage, random: () => 0 });
  const second = reply('عامل ايه؟', { storage, random: () => 0 });
  const third = reply('عامل ايه؟', { storage, random: () => 0 });

  assert.notEqual(first, second);
  assert.notEqual(second, third);
  assert.notEqual(first, third);
  assert.match(first, /تمام|الحمد لله|جاهز/);
  assert.match(second, /تمام|الحمد لله|جاهز/);
  assert.match(third, /تمام|الحمد لله|جاهز/);
});

test('answers identity and capability questions conversationally', () => {
  assert.match(reply('انت مين؟'), /PathPilot AI/);
  assert.match(reply('تقدر تعمل ايه؟'), /أشرح|أحلل|RAG|الأدوات/);
});

test('leaves substantive or scoped help requests to the reasoning pipeline', () => {
  assert.equal(reply('اشرح OAuth بالتفصيل'), null);
  assert.equal(reply('حلل architecture المشروع'), null);
  assert.equal(reply('ممكن تساعدني في تحليل OAuth؟'), null);
  assert.equal(reply('شكرا على شرح OAuth، بس وضح refresh token'), null);
});
