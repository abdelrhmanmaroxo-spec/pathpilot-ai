import { advancedLocalResponse, detectLocalIntent, extractLocalEntities } from './local-reasoner.js';
import { retrieveLocalKnowledge } from './local-intelligence.js';

const GAP_QUERIES = {
  comparison: 'معايير مقارنة بدائل مزايا عيوب تكلفة مخاطر ملاءمة قرار',
  diagnosis: 'تشخيص خطأ أسباب جذرية logs timeout شبكة api قاعدة بيانات اختبار regression',
  plan: 'خطة مراحل أولويات اعتماديات قيود وقت مخاطر تحقق تنفيذ',
  research: 'مصادر دليل تحقق توثيق رسمي تعارض حداثة جودة معلومات',
  writing: 'جمهور هدف صياغة وضوح نبرة بنية رسالة دعوة لاتخاذ إجراء',
  brainstorm: 'أفكار بدائل جدوى تكلفة اختبار قيمة مستخدم مخاطرة',
  learn: 'تعريف مثال تطبيق مقارنة خطأ شائع اختبار فهم',
  decision: 'قرار بدائل شروط أساسية تكلفة فائدة مخاطرة tradeoff',
  general: 'هدف قيود بدائل مخاطر تنفيذ تحقق',
};

function uniquePacks(...groups) {
  const seen = new Set();
  const out = [];
  for (const pack of groups.flat()) {
    if (!pack?.id || seen.has(pack.id)) continue;
    seen.add(pack.id);
    out.push(pack);
  }
  return out;
}

function pick(items, max) {
  return [...new Set(items.filter(Boolean))].slice(0, max);
}

function buildSecondPassQuery({ prompt, intent, entities, firstPass }) {
  const missing = GAP_QUERIES[intent] || GAP_QUERIES.general;
  const firstDomains = firstPass.map((pack) => pack.id).join(' ');
  return `${prompt} ${entities.join(' ')} ${missing} مجالات مرتبطة غير مغطاة ${firstDomains}`.trim();
}

function deriveInsights(packs, intent, max = 6) {
  const facts = pick(packs.flatMap((pack) => pack.facts || []), max + 3);
  const mistakes = pick(packs.flatMap((pack) => pack.mistakes || []), 4);
  const steps = pick(packs.flatMap((pack) => pack.steps || []), 5);
  const insights = [];

  if (facts.length) insights.push(`• أهم قاعدة مرتبطة: ${facts[0]}`);
  if (facts.length > 1) insights.push(`• نقطة داعمة: ${facts[1]}`);
  if (facts.length > 2 && ['comparison', 'decision', 'research'].includes(intent)) insights.push(`• عامل قد يغيّر القرار: ${facts[2]}`);
  if (mistakes.length) insights.push(`• خطر يجب تجنبه: ${mistakes[0]}`);
  if (steps.length) insights.push(`• أفضل خطوة تالية: ${steps[0]}`);
  if (steps.length > 1 && ['diagnosis', 'plan'].includes(intent)) insights.push(`• بعدها مباشرة: ${steps[1]}`);

  return insights.slice(0, max);
}

function conflictChecks(packs) {
  const checks = [];
  const ids = new Set(packs.map((pack) => pack.id));
  if (ids.has('security') && (ids.has('web') || ids.has('api'))) checks.push('الأمان له أولوية على سهولة التنفيذ إذا كان الحل يعرض secrets أو صلاحيات حساسة.');
  if (ids.has('ai') && ids.has('research')) checks.push('أي ادعاء حديث من AI يحتاج تحققًا حيًا، والمعرفة المحلية لا تعتبر مصدر حداثة.');
  if (ids.has('database') && ids.has('web')) checks.push('تغييرات schema أو التخزين يجب مراجعتها مع التوافق والترحيل والنسخ الاحتياطي قبل الإنتاج.');
  if (ids.has('career') && ids.has('writing')) checks.push('الصياغة المهنية لا يجب أن تضيف إنجازات أو أرقام غير موجودة في مدخلات المستخدم.');
  return checks.slice(0, 3);
}

export function deliberateLocalResponse({ prompt, tool = 'ask', mode = 'general', preferences = {} }) {
  const intent = detectLocalIntent(prompt, tool);
  const entities = extractLocalEntities(prompt, 10);
  const detail = preferences.responseStyle === 'detailed' ? 7 : preferences.responseStyle === 'concise' ? 3 : 5;

  const firstPass = retrieveLocalKnowledge({ prompt, tool, mode, limit: detail });
  const secondQuery = buildSecondPassQuery({ prompt, intent, entities, firstPass });
  const secondPass = retrieveLocalKnowledge({ prompt: secondQuery, tool, mode, limit: detail });
  const merged = uniquePacks(firstPass, secondPass).slice(0, preferences.responseStyle === 'detailed' ? 9 : 7);

  const firstIds = new Set(firstPass.map((pack) => pack.id));
  const newlyFound = merged.filter((pack) => !firstIds.has(pack.id));
  const insights = deriveInsights(merged, intent, preferences.responseStyle === 'detailed' ? 7 : 5);
  const checks = conflictChecks(merged);
  const base = advancedLocalResponse({ prompt, tool, mode, preferences });

  const meta = [
    '🔄 Local Deliberation Pass',
    `• المرحلة الأولى استرجعت: ${firstPass.length ? firstPass.map((p) => p.id).join(' + ') : 'معرفة عامة'}`,
    `• المرحلة الثانية وسّعت البحث المحلي: ${newlyFound.length ? newlyFound.map((p) => p.id).join(' + ') : 'لم تحتج مجالًا إضافيًا واضحًا'}`,
    `• إجمالي المجالات المستخدمة: ${merged.length}`,
    '',
    'استنتاجات مركبة',
    ...(insights.length ? insights : ['• لا يوجد تطابق معرفي قوي بما يكفي، لذلك الأفضل تقليل الافتراضات وطلب تفاصيل أكثر عند الحاجة.']),
  ];

  if (checks.length) meta.push('', 'فحوص تعارض ومخاطر', ...checks.map((item) => `• ${item}`));

  meta.push('', 'النتيجة المحلية المتعمقة', base);
  return meta.join('\n');
}
