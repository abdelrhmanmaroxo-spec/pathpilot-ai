import test from 'node:test';
import assert from 'node:assert/strict';
import { localConversationalReply } from './local-conversation.js';

test('answers simple Arabic meta chat naturally without a research template', () => {
  const answer = localConversationalReply('انت بتعمل اي؟');
  assert.match(answer, /بقرأ كلامك|بسياق المحادثة/);
  assert.doesNotMatch(answer, /تحليل أولي|أفضل طريقة للبدء|البحث الحي غير متاح/);
});

test('answers identity and capability questions conversationally', () => {
  assert.match(localConversationalReply('انت مين؟'), /PathPilot AI/);
  assert.match(localConversationalReply('تقدر تعمل ايه؟'), /أشرح|أحلل|RAG|الأدوات/);
});

test('leaves substantive questions to the reasoning pipeline', () => {
  assert.equal(localConversationalReply('اشرح OAuth بالتفصيل'), null);
  assert.equal(localConversationalReply('حلل architecture المشروع'), null);
});
