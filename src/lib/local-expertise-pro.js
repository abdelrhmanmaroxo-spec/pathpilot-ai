const pro = (id, triggers, summary, facts, mistakes, steps, related = []) => ({
  id,
  triggers,
  summary,
  facts,
  mistakes,
  steps,
  related,
  pack: 'pro-specialist',
});

export const LOCAL_EXPERTISE_PRO_VERSION = '2026.08.29-pro-v1';

export const LOCAL_EXPERTISE_PRO = [
  pro('pro-algorithms-data-structures', ['algorithm','data structure','complexity','big o','array','hash map','tree','graph','خوارزميات'], 'اختيار الخوارزمية وبنية البيانات يبدأ بنمط العمليات وحجم البيانات وحدود الذاكرة لا بحفظ أسماء الهياكل.', ['Big-O يصف النمو ولا يساوي الزمن الفعلي وحده.','hash table ممتاز للبحث المتوسط لكنه يعتمد على hashing والتصادمات.','graph traversal يحتاج تمييز BFS من DFS حسب أقصر مسار أو عمق الاستكشاف.'], ['اختيار structure بالعادة','تحسين قبل القياس'], ['حدد العمليات المسيطرة','قدّر الأحجام','اختر structure','اختبر edge cases','قِس قبل التحسين'], ['deep-python-engineering','deep-javascript-typescript']),
  pro('pro-sql-query-tuning', ['sql tuning','query plan','index','sqlite','postgres','mysql','join','database performance','تحسين sql'], 'تحسين SQL يعتمد على query plan وانتقائية الفهارس وحجم البيانات ونمط القراءة والكتابة.', ['index يسرع بعض القراءات لكنه يزيد تكلفة الكتابة والتخزين.','composite index ترتيب أعمدته يؤثر على الاستفادة منه.','N+1 queries قد تستهلك latency أكثر من query أكبر محسوبة.'], ['إضافة index لكل عمود','SELECT * دائمًا'], ['أعد إنتاج الاستعلام','افحص plan','قِس rows scanned','اختبر index مناسب','قارن latency والكتابة'], ['expert-database-engineering','deep-api-backends']),
  pro('pro-git-github-workflow', ['git','github','branch','commit','merge','rebase','pull request','actions','جيت'], 'Git workflow الجيد يجعل التغييرات صغيرة وقابلة للمراجعة والرجوع ويمنع خلط الإصلاحات غير المرتبطة.', ['commit صغير ذو هدف واحد أسهل للمراجعة والrollback.','rebase يعيد كتابة التاريخ لذلك يحتاج حذرًا مع الفروع المشتركة.','CI status جزء من قرار الدمج وليس زينة.'], ['force push عشوائي','commit ضخم متعدد الأهداف'], ['حدث الفرع','قسم التغيير','شغل tests','راجع diff','ادمج بعد CI','وثق rollback'], ['expert-software-architecture','expert-testing-strategy']),
  pro('pro-docker-containers', ['docker','container','dockerfile','image','compose','containerization'], 'الحاويات تعزل runtime والاعتماديات لكن لا تلغي الحاجة لإدارة secrets والموارد والصحة والتخزين الدائم.', ['image layers تؤثر على الحجم وcache البناء.','container filesystem مؤقت ما لم تستخدم volume مناسب.','health check مختلف عن مجرد process شغال.'], ['وضع secrets داخل image','تشغيل كل شيء root'], ['استخدم base موثوق','قلل layers','شغل user محدود','اضبط healthcheck','ثبت volumes','قِس الموارد'], ['expert-devops-ci-cd','deep-operating-systems']),
  pro('pro-cloud-devops', ['cloud','aws','azure','gcp','devops','deployment','railway','hosting','cloud architecture'], 'النشر السحابي المحترف يوازن بين الاعتمادية والتكلفة والأمان والمراقبة وقابلية الرجوع.', ['stateless services أسهل في التوسع من state غير المنظم.','secrets يجب فصلها عن artifacts والكود.','rollback يحتاج نسخة مستقرة وschema متوافق.'], ['scale قبل القياس','ربط التطبيق بمورد محلي مؤقت'], ['حدد SLO','افصل state','أضف health checks','راقب التكلفة','اختبر rollback','وثق recovery'], ['expert-sre-observability','pro-docker-containers']),
  pro('pro-browser-pwa', ['pwa','service worker','cache storage','browser cache','manifest','offline','web app'], 'PWA الجيدة تدير cache/versioning والتحديثات وحالات offline بدون إبقاء المستخدم على نسخة قديمة.', ['service worker قد يستمر بعد نشر نسخة جديدة حتى activation.','cache-first مناسب للأصول الثابتة لكنه خطر للبيانات المتغيرة.','installability تحتاج manifest وشروط متصفح مناسبة.'], ['cache كل API','تحديث صامت يكسر state'], ['صنف الموارد','ضع versioned cache','استبعد secrets/API','اعرض update prompt','اختبر offline/upgrade'], ['expert-frontend-architecture','expert-web-performance']),
  pro('pro-web-performance', ['web performance','core web vitals','bundle','lazy load','lcp','inp','cls','performance'], 'أداء الويب يحتاج قياس تحميل ورندر وتفاعل وشبكة ثم علاج أكبر bottleneck بدل micro-optimizations.', ['lazy loading يقلل initial work لكنه قد يؤخر موردًا حرجًا لو استخدم خطأ.','bundle splitting مفيد عندما يفصل features غير لازمة للبداية.','long tasks تضر responsiveness حتى لو الشبكة سريعة.'], ['ضغط صور فقط واعتباره الأداء كله','memoization بلا profile'], ['قِس vitals','حلل bundle','حدد long tasks','lazy-load غير الحرج','اختبر على جهاز ضعيف'], ['deep-react-engineering','pro-browser-pwa']),
  pro('pro-test-automation', ['test automation','e2e','playwright','cypress','unit test','integration test','qa automation'], 'استراتيجية الاختبار تضع أغلب التغطية في اختبارات سريعة مستقرة وتستخدم E2E للمسارات الحرجة.', ['unit tests ممتازة للمنطق لكنها لا تثبت التكامل الحقيقي.','E2E هشة إذا اعتمدت على timing عشوائي.','test data isolation يمنع تلوث النتائج بين runs.'], ['sleep ثابت بدل انتظار condition','اختبار كل شيء E2E'], ['حدد risk','اكتب unit/integration','أضف E2E للحرج','اعزل البيانات','شغل في CI','راقب flaky rate'], ['expert-testing-strategy','expert-qa-engineering']),
  pro('pro-observability-debugging', ['observability','logs','metrics','traces','debugging','request id','telemetry'], 'المراقبة الجيدة تربط logs وmetrics وtraces حول request واحد وتسمح بعزل المشكلة بدل التخمين.', ['request ID يربط طبقات متعددة إذا انتقل عبر الحدود.','average latency قد يخفي p95/p99 سيئة.','structured logs أسهل للبحث من نصوص غير ثابتة.'], ['logging كل البيانات الحساسة','الاعتماد على console فقط'], ['حدد signals','أضف correlation ID','راقب percentiles','اربط errors بالrelease','أنشئ alert قابل للتصرف'], ['expert-sre-observability','deep-api-backends']),
  pro('pro-incident-response', ['incident response','outage','production incident','rollback','postmortem','حادث','تعطل'], 'إدارة الحوادث تقلل الضرر أولًا ثم تجمع الأدلة وتصلح السبب وتمنع التكرار بدون لوم.', ['mitigation أسرع من root-cause أثناء outage.','timeline دقيق مهم بعد الحادث.','postmortem الجيد ينتج إجراءات بمالكين ومواعيد.'], ['debug طويل قبل mitigation','تغيير عدة أشياء معًا'], ['حدد severity','أوقف الضرر','ثبت timeline','اعزل التغيير','recover','اكتب actions قابلة للقياس'], ['expert-incident-response','pro-observability-debugging']),
  pro('pro-privacy-data-protection', ['privacy','pii','personal data','retention','gdpr','data minimization','خصوصية'], 'الخصوصية تبدأ بتقليل جمع البيانات وتحديد الغرض والاحتفاظ والوصول قبل إضافة سياسات نصية.', ['data minimization يقلل أثر التسريب.','retention غير المحدود يزيد المخاطر والتكلفة.','logs قد تحتوي PII حتى لو قاعدة البيانات محمية.'], ['جمع كل شيء للاحتياط','سياسة بدون تطبيق'], ['صنف البيانات','احذف غير الضروري','حدد retention','قيد الوصول','راجع logs','اختبر deletion/export'], ['expert-privacy-data-governance','expert-security-appsec']),
  pro('pro-statistics-experimentation', ['statistics','ab test','experiment','hypothesis','confidence interval','sample size','احصاء','إحصاء'], 'التجارب الجيدة تحدد metric وفرضية وحجم عينة قبل رؤية النتيجة وتفرق بين الدلالة والحجم العملي للأثر.', ['p-value لا يقيس حجم الأثر.','multiple comparisons ترفع false positives.','selection bias قد يجعل عينة كبيرة مضللة.'], ['إيقاف التجربة عند أول نتيجة جميلة','تغيير metric بعد رؤية البيانات'], ['حدد hypothesis','اختر primary metric','قدّر sample','ثبت المدة','حلل effect+interval','راجع biases'], ['expert-statistics-probability','expert-product-analytics']),
  pro('pro-product-management', ['product management','roadmap','feature priority','mvp','product strategy','منتج'], 'إدارة المنتج تربط مشكلة مستخدم قابلة للإثبات بنتيجة عمل ثم تختبر أصغر حل قبل التوسع.', ['feature usage لا يساوي user value وحده.','roadmap يجب أن يسمح بتغيير الأولوية عند ظهور أدلة.','MVP يختبر فرضية وليس نسخة رديئة من المنتج الكامل.'], ['بناء features قبل المشكلة','قياس downloads فقط'], ['حدد المشكلة','اختر outcome','رتب المخاطر','اختبر prototype','قِس adoption/retention','قرر iterate أو stop'], ['expert-product-strategy','expert-user-research']),
  pro('pro-ux-research', ['ux research','usability','user interview','prototype','user testing','تجربة مستخدم'], 'بحث تجربة المستخدم يجمع سلوكًا وأدلة من مهام حقيقية بدل أسئلة تقود المستخدم للإجابة المرغوبة.', ['ما يفعله المستخدم قد يخالف ما يقوله.','5 مقابلات قد تكشف مشاكل كبيرة لكنها ليست نسبة إحصائية للسوق.','task success والوقت والأخطاء إشارات عملية في usability tests.'], ['هل تحب الميزة؟ فقط','اختبار بدون سيناريو'], ['حدد سؤال البحث','اختر participants','اكتب tasks غير موجهة','راقب السلوك','صنف المشاكل','أعد الاختبار'], ['expert-ui-ux-design','pro-product-management']),
  pro('pro-accessibility', ['accessibility','aria','keyboard navigation','screen reader','wcag','contrast','إتاحة'], 'إتاحة الويب تعتمد على HTML دلالي ولوحة مفاتيح وفوكس وتسميات وتباين وليس ARIA وحدها.', ['native button أفضل من div مع click في أغلب الحالات.','focus visible ضروري لمستخدم لوحة المفاتيح.','ARIA لا يصلح سلوك component مكسور.'], ['إخفاء outline بدون بديل','aria-label لكل شيء بلا حاجة'], ['استخدم semantic HTML','اختبر keyboard','راجع focus order','اختبر labels','راجع contrast','جرّب screen reader'], ['expert-accessibility','deep-react-engineering']),
  pro('pro-arabic-linguistic-qa', ['arabic qa','egyptian arabic','rtl','dialect','arabic localization','تعريب','لهجة مصرية'], 'جودة العربية تحتاج اتساق اللهجة والاتجاه وعلامات الترقيم والأسماء والـbidi مع الحفاظ على المعنى الطبيعي.', ['النص المختلط عربي/إنجليزي يحتاج bidi handling لا ترجمة الكلمات فقط.','الفصحى واللهجة المصرية تختلفان في النبرة وبعض التراكيب.','الأسماء والمنتجات غالبًا لا تترجم حرفيًا.'], ['خلط لهجات بلا سبب','قلب ترتيب الأكواد داخل RTL'], ['حدد locale','ثبت المصطلحات','اختبر mixed text','راجع direction','اختبر placeholders/forms','راجع naturalness'], ['expert-arabic-language-qa','pro-accessibility']),
  pro('pro-speech-audio-evaluation', ['speech to speech','audio evaluation','voice quality','pronunciation','turn taking','asr','tts','صوت','نطق'], 'تقييم الصوت يفصل المحتوى اللغوي عن جودة الإشارة والنطق والتوقيت والمقاطعة والـturn-taking.', ['WER لا يقيس naturalness أو prosody.','latency في بدء الرد مختلفة عن latency أثناء stream.','مشكلة pronunciation قد تكون TTS رغم صحة النص.'], ['تقييم الصوت من transcript فقط','خلط لهجة صحيحة مع صوت طبيعي'], ['حدد layer','اسمع التسجيل','قارن transcript','سجل timestamps','صنف pronunciation/noise/turn-taking','أعد الحالة'], ['expert-ai-evaluation','expert-audio-speech']),
  pro('pro-multimodal-ai-evaluation', ['multimodal','image evaluation','video evaluation','vision model','audio video ai','تقييم صور','تقييم فيديو'], 'تقييم النماذج متعددة الوسائط يحتاج فصل دقة فهم كل modality عن الدمج بينها وعن اتباع التعليمات.', ['نموذج قد يصف الصورة جيدًا لكنه يخطئ علاقة زمنية في الفيديو.','OCR correctness ليست visual reasoning.','الصوت والصورة قد يتعارضان ويجب اختبار أيهما اعتمد عليه النموذج.'], ['تقييم الناتج النهائي فقط','عدم حفظ evidence'], ['حدد modalities','ضع rubric','اختبر كل modality','اختبر cross-modal reasoning','سجل evidence','قارن consistency'], ['expert-ai-evaluation','pro-speech-audio-evaluation']),
  pro('pro-data-annotation-qa', ['data annotation','labeling','rubric','inter annotator agreement','hitl','annotation qa','تصنيف بيانات'], 'جودة البيانات تعتمد على تعريف labels وأمثلة حدودية وقياس الاتفاق ومعالجة الغموض بصورة قابلة للتكرار.', ['guideline غامض يخفض agreement حتى مع annotators جيدين.','gold set يحتاج مراجعة لأنه قد يحتوي أخطاء.','اختلاف reviewers إشارة لتحسين rubric أحيانًا لا لمعاقبة الفرد.'], ['تغيير القاعدة شفهيًا','إخفاء edge cases'], ['حدد ontology','اكتب positive/negative examples','أنشئ gold set','قِس agreement','حلل disagreements','حدّث guideline'], ['expert-data-quality','expert-ai-evaluation']),
  pro('pro-trust-safety-moderation', ['trust safety','content moderation','policy enforcement','abuse','harassment','moderation','سلامة محتوى'], 'Trust & Safety تحتاج تطبيق policy ثابت مع اعتبار السياق والشدة والاستثناءات ومسار escalation للحالات عالية المخاطر.', ['keyword وحده لا يحدد دائمًا المخالفة.','consistency بين reviewers هدف أساسي.','appeal data مصدر مهم لاكتشاف أخطاء policy أو التنفيذ.'], ['قرار حسب الانطباع','عدم توثيق rationale'], ['حدد policy section','اجمع context','صنف severity','طبق الاستثناءات','وثق rationale','صعد الحالات الحرجة'], ['expert-trust-safety','pro-data-annotation-qa']),
  pro('pro-fraud-risk-analysis', ['fraud','risk analysis','transaction monitoring','chargeback','anomaly','احتيال','مخاطر'], 'تحليل الاحتيال يوازن false positives مع الخسارة ويعتمد على إشارات متعددة وسياق زمني بدل rule واحد.', ['زيادة الحساسية تقلل false negatives لكنها قد ترفع احتكاك العملاء.','velocity features تكشف نمطًا لا يظهر في transaction منفردة.','feedback من التحقيقات يحسن rules/models.'], ['حظر بناء على إشارة واحدة','عدم قياس false positive cost'], ['حدد loss model','اجمع signals','ضع thresholds','أنشئ review queue','قِس precision/recall','حدث القواعد'], ['expert-risk-management','expert-data-analysis']),
  pro('pro-financial-reporting', ['financial reporting','gaap','income statement','balance sheet','cash flow','reconciliation','تقارير مالية'], 'التقارير المالية الجيدة تربط القيود والمصادر والتسويات والقوائم مع audit trail واضح.', ['الربح لا يساوي cash flow.','reconciliation تكشف فروق التوقيت والأخطاء قبل الإقفال.','materiality تحدد أهمية الخطأ لكن لا تبرر تجاهل الضوابط.'], ['تعديل رقم بلا trace','خلط accrual مع cash'], ['حدد source documents','راجع entries','نفذ reconciliations','تحقق cross-statement','وثق adjustments','اعمل review'], ['expert-financial-analysis','expert-accounting-controls']),
  pro('pro-financial-modeling', ['financial model','dcf','valuation','forecast','npv','irr','financial modeling','نمذجة مالية'], 'النموذج المالي القابل للدفاع يفصل assumptions عن formulas ويختبر الحساسية بدل إنتاج رقم واحد مزيف الدقة.', ['DCF حساس للنمو والخصم والقيمة النهائية.','scenario analysis يوضح نطاق النتائج أفضل من single-point forecast.','circular references تحتاج فهمًا لا مجرد تشغيل iterative calc.'], ['hardcode داخل formulas','عدم اختبار downside'], ['نظف assumptions','اربط statements','اختبر formulas','اعمل scenarios','نفذ sensitivity','راجع outputs منطقيًا'], ['expert-financial-modeling','pro-financial-reporting']),
  pro('pro-spreadsheets-excel', ['excel','google sheets','spreadsheet','pivot','xlookup','formula','اكسل','شيت'], 'جداول البيانات الاحترافية تفصل input/calculation/output وتستخدم validation ومراجع واضحة وتقلل hardcoding.', ['structured tables تقلل range drift.','lookup يحتاج معالجة missing/duplicate keys.','volatile functions قد تبطئ ملفات كبيرة.'], ['أرقام داخل formulas','ألوان بدل قواعد بيانات'], ['حدد inputs','نظف types','استخدم tables','تحقق lookups','أضف checks','اختبر edge cases'], ['expert-spreadsheet-engineering','pro-financial-modeling']),
  pro('pro-business-analysis', ['business analysis','requirements','stakeholder','process mapping','user story','acceptance criteria','تحليل أعمال'], 'تحليل الأعمال يحول الحاجة الغامضة إلى requirements قابلة للاختبار مع أصحاب مصلحة وقيود واضحة.', ['requirement الجيد يحدد النتيجة لا تصميم الحل فقط.','acceptance criteria تربط الفهم بالتسليم.','conflicting stakeholders تحتاج قرار tradeoff موثق.'], ['جمع طلبات فقط بدون تحليل','user story بلا acceptance'], ['حدد stakeholders','ارسم current state','استخرج pain points','اكتب requirements','حدد acceptance','أكد الأولويات'], ['expert-business-analysis','pro-product-management']),
  pro('pro-project-delivery', ['project management','delivery','milestone','dependency','risk register','project plan','إدارة مشروع'], 'التسليم الجيد يدير dependencies والمخاطر والـcritical path ويكشف التأخير مبكرًا بدل تقارير حالة تجميلية.', ['milestone بدون acceptance criteria لا يثبت التقدم.','dependency خارجية تحتاج owner وموعد escalation.','buffer يجب وضعه حول uncertainty الحقيقية.'], ['كل المهام high priority','status أخضر بلا دليل'], ['حدد scope','رتب dependencies','عين owners','حدد milestones','راجع risks أسبوعيًا','صعد blockers مبكرًا'], ['expert-project-management','pro-business-analysis']),
  pro('pro-career-interviewing', ['interview','job application','career','behavioral interview','star method','مقابلة عمل','تقديم وظيفة'], 'الاستعداد المهني يربط أمثلة حقيقية بمتطلبات الدور ويمنع تضخيم الخبرة أو حفظ إجابات جامدة.', ['STAR مفيد لتنظيم القصة وليس لخلق نتيجة غير موجودة.','job description يمكن تحويله إلى evidence matrix.','أسئلة المتابعة تختبر عمق الملكية الفعلية للعمل.'], ['حفظ إجابة واحدة لكل الشركات','اختراع metrics'], ['حلل الوصف','اربط كل requirement بدليل','جهز قصص حقيقية','تدرب على follow-ups','جهز أسئلة للفريق'], ['expert-career-strategy','expert-professional-writing']),
  pro('pro-content-video-production', ['video editing','premiere','capcut','script','storyboard','motion graphics','مونتاج','سكريبت'], 'إنتاج الفيديو يجمع هدف الرسالة والإيقاع والصورة والصوت والنص على الشاشة بدل إضافة transitions بلا وظيفة.', ['cut rhythm يتبع المعنى والصوت لا رقمًا ثابتًا دائمًا.','sound design الخفيف قد يرفع الإحساس بالحركة أكثر من transition مبالغ.','text safe areas مهمة للموبايل والمنصات.'], ['effect لكل cut','نص طويل صغير'], ['حدد hook','ابن storyboard','اختر visual evidence','اضبط pacing','نظف audio','راجع mobile readability'], ['expert-content-strategy','expert-ui-ux-design']),
];

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}+#.\-\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value) {
  return new Set(normalize(value).split(' ').filter((token) => token.length >= 2));
}

function overlap(left, right) {
  let count = 0;
  for (const token of left) if (right.has(token)) count += 1;
  return count / Math.max(1, Math.sqrt(left.size * right.size));
}

function entryText(entry) {
  return `${entry.id} ${entry.triggers.join(' ')} ${entry.summary} ${entry.facts.join(' ')} ${entry.mistakes.join(' ')} ${entry.steps.join(' ')}`;
}

export function retrieveProExpertise({ prompt = '', tool = '', mode = '', limit = 10, seedIds = [] } = {}) {
  const query = normalize(`${prompt} ${tool} ${mode} ${seedIds.join(' ')}`);
  const queryTokens = tokens(query);
  return LOCAL_EXPERTISE_PRO
    .map((entry) => {
      const text = normalize(entryText(entry));
      let score = overlap(queryTokens, tokens(text)) * 22;
      for (const trigger of entry.triggers) {
        const normalized = normalize(trigger);
        if (normalized && query.includes(normalized)) score += normalized.includes(' ') ? 14 : 8;
      }
      if (entry.related.some((id) => seedIds.includes(id))) score += 3;
      return { entry, score };
    })
    .filter(({ score }) => score > 0.2)
    .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id))
    .slice(0, Math.max(1, limit))
    .map(({ entry }) => entry);
}

export const LOCAL_EXPERTISE_PRO_STATS = {
  version: LOCAL_EXPERTISE_PRO_VERSION,
  domains: LOCAL_EXPERTISE_PRO.length,
  facts: LOCAL_EXPERTISE_PRO.reduce((sum, entry) => sum + entry.facts.length, 0),
  mistakes: LOCAL_EXPERTISE_PRO.reduce((sum, entry) => sum + entry.mistakes.length, 0),
  playbookSteps: LOCAL_EXPERTISE_PRO.reduce((sum, entry) => sum + entry.steps.length, 0),
};
