import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDeepThinkingTrace,
  buildMaterialPromptEnvelope,
  mergeMaterials,
  parseMaterialSources,
  summarizeMaterials,
} from './material-intelligence.js';

test('summarizeMaterials extracts structured highlights and key concepts', () => {
  const summary = summarizeMaterials([
    {
      title: 'محاضرة قواعد البيانات',
      content: 'قواعد البيانات العلائقية تنظم البيانات في جداول مترابطة عبر المفاتيح الأساسية والأجنبية. الفهرسة تساعد على تسريع الاستعلامات الكبيرة وتقليل زمن البحث.',
    },
  ]);
  assert.match(summary, /ملخص ذكي للمواد/);
  assert.match(summary, /محاضرة قواعد البيانات/);
  assert.match(summary, /مراجعة نشطة/);
});

test('mergeMaterials deduplicates overlapping points and highlights shared concepts', () => {
  const merged = mergeMaterials([
    {
      title: 'المحاضرة 1',
      content: 'التعلم العميق يعتمد على الشبكات العصبية متعددة الطبقات لاستخراج الأنماط المعقدة من البيانات الضخمة. يستخدم الانحدار التدريجي لتحديث الأوزان.',
    },
    {
      title: 'المحاضرة 2',
      content: 'الشبكات العصبية في التعلم العميق تحتاج GPU لتسريع تدريب الطبقات العميقة. التنظيم Dropout يقلل من مشكلة الحفظ الزائد Overfitting.',
    },
  ]);
  assert.match(merged, /الدمج المنهجي الموحد/);
  assert.match(merged, /القواسم والمفاهيم المشتركة/);
  assert.match(merged, /الملخص المدمج بدون تكرار/);
  assert.match(merged, /ما تنفرد به كل مادة/);
});

test('buildDeepThinkingTrace and buildMaterialPromptEnvelope preserve structured metadata', () => {
  const materials = parseMaterialSources(['نص المحاضرة الأولى حول هندسة البرمجيات والاختبارات الآلية.']);
  const trace = buildDeepThinkingTrace('حلل وادمج', { materials, language: 'ar', intent: 'merge' });
  assert.equal(trace.steps.length, 4);
  const envelope = buildMaterialPromptEnvelope({ action: 'merge', materials, userPrompt: 'ركز على الاختبارات', deepThink: true });
  assert.match(envelope, /===\s*\[1\]/);
  assert.match(envelope, /ركز على الاختبارات/);
});
