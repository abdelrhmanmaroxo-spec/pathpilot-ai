import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseBetterLocalAnswer, scoreLocalAnswer } from './local-answer-quality.js';

test('quality scorer rewards constraint-aware actionable answers', () => {
  const result = scoreLocalAnswer({
    prompt: 'اصلح بطء React على Windows خلال ساعتين بدون تغيير backend',
    knowledge: { constraints: ['Windows', 'ساعتين', 'بدون تغيير backend'] },
    style: 'balanced',
    answer: `ابدأ بقياس render time على Windows بدون تغيير backend.\n1. استخدم React Profiler لتحديد component البطيء.\n2. اختبر derived state وeffects غير الضرورية.\n3. نفذ تغييرًا واحدًا ثم قِس من جديد.\nالهدف إنهاء التشخيص والإصلاح خلال ساعتين مع rollback بسيط لو الأداء لم يتحسن.`,
  });

  assert.ok(result.score >= 0.7);
  assert.equal(result.flags.includes('missed-constraints'), false);
});

test('quality gate keeps a stronger draft when review becomes generic', () => {
  const result = chooseBetterLocalAnswer({
    prompt: 'اعمل خطة اختبار API مع rate limit و rollback',
    knowledge: { constraints: ['rate limit', 'rollback'] },
    style: 'balanced',
    draft: `خطة اختبار API:\n1. اختبر rate limit بطلبات متتابعة وتحقق من status والheaders.\n2. اختبر auth والvalidation والأخطاء.\n3. نفذ rollback تجريبيًا وتأكد من رجوع النسخة السابقة بدون فقد بيانات.\n4. سجل latency وrequest IDs قبل وبعد التغيير.`,
    reviewed: 'It depends. Consider your needs and do more research before deciding.',
  });

  assert.equal(result.selected, 'draft');
  assert.ok(result.draftQuality.score > result.reviewedQuality.score);
});

test('quality gate accepts a review that improves constraint coverage', () => {
  const result = chooseBetterLocalAnswer({
    prompt: 'اعمل خطة نشر مع rollback وبدون downtime',
    knowledge: { constraints: ['rollback', 'بدون downtime'] },
    style: 'balanced',
    draft: 'انشر النسخة الجديدة واختبرها ثم راقبها.',
    reviewed: `خطة نشر بدون downtime:\n1. شغل النسخة الجديدة بجانب الحالية.\n2. نفذ health checks قبل تحويل الترافيك.\n3. حول نسبة صغيرة وراقب errors وlatency.\n4. لو ظهر regression نفذ rollback للنسخة السابقة فورًا.\n5. بعد الاستقرار أكمل التحويل وسجل نتيجة النشر.`,
  });

  assert.equal(result.selected, 'reviewed');
});
