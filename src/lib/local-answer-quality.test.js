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
  assert.equal(result.flags.includes('contradicted-constraints'), false);
});

test('quality scorer penalizes answers that contradict negative constraints', () => {
  const compliant = scoreLocalAnswer({
    prompt: 'اصلح المشكلة بدون تغيير backend',
    knowledge: { constraints: ['بدون تغيير backend'] },
    style: 'balanced',
    answer: 'ابدأ من الواجهة بدون تغيير backend. اختبر state management والطلبات الحالية، ثم قِس النتيجة قبل أي تعديل إضافي.',
  });
  const contradictory = scoreLocalAnswer({
    prompt: 'اصلح المشكلة بدون تغيير backend',
    knowledge: { constraints: ['بدون تغيير backend'] },
    style: 'balanced',
    answer: 'غيّر backend أولًا ثم عدّل الواجهة واختبر الطلبات بعد النشر. هذه أسرع طريقة للوصول إلى نتيجة مستقرة.',
  });

  assert.equal(compliant.flags.includes('contradicted-constraints'), false);
  assert.equal(contradictory.flags.includes('contradicted-constraints'), true);
  assert.ok(compliant.score > contradictory.score);
  assert.ok(contradictory.components.contradiction > 0);
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

test('quality gate keeps a compliant draft when review breaks a hard negative constraint', () => {
  const result = chooseBetterLocalAnswer({
    prompt: 'حسن الأداء بدون تغيير backend',
    knowledge: { constraints: ['بدون تغيير backend'] },
    style: 'balanced',
    draft: 'حسن الأداء بدون تغيير backend: ابدأ بقياس render time، ثم قلل rerenders واختبر caching في الواجهة، وبعد كل تعديل قارن latency والنتيجة.',
    reviewed: 'لتحسين الأداء، غيّر backend وأضف endpoint جديدًا ثم انقل جزءًا من المعالجة إليه. بعد ذلك اختبر الواجهة وراقب latency.',
  });

  assert.equal(result.selected, 'draft');
  assert.equal(result.reviewedQuality.flags.includes('contradicted-constraints'), true);
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
