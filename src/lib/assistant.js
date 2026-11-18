import { openVaultPayload, sealVaultPayload, sha256Hex } from './crypto-vault.js';
import { getFreeCloudConfig } from './free-cloud-hub.js';
import { generateBrowserLLMResponse, isBrowserLLMReady } from './local-llm.js';
import { generateNaturalConversationalAnswer } from './natural-tutor.js';

export const MAX_GOOGLE_AI_KEYS = 200;
const GOOGLE_KEY_POOL_VAULT = 'pathpilot.google_key_pool.v6';
const POOL_CURSOR_KEY = 'pathpilot.google_key_cursor.v6';

export const TOOL_LIBRARY = {
  study: [
    { id: 'explain', label: 'اشرح مفهومًا', description: 'شرح مبسّط ومتدرج مع مثال وسؤال مراجعة.', placeholder: 'مثال: اشرح لي مفهوم قواعد البيانات العلائقية كأنني أدرسه لأول مرة…', starters: ['اشرح التعلّم العميق ببساطة', 'وضّح الفرق بين HTTP وHTTPS', 'اشرح قانون نيوتن الثاني بمثال'] },
    { id: 'summarize', label: 'لخّص ملاحظاتي', description: 'حوّل النص الطويل إلى نقاط مركّزة وكلمات أساسية.', placeholder: 'الصق ملاحظات المحاضرة أو النص المراد تلخيصه…', starters: ['لخّص هذا الفصل في نقاط', 'استخرج أهم المصطلحات', 'أنشئ ملخصًا للمراجعة السريعة'] },
    { id: 'plan', label: 'خطة مذاكرة', description: 'قسّم الهدف إلى جلسات عملية قابلة للتنفيذ.', placeholder: 'مثال: عندي امتحان برمجة بعد 7 أيام، ساعتان متاحتان يوميًا…', starters: ['خطة أسبوع لمراجعة Python', 'قسّم مشروع التخرج على 14 يومًا', 'خطة مذاكرة قبل الامتحان'] },
    { id: 'quiz', label: 'اختبر فهمي', description: 'أسئلة قصيرة للمراجعة النشطة مع إرشاد للإجابة.', placeholder: 'اكتب الموضوع أو الصق الملخص الذي تريد أسئلة عليه…', starters: ['اختبار عن أساسيات الشبكات', 'أسئلة على OOP', 'اختبرني في مبادئ الاقتصاد'] },
    { id: 'flashcards', label: 'بطاقات مراجعة', description: 'حوّل أي موضوع إلى بطاقات سؤال وجواب سريعة.', placeholder: 'اكتب الموضوع أو الصق النقاط التي تريد تحويلها إلى بطاقات…', starters: ['بطاقات عن أساسيات الشبكات', 'راجع مصطلحات قواعد البيانات', 'بطاقات سريعة قبل الامتحان'] },
    { id: 'research', label: 'خريطة بحث', description: 'حوّل موضوعًا واسعًا إلى أسئلة ومحاور وخطة بحث.', placeholder: 'اكتب موضوع البحث، المطلوب، والمدة المتاحة…', starters: ['خطة بحث عن الأمن السيبراني', 'محاور مشروع تخرج', 'أسئلة بحث عن الذكاء الاصطناعي'] },
  ],
  work: [
    { id: 'email', label: 'بريد احترافي', description: 'صياغة واضحة ومهذبة مع موضوع وخطوة تالية.', placeholder: 'مثال: اكتب بريدًا لمديري أطلب فيه موعدًا لمراجعة المشروع…', starters: ['بريد متابعة بعد مقابلة', 'طلب موعد مع المدير', 'تحديث حالة مشروع للعميل'] },
    { id: 'tasks', label: 'حوّلها إلى مهام', description: 'حوّل الهدف المبعثر إلى خطوات وأولويات ومخرجات.', placeholder: 'صف المشروع أو الهدف والموعد النهائي المتاح…', starters: ['خطة إطلاق موقع خلال أسبوع', 'رتّب مهام اليوم حسب الأولوية', 'قسّم مهمة تحليل البيانات'] },
    { id: 'meeting', label: 'ملخص اجتماع', description: 'قرارات، مسؤوليات، مخاطر، وخطوات تالية.', placeholder: 'الصق ملاحظات الاجتماع حتى لو كانت غير مرتبة…', starters: ['رتّب ملاحظات الاجتماع', 'استخرج القرارات والمسؤوليات', 'أنشئ follow-up واضحًا'] },
    { id: 'cv', label: 'إنجاز للسيرة', description: 'حوّل العمل المنفذ إلى bullet قوي بلا ادعاءات.', placeholder: 'مثال: عملت على اختبار ردود نموذج AI واكتشفت أخطاء متكررة…', starters: ['حوّل خبرتي إلى CV bullet', 'صغ إنجازًا تقنيًا', 'حسّن وصف المشروع للـHR'] },
    { id: 'cover', label: 'خطاب تقديم', description: 'مسودة مخصصة تربط خبرتك بمتطلبات الوظيفة.', placeholder: 'الصق وصف الوظيفة واكتب أهم خبرة حقيقية عندك مرتبطة بها…', starters: ['خطاب لوظيفة AI Evaluator', 'تقديم على IT Support', 'رسالة تقديم لمطور Junior'] },
    { id: 'qa', label: 'تقرير جودة', description: 'حوّل المشكلة إلى تقرير QA واضح وقابل للتنفيذ.', placeholder: 'صف الخطأ، خطوات ظهوره، المتوقع، والنتيجة الفعلية…', starters: ['اكتب Bug Report احترافي', 'حوّل ملاحظاتي إلى QA report', 'رتّب نتائج اختبار موقع'] },
  ],
  general: [
    { id: 'ask', label: 'اسأل أي حاجة', description: 'يفهم نوع الطلب ويعطيك أفضل مسار متاح.', placeholder: 'اكتب أي سؤال، مشكلة، فكرة، أو شيء تريد تنفيذه…', starters: ['ساعدني أحل مشكلة', 'كيف أبدأ في فكرة جديدة؟', 'رتّب لي الموضوع ده'] },
    { id: 'rewrite', label: 'حسّن أي نص', description: 'ينظّم النص ويجعله أوضح وأسهل في القراءة.', placeholder: 'الصق الرسالة أو الفقرة أو المحتوى الذي تريد تحسينه…', starters: ['حسّن الرسالة دي', 'خلّي الكلام احترافي', 'رتّب الفقرة واختصرها'] },
    { id: 'brainstorm', label: 'ولّد أفكارًا', description: 'أفكار متنوعة مع ترتيب واختبار عملي.', placeholder: 'اكتب الموضوع، الجمهور، والهدف من الأفكار…', starters: ['أفكار مشروع صغير', 'أفكار محتوى تقني', 'أفكار لتحسين منتج'] },
    { id: 'decide', label: 'ساعدني أقرر', description: 'قارن الخيارات بمعايير واضحة وقدّم توصية.', placeholder: 'اكتب الخيارات المتاحة وما الذي يهمك في القرار…', starters: ['قارن بين خيارين', 'ساعدني أختار جهاز', 'هل أبدأ الآن أم أنتظر؟'] },
    { id: 'organize', label: 'نظّم يومي', description: 'حوّل الالتزامات إلى جدول واقعي ومرن.', placeholder: 'اكتب المهام، المواعيد، والوقت المتاح اليوم…', starters: ['رتّب مهام يومي', 'اعمل جدولًا مرنًا', 'وزّع وقتي بين الدراسة والعمل'] },
    { id: 'content', label: 'اصنع محتوى', description: 'هيكل منشور أو فيديو أو مقال حسب الهدف والجمهور.', placeholder: 'اكتب نوع المحتوى، موضوعه، الجمهور، والمنصة…', starters: ['بوست LinkedIn تقني', 'سكريبت فيديو قصير', 'هيكل مقال بسيط'] },
  ],
};

const MODE_LABELS = { study: 'مساحة الدراسة', work: 'مساحة العمل', general: 'المساعد العام' };
const AUDIENCE_LABELS = { self: 'استخدام شخصي', teacher: 'مدرس أو مشرف', recruiter: 'مسؤول توظيف', team: 'فريق عمل' };
export const hasLiveAI = true;

export function getModeLabel(mode) {
  return MODE_LABELS[mode] || MODE_LABELS.general;
}

function maskApiKey(key) {
  const k = String(key || '').trim();
  if (k.length <= 12) return '••••••••';
  return `${k.slice(0, 7)}••••••${k.slice(-4)}`;
}

function readRawKeyPool() {
  try {
    const raw = globalThis.localStorage?.getItem?.(GOOGLE_KEY_POOL_VAULT);
    const parsed = openVaultPayload(raw, { keys: [], preferredModel: 'auto' });
    return Array.isArray(parsed?.keys) ? parsed : { keys: [], preferredModel: 'auto' };
  } catch {
    return { keys: [], preferredModel: 'auto' };
  }
}

function writeRawKeyPool(state) {
  try {
    const cleanKeys = (Array.isArray(state?.keys) ? state.keys : []).slice(0, MAX_GOOGLE_AI_KEYS);
    globalThis.localStorage?.setItem?.(
      GOOGLE_KEY_POOL_VAULT,
      sealVaultPayload({
        keys: cleanKeys,
        preferredModel: state?.preferredModel || 'auto',
      }),
    );
  } catch {
    // Ignore storage write failure
  }
}

export function loadGoogleAiKeyPool() {
  const state = readRawKeyPool();
  const existingMap = new Map();
  for (const item of state.keys) {
    if (item?.key) existingMap.set(item.key, item);
  }

  const envList = [
    ...String(import.meta.env?.VITE_GEMINI_API_KEYS || '').split(/[\n,\s;]+/),
    String(import.meta.env?.VITE_GEMINI_API_KEY || ''),
    String(getFreeCloudConfig()?.geminiApiKey || ''),
  ]
    .map((k) => k.trim())
    .filter((k) => k.length >= 20);

  for (const envKey of envList) {
    if (!existingMap.has(envKey) && existingMap.size < MAX_GOOGLE_AI_KEYS) {
      const id = `gkey-${sha256Hex(envKey).slice(0, 10)}`;
      existingMap.set(envKey, {
        id,
        key: envKey,
        maskedKey: maskApiKey(envKey),
        label: `Google Key #${existingMap.size + 1}`,
        enabled: true,
        uses: 0,
        failures: 0,
        cooldownUntil: 0,
        lastUsedAt: null,
        status: 'ready',
      });
    }
  }

  const now = Date.now();
  const keys = [...existingMap.values()].slice(0, MAX_GOOGLE_AI_KEYS).map((item, idx) => ({
    ...item,
    index: idx + 1,
    maskedKey: maskApiKey(item.key),
    isCoolingDown: Number(item.cooldownUntil || 0) > now,
  }));

  return {
    keys,
    preferredModel: state.preferredModel || 'auto',
    maxCapacity: MAX_GOOGLE_AI_KEYS,
    totalCount: keys.length,
    activeCount: keys.filter((k) => k.enabled && !k.isCoolingDown && k.status !== 'invalid').length,
    totalUses: keys.reduce((sum, k) => sum + Number(k.uses || 0), 0),
  };
}

export function addGoogleAiKeysBulk(rawInput = '', labelPrefix = 'Google Key') {
  const tokens = String(rawInput || '')
    .split(/[\n,\r\t ;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 20);

  const state = readRawKeyPool();
  const map = new Map(state.keys.map((item) => [item.key, item]));
  let added = 0;

  for (const token of tokens) {
    if (map.size >= MAX_GOOGLE_AI_KEYS) break;
    if (map.has(token)) continue;
    const nextNum = map.size + 1;
    map.set(token, {
      id: `gkey-${sha256Hex(token).slice(0, 10)}`,
      key: token,
      maskedKey: maskApiKey(token),
      label: `${labelPrefix} #${nextNum}`,
      enabled: true,
      uses: 0,
      failures: 0,
      cooldownUntil: 0,
      lastUsedAt: null,
      status: 'ready',
    });
    added += 1;
  }

  writeRawKeyPool({ ...state, keys: [...map.values()] });
  return { added, pool: loadGoogleAiKeyPool() };
}

export function toggleGoogleAiKey(id) {
  const state = readRawKeyPool();
  const nextKeys = state.keys.map((k) => (k.id === id ? { ...k, enabled: !k.enabled, cooldownUntil: 0, status: 'ready' } : k));
  writeRawKeyPool({ ...state, keys: nextKeys });
  return loadGoogleAiKeyPool();
}

export function removeGoogleAiKey(id) {
  const state = readRawKeyPool();
  const nextKeys = state.keys.filter((k) => k.id !== id);
  writeRawKeyPool({ ...state, keys: nextKeys });
  return loadGoogleAiKeyPool();
}

export function clearGoogleAiKeyPool() {
  writeRawKeyPool({ keys: [], preferredModel: 'auto' });
  return loadGoogleAiKeyPool();
}

export function setGooglePoolPreferredModel(preferredModel = 'auto') {
  const state = readRawKeyPool();
  writeRawKeyPool({ ...state, preferredModel });
  return loadGoogleAiKeyPool();
}

function recordKeyOutcome(keyValue, outcome) {
  const state = readRawKeyPool();
  const now = Date.now();
  const idx = state.keys.findIndex((k) => k.key === keyValue);
  if (idx === -1) return;
  const target = { ...state.keys[idx] };
  if (outcome === 'ok') {
    target.uses = Number(target.uses || 0) + 1;
    target.status = 'healthy';
    target.cooldownUntil = 0;
    target.lastUsedAt = new Date(now).toISOString();
  } else if (outcome === 'rate_limit') {
    target.failures = Number(target.failures || 0) + 1;
    target.status = 'cooldown';
    target.cooldownUntil = now + 65_000;
  } else if (outcome === 'invalid') {
    target.failures = Number(target.failures || 0) + 1;
    target.status = 'invalid';
  }
  const nextKeys = [...state.keys];
  nextKeys[idx] = target;
  writeRawKeyPool({ ...state, keys: nextKeys });
}

export async function testGoogleAiKeyById(id) {
  const pool = loadGoogleAiKeyPool();
  const item = pool.keys.find((k) => k.id === id);
  if (!item) throw new Error('المفتاح غير موجود.');

  for (const model of ['gemini-3.8-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-flash']) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': item.key,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Reply with OK' }] }],
        generationConfig: { maxOutputTokens: 12 },
      }),
    });
    if (res.ok) {
      recordKeyOutcome(item.key, 'ok');
      return { ok: true, model, pool: loadGoogleAiKeyPool() };
    }
    if (res.status === 429) {
      recordKeyOutcome(item.key, 'rate_limit');
      return { ok: false, reason: 'وصل للحد المؤقت (429) — سيتم التبديل التلقائي لغيره', pool: loadGoogleAiKeyPool() };
    }
    if (res.status === 400 || res.status === 403) {
      const errJson = await res.json().catch(() => ({}));
      const msg = JSON.stringify(errJson);
      if (/API_KEY_INVALID|invalid api key/i.test(msg)) {
        recordKeyOutcome(item.key, 'invalid');
        return { ok: false, reason: 'المفتاح غير صالح (API_KEY_INVALID)', pool: loadGoogleAiKeyPool() };
      }
    }
  }
  return { ok: false, reason: 'تعذر الاتصال بالنموذج حاليًا', pool: loadGoogleAiKeyPool() };
}

function nextOrderedKeysFromPool() {
  const pool = loadGoogleAiKeyPool();
  const available = pool.keys.filter((k) => k.enabled && !k.isCoolingDown && k.status !== 'invalid');
  if (!available.length) return { ordered: [], preferredModel: pool.preferredModel };

  let cursor = 0;
  try {
    cursor = Number(globalThis.localStorage?.getItem?.(POOL_CURSOR_KEY) || 0) || 0;
    globalThis.localStorage?.setItem?.(POOL_CURSOR_KEY, String((cursor + 1) % available.length));
  } catch {
    cursor = 0;
  }

  const ordered = [];
  for (let i = 0; i < available.length; i += 1) {
    ordered.push(available[(cursor + i) % available.length]);
  }
  return { ordered, preferredModel: pool.preferredModel };
}

function cleanInput(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function sentences(value) {
  return String(value || '')
    .split(/(?<=[.!؟\n])\s+/)
    .map(cleanInput)
    .filter((item) => item.length > 12);
}

export function extractKeywords(value, limit = 6) {
  const stopWords = new Set(['هذا', 'هذه', 'ذلك', 'التي', 'الذي', 'على', 'إلى', 'من', 'في', 'عن', 'مع', 'أو', 'هو', 'هي', 'تم', 'كان', 'have', 'with', 'from', 'that', 'this', 'and', 'the', 'for']);
  const counts = new Map();
  String(value || '').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)?.forEach((word) => {
    if (!stopWords.has(word)) counts.set(word, (counts.get(word) || 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function audiencePrefix(preferences = {}) {
  const audience = AUDIENCE_LABELS[preferences.audience];
  return audience && preferences.audience !== 'self' ? `مخصص لـ: ${audience}\n\n` : '';
}

function localComparison(prompt) {
  return `مقارنة احتياطية\nطلبك: ${prompt}\n\nتعذر الوصول للمحرك الحي الآن، لذلك لن أخترع تفاصيل حديثة أو أسعارًا أو ترتيبات غير متحققة.\n\n1. حدّد الخيارات الحقيقية المرتبطة بطلبك.\n2. قارن سهولة البداية، الجودة، التطبيق العملي، التكلفة، المجتمع، والملاءمة للهدف.\n3. لكل خيار اكتب نقاط قوة وضعف.\n4. استبعد ما يفشل في شرط أساسي.\n5. اختر حسب حالة الاستخدام لا حسب ترتيب مطلق.\n\nمهم\nبمجرد عودة البحث الحي، أعد الطلب للحصول على أسماء ومصادر حديثة.`;
}

function localBrainstorm(prompt) {
  const topic = cleanInput(prompt);
  return `أفكار موسعة حول: ${topic}\n\nعملية وسريعة\n1. نسخة مصغرة تحل المشكلة الأساسية فقط.\n2. خدمة موجهة لشريحة ضيقة.\n3. قالب أو أداة قابلة لإعادة الاستخدام.\n4. أتمتة جزء متكرر.\n\nأقوى من المعتاد\n5. دمج فكرتين في تجربة أبسط.\n6. تخصيص حسب نوع المستخدم.\n7. قياس تقدم واضح.\n8. نسخة مجانية محدودة تقود لقيمة مدفوعة.\n\nتجريبية\n9. مساعد يقترح الخطوة التالية.\n10. نظام توصية يشرح سبب الاختيار.\n11. لوحة قياس للأخطاء والفرص.\n12. تجربة تفاعلية تتغير حسب مدخلات المستخدم.\n\nاختبار سريع\nاختر فكرتين فقط واسأل: هل تحل مشكلة حقيقية؟ هل أقدر أبني نسخة صغيرة منها هذا الأسبوع؟`;
}

function localStudy(tool, prompt) {
  const keywords = extractKeywords(prompt);
  if (tool === 'summarize') {
    const points = sentences(prompt).slice(0, 8);
    return `ملخص مركز\n${points.length ? points.map((item, index) => `${index + 1}. ${item}`).join('\n') : `• ${prompt}`}\n\nكلمات أساسية\n${keywords.join(' • ') || 'استخرج المصطلحات الأساسية من النص.'}\n\nمراجعة نشطة\nحاول شرح الفكرة بصوتك في دقيقتين، ثم ارجع للنقاط التي لم تستطع تذكرها.`;
  }
  if (tool === 'plan') return `خطة مذاكرة قابلة للتنفيذ\nالهدف: ${prompt}\n\n1. قياس نقطة البداية — 20 دقيقة\n2. تقسيم المنهج إلى وحدات صغيرة مرتبة بالأهمية.\n3. جلسات تركيز 45–60 دقيقة يتبعها استرجاع من الذاكرة.\n4. نهاية كل جلسة: 5 أسئلة بدون الرجوع للمصدر.\n5. مراجعة تراكمية بعد كل 3 جلسات.\n6. آخر 20% من الوقت: نماذج وأسئلة على مناطق الضعف.\n\nقاعدة التنفيذ\nلو تأخرت، قلّل كمية المحتوى لا وقت الاسترجاع والاختبار.`;
  if (tool === 'quiz') return `اختبار فهم\nالموضوع: ${prompt}\n\n1. عرّف الفكرة الأساسية بكلماتك.\n2. اذكر مثالًا صحيحًا ومثالًا مضادًا.\n3. ما الخطأ الشائع في هذا الموضوع؟\n4. طبّق الفكرة على موقف جديد.\n5. لخّصها في جملة واحدة لشخص مبتدئ.\n\nطريقة الاستخدام\nجاوب من الذاكرة أولًا، ثم راجع المصدر وصحح إجاباتك بلون مختلف.`;
  if (tool === 'flashcards') return `بطاقات مراجعة\nالموضوع: ${prompt}\n\n• س: ما الفكرة الأساسية؟\n  ج: اكتب تعريفًا قصيرًا جدًا من المصدر.\n• س: لماذا تهم هذه الفكرة؟\n  ج: اربطها باستخدام حقيقي.\n• س: ما مثالها؟\n  ج: استخدم أبسط مثال صحيح.\n• س: ما الفرق بينها وبين أقرب مفهوم مشابه؟\n  ج: ركّز على معيار واحد حاسم.\n• س: ما الخطأ الشائع؟\n  ج: دوّن الخطأ وطريقة اكتشافه.`;
  if (tool === 'research') return `خريطة بحث\nالموضوع: ${prompt}\n\nأسئلة البحث\n1. ما تعريف وحدود الموضوع؟\n2. ما أهم النظريات أو التقنيات المرتبطة به؟\n3. ما الأدلة المؤيدة والمعارضة؟\n4. ما التطبيقات الحالية؟\n5. أين توجد فجوات أو أسئلة مفتوحة؟\n\nترتيب المصادر\nمصادر أولية أو رسمية ← أوراق ومراجع أكاديمية ← مصادر شرح موثوقة ← أمثلة تطبيقية.\n\nالمخرج النهائي\nملخص تنفيذي + محاور + أدلة لكل محور + قائمة أسئلة تحتاج تحقق.`;
  return `شرح مبسّط\nالموضوع: ${prompt}\n\nابدأ بالفكرة الكبيرة: حاول تحديد «ما المشكلة التي يحلها هذا المفهوم؟». بعد ذلك افهم المكوّنات الأساسية واحدة واحدة واربط كل جزء بمثال صغير.\n\nمصطلحات تستحق التركيز\n${keywords.join(' • ') || 'التعريف • المكونات • المثال • التطبيق'}\n\nمثال عملي\nحوّل المفهوم إلى موقف تعرفه، وحدد المدخلات، ما الذي يحدث بينها، والنتيجة.\n\nسؤال مراجعة\nلو تغير عنصر أساسي في المثال، كيف ستتغير النتيجة ولماذا؟`;
}

function localWork(tool, prompt, preferences) {
  const name = cleanInput(preferences?.displayName);
  if (tool === 'email') return `Subject: Follow-up / Next Step\n\nHello,\n\n${prompt}\n\nPlease let me know the best next step or if you need anything else from me.\n\nBest regards,\n${name || '[Your name]'}`;
  if (tool === 'tasks') return `خطة تنفيذ\nالهدف: ${prompt}\n\nالآن\n1. حدّد المخرج النهائي ومعيار القبول.\n2. اجمع المدخلات والاعتماديات الناقصة.\n3. نفّذ أصغر جزء يزيل أكبر قدر من عدم اليقين.\n\nبعدها\n4. قسّم التنفيذ إلى وحدات يمكن اختبارها.\n5. راجع الجودة قبل الدمج أو التسليم.\n6. وثّق ما تم وما تبقى والمالك والموعد.\n\nتعريف الانتهاء\nمخرج قابل للتسليم + مراجعة مكتملة + لا توجد نقاط حرجة بلا مالك.`;
  if (tool === 'meeting') return `ملخص اجتماع منظم\nالملاحظات: ${prompt}\n\nالقرارات\n• حوّل كل قرار واضح إلى جملة واحدة.\n\nAction items\n• [المهمة] — Owner: [الاسم] — Due: [الموعد]\n\nأسئلة مفتوحة\n• ما الذي لم يُحسم؟\n\nمخاطر / Dependencies\n• ما الذي قد يؤخر التنفيذ أو يحتاج موافقة خارجية؟`;
  if (tool === 'cv') return `CV bullet مقترح\n• Executed ${prompt.replace(/[.!؟]+$/u, '')}, documenting findings and applying structured quality checks to support accurate, consistent delivery.\n\nقبل الاستخدام\nاستبدل أي صياغة عامة برقم أو أداة أو نتيجة حقيقية لو كانت عندك، ولا تضف ادعاء لم يحدث.`;
  if (tool === 'cover') return `Dear Hiring Team,\n\nI am interested in this opportunity because it aligns with my hands-on experience and the type of work I want to continue developing. My relevant background includes ${prompt}\n\nI focus on careful execution, clear documentation, and learning project-specific guidelines quickly. I would welcome the opportunity to discuss how this experience can support your team.\n\nBest regards,\n${name || '[Your name]'}`;
  return `QA / Bug Report\n\nSummary\n${prompt}\n\nEnvironment\n• Device / OS: [add]\n• Browser / app version: [add]\n\nSteps to reproduce\n1. [step]\n2. [step]\n3. [step]\n\nExpected result\n[what should happen]\n\nActual result\n[what happened]\n\nImpact / Severity\n[who is affected and how badly]\n\nEvidence\n[screenshot, recording, logs, timestamp]`;
}

function localGeneral(tool, prompt) {
  if (tool === 'rewrite') {
    const compact = cleanInput(prompt);
    return `نسخة أوضح\n${compact}\n\nمراجعة سريعة\n• الفكرة الأساسية واضحة ومباشرة.\n• احذف أي تكرار لا يضيف معلومة.\n• ضع الطلب أو الخطوة التالية في آخر سطر إن كان النص رسالة عملية.`;
  }
  if (tool === 'brainstorm') return localBrainstorm(prompt);
  if (tool === 'decide') return localComparison(prompt);
  if (tool === 'organize') return `تنظيم عملي\nالمطلوب: ${prompt}\n\n1. ثبّت المواعيد التي لا يمكن تحريكها.\n2. اختر أهم 1–3 نتائج لليوم.\n3. ضع أصعب مهمة في فترة طاقة عالية.\n4. اجمع الأعمال الصغيرة في كتلة واحدة.\n5. اترك 20% من الوقت فراغًا للتأخير والطوارئ.\n6. في النهاية انقل غير الضروري بدل تمديد اليوم بلا نهاية.`;
  if (tool === 'content') return `هيكل محتوى\nالموضوع: ${prompt}\n\nHook\nابدأ بالمشكلة أو النتيجة التي تهم الجمهور فورًا.\n\nالقيمة\n• الفكرة الأساسية.\n• مثال أو دليل.\n• خطوة قابلة للتطبيق.\n\nالخاتمة\nلخّص الرسالة في سطر واحد ثم ضع CTA مناسبًا للمنصة.`;
  return `تحليل أولي\nطلبك: ${prompt}\n\nأفضل طريقة للبدء\n1. حدّد النتيجة التي تريد الوصول لها بدقة.\n2. افصل الحقائق المؤكدة عن الافتراضات.\n3. اكتشف أكبر معلومة ناقصة قد تغيّر القرار.\n4. نفّذ أصغر خطوة آمنة تعطيك معلومة جديدة.\n5. راجع النتيجة وعدّل المسار بدل الالتزام بخطة ثابتة.\n\nلو كان الطلب يعتمد على أسعار أو أخبار أو معلومات تتغير بمرور الوقت، استخدم البحث الحي قبل اتخاذ قرار نهائي.`;
}

function applyResponseStyle(answer, preferences = {}) {
  if (preferences.responseStyle === 'concise') return answer.split('\n').slice(0, 14).join('\n');
  if (preferences.responseStyle === 'detailed') return `${answer}\n\nتحقق قبل التنفيذ\n• ما الافتراضات الموجودة؟\n• ما المعلومة التي لو تغيرت ستغيّر القرار؟\n• ما معيار النجاح الواضح؟`;
  return answer;
}

export function generateDemoResponse({ mode, tool, prompt, preferences = {} }) {
  const value = cleanInput(prompt);
  if (value.length < 4) throw new Error('اكتب تفاصيل أكثر حتى أساعدك بشكل مفيد.');
  let answer;
  if (mode === 'study') answer = localStudy(tool, value);
  else if (mode === 'work') answer = localWork(tool, value, preferences);
  else answer = localGeneral(tool, value);
  return applyResponseStyle(`${audiencePrefix(preferences)}${answer}`, preferences);
}

function buildSystemInstruction(language = 'ar') {
  const base = language === 'en'
    ? [
      'You are PathPilot AI — an exceptionally smart, thoughtful, accurate assistant, tutor, and workspace organizer.',
      '1) Think carefully and answer the user accurately, naturally, and thoroughly in their language.',
      '2) For analytical, academic, coding, or exam questions, begin your output with a concise reasoning block wrapped in <thinking>Step 1: ... | Step 2: ... | Step 3: ...</thinking> before your main answer.',
      '3) You have real workspace powers: if the user asks to create or organize a folder (e.g., "create a Physics folder"), append [[FOLDER:Folder Name]] at the very end of your reply. If the user asks to generate or export a PDF summary/document, write the complete structured document in your reply and append [[PDF:Document Title]] at the very end.',
      '4) Whenever the user mentions past online exams, solve every question accurately and highlight tested concepts.',
    ]
    : [
      'أنت PathPilot AI — مساعد ومعلم ذكي جدًا، يفكر بعمق ويرد بدقة واحترافية وبطريقة طبيعية سلسة.',
      '١) افهم سؤال المستخدم جيدًا ورد عليه بإجابة صحيحة، ذكية، ومنظمة بدون حشو.',
      '٢) في الأسئلة العلمية أو البرمجية أو التلخيص والامتحانات، ابدأ في أول سطر بكتلة تفكير مختصرة جدًا داخل <thinking>تحليل السؤال: ... | خطة الحل: ...</thinking> ثم اكتب إجابتك الكاملة بعدها مباشرة.',
      '٣) لديك صلاحيات تنفيذية حقيقية في المنصة: إذا طلب المستخدم إنشاء مجلد أو تنظيم المحادثة في مجلد (مثل: اعمل مجلد فيزياء)، أضف في نهاية ردك الوسم [[FOLDER:اسم المجلد]]. وإذا طلب إنشاء أو استخراج ملف PDF، اكتب المحتوى المنظم كاملًا في ردك وأضف في نهايته الوسم [[PDF:عنوان الملف]] ليتم تجهيز ملف الـ PDF للمستخدم فورًا.',
      '٤) إذا ذكر المستخدم امتحانات أونلاين سابقة، اهتم بها لأقصى درجة وحل أسئلتها واشرح أفكارها.',
    ];
  return base.join('\n');
}

function parseAiEnvelopeAndCleanText(rawText, isFinal = false) {
  let text = String(rawText || '');
  let thinkingSteps = [];
  let createFolder = '';
  let openPdfTitle = '';

  const thinkMatch = text.match(/<thinking>([\s\S]*?)<\/thinking>/i);
  if (thinkMatch) {
    const parts = thinkMatch[1]
      .split(/\||\n/)
      .map((s) => s.replace(/^[-•*\d.)]+\s*/, '').trim())
      .filter(Boolean);
    thinkingSteps = parts.slice(0, 5).map((p, idx) => ({
      id: `t-${idx + 1}`,
      title: idx === 0 ? 'تحليل وفهم الطلب' : `خطوة التفكير ${idx + 1}`,
      detail: p,
    }));
    text = text.replace(thinkMatch[0], '').trimStart();
  } else if (!isFinal && /<thinking>/i.test(text) && !/<\/thinking>/i.test(text)) {
    text = text.replace(/<thinking>[\s\S]*$/i, '').trimStart();
  }

  const folderMatch = text.match(/\[\[FOLDER:([^\]]+)\]\]/i);
  if (folderMatch) {
    createFolder = folderMatch[1].trim().slice(0, 50);
    text = text.replace(/\[\[FOLDER:[^\]]+\]\]/gi, '').trim();
  }

  const pdfMatch = text.match(/\[\[PDF:([^\]]+)\]\]/i);
  if (pdfMatch) {
    openPdfTitle = pdfMatch[1].trim().slice(0, 80);
    text = text.replace(/\[\[PDF:[^\]]+\]\]/gi, '').trim();
  }

  if (!isFinal) {
    text = text.replace(/\[\[(?:FOLDER|PDF):[^\]]*$/i, '').trimEnd();
  }

  return {
    visibleText: text,
    thinkingTrace: thinkingSteps.length ? { intent: 'deep-ai', materialCount: 0, steps: thinkingSteps } : null,
    actions: {
      ...(createFolder ? { createFolder } : {}),
      ...(openPdfTitle ? { openPdfTitle } : {}),
    },
  };
}

function buildOpenAiMessages(prompt, turns = [], language = 'ar') {
  const history = Array.isArray(turns)
    ? turns.slice(-10).flatMap((turn) => {
      const items = [];
      if (turn?.prompt) items.push({ role: 'user', content: String(turn.prompt).slice(0, 4000) });
      if (turn?.answer) items.push({ role: 'assistant', content: String(turn.answer).slice(0, 4000) });
      return items;
    })
    : [];
  return [
    { role: 'system', content: buildSystemInstruction(language) },
    ...history,
    { role: 'user', content: String(prompt || '') },
  ];
}

async function readStreamChunks(response, onRawProgress) {
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('event-stream') || !response.body) {
    const textBody = await response.text();
    try {
      const json = JSON.parse(textBody);
      const msg = json?.choices?.[0]?.message?.content
        || json?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('')
        || json?.answer
        || '';
      if (msg && msg.trim()) {
        onRawProgress?.(msg.trim());
        return msg.trim();
      }
    } catch {
      if (textBody && textBody.trim() && !textBody.trim().startsWith('<')) {
        onRawProgress?.(textBody.trim());
        return textBody.trim();
      }
    }
    return '';
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  for (let chunkStep = 0; chunkStep < 100000; chunkStep += 1) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const parsed = JSON.parse(payload);
        const delta = parsed?.choices?.[0]?.delta?.content
          || parsed?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('')
          || '';
        if (delta) {
          full += delta;
          onRawProgress?.(full);
        }
      } catch {
        // Ignore partial chunk JSON lines
      }
    }
  }
  return full.trim();
}

async function tryGooglePoolRotation(messages, signal, onRawProgress) {
  const { ordered, preferredModel } = nextOrderedKeysFromPool();
  if (!ordered.length) return null;

  const sysMsg = messages.find((m) => m.role === 'system')?.content || '';
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const models = preferredModel && preferredModel !== 'auto'
    ? [preferredModel, 'gemini-2.5-flash-lite']
    : ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];

  const candidates = ordered.slice(0, 10);

  for (const keyEntry of candidates) {
    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': keyEntry.key,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sysMsg }] },
          contents,
          generationConfig: { temperature: 0.45, maxOutputTokens: 4096 },
        }),
        signal,
      });

      if (res.status === 429 || res.status === 503) {
        recordKeyOutcome(keyEntry.key, 'rate_limit');
        break;
      }

      if (res.status === 400 || res.status === 403) {
        const errBody = await res.text().catch(() => '');
        if (/API_KEY_INVALID|invalid api key/i.test(errBody)) {
          recordKeyOutcome(keyEntry.key, 'invalid');
          break;
        }
        continue;
      }

      if (!res.ok) continue;

      const rawAnswer = await readStreamChunks(res, onRawProgress);
      if (rawAnswer) {
        recordKeyOutcome(keyEntry.key, 'ok');
        return { rawAnswer, source: `google-pool:${model}` };
      }
    }
  }
  return null;
}

async function tryZeroKeyFreeCloudAi(messages, signal, onRawProgress) {
  try {
    const res = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages,
        temperature: 0.45,
        stream: true,
      }),
      signal,
    });
    if (res.ok) {
      const rawAnswer = await readStreamChunks(res, onRawProgress);
      if (rawAnswer) return { rawAnswer, source: 'cloud-ai-free' };
    }
  } catch (error) {
    if (signal?.aborted) throw error;
  }

  try {
    const res = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai', messages, jsonMode: false }),
      signal,
    });
    if (res.ok) {
      const text = (await res.text()).trim();
      if (text && !text.startsWith('<')) {
        onRawProgress?.(text);
        return { rawAnswer: text, source: 'cloud-ai-free' };
      }
    }
  } catch (error) {
    if (signal?.aborted) throw error;
  }
  return null;
}

function throwIfAborted(signal) {
  if (!signal?.aborted) return;
  if (signal.reason instanceof Error) throw signal.reason;
  throw new DOMException('The operation was aborted.', 'AbortError');
}

export async function streamSmartAiReply({
  prompt,
  turns = [],
  language = 'ar',
  mode = 'general',
  tool = 'ask',
  preferences = {},
  signal,
  onDelta,
} = {}) {
  throwIfAborted(signal);
  const messages = buildOpenAiMessages(prompt, turns, language);

  const emitVisible = (rawFull) => {
    const parsed = parseAiEnvelopeAndCleanText(rawFull, false);
    if (parsed.visibleText) {
      onDelta?.(parsed.visibleText, parsed.visibleText, parsed.thinkingTrace);
    }
  };

  try {
    const fromPool = await tryGooglePoolRotation(messages, signal, emitVisible);
    if (fromPool?.rawAnswer) {
      const finalParsed = parseAiEnvelopeAndCleanText(fromPool.rawAnswer, true);
      const cleanAnswer = finalParsed.visibleText || fromPool.rawAnswer;
      onDelta?.(cleanAnswer, cleanAnswer, finalParsed.thinkingTrace);
      return {
        answer: cleanAnswer,
        source: fromPool.source,
        degraded: false,
        thinkingTrace: finalParsed.thinkingTrace,
        actions: finalParsed.actions,
      };
    }
  } catch (error) {
    if (signal?.aborted) throw error;
  }

  const zeroKeyCloud = await tryZeroKeyFreeCloudAi(messages, signal, emitVisible);
  if (zeroKeyCloud?.rawAnswer) {
    const finalParsed = parseAiEnvelopeAndCleanText(zeroKeyCloud.rawAnswer, true);
    const cleanAnswer = finalParsed.visibleText || zeroKeyCloud.rawAnswer;
    onDelta?.(cleanAnswer, cleanAnswer, finalParsed.thinkingTrace);
    return {
      answer: cleanAnswer,
      source: zeroKeyCloud.source,
      degraded: false,
      thinkingTrace: finalParsed.thinkingTrace,
      actions: finalParsed.actions,
    };
  }

  if (preferences?.localLlmEnabled && isBrowserLLMReady()) {
    try {
      const localLlm = await generateBrowserLLMResponse({ mode, tool, prompt, preferences, timeoutMs: 25_000 });
      if (localLlm?.answer) {
        onDelta?.(localLlm.answer, localLlm.answer, null);
        return { answer: localLlm.answer, source: 'local-llm', degraded: false, thinkingTrace: null, actions: {} };
      }
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  }

  const offline = generateNaturalConversationalAnswer({ prompt, preferences: { ...preferences, uiLanguage: language } });
  onDelta?.(offline, offline, null);
  return { answer: offline, source: 'natural-tutor', degraded: true, thinkingTrace: null, actions: {} };
}

export async function generateAssistantResponse({ mode, tool, prompt, preferences = {}, signal, onDelta }) {
  throwIfAborted(signal);
  const customApiUrl = String(import.meta.env?.VITE_AI_API_URL || '').trim();
  if (customApiUrl) {
    try {
      const response = await fetch(customApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, tool, prompt: cleanInput(prompt), preferences }),
        signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && typeof payload.answer === 'string' && payload.answer.trim()) {
        onDelta?.(payload.answer.trim(), payload.answer.trim());
        return {
          answer: payload.answer.trim(),
          source: payload.sourceMode || 'live',
          degraded: Boolean(payload.researchFailed),
          sources: Array.isArray(payload.sources) ? payload.sources : [],
        };
      }
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  }

  const toolHint = tool && tool !== 'ask' ? `[Task: ${mode || 'general'} / ${tool}]\n${prompt}` : prompt;
  return streamSmartAiReply({
    prompt: toolHint,
    turns: [],
    language: preferences?.uiLanguage === 'en' ? 'en' : 'ar',
    mode,
    tool,
    preferences,
    signal,
    onDelta,
  });
}
