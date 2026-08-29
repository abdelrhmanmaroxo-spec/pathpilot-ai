const expert = (id, triggers, summary, facts, mistakes, steps, related = []) => ({
  id,
  triggers,
  summary,
  facts,
  mistakes,
  steps,
  related,
  pack: 'expert-max',
});

export const LOCAL_EXPERTISE_MAX_VERSION = '2026.08.29-expert-max-v1';

export const LOCAL_EXPERTISE_MAX = [
  expert('expert-algorithms-data-structures', ['algorithm','algorithms','خوارزمية','خوارزميات','data structure','هياكل بيانات','complexity','big o','leetcode'], 'الخبرة في الخوارزميات تبدأ من قيود المسألة وحجم البيانات ثم اختيار بنية تقلل تكلفة العمليات المسيطرة.', [
    'Big-O يصف نمو التكلفة مع حجم الإدخال ولا يساوي زمنًا حقيقيًا ثابتًا.',
    'اختيار بنية البيانات قد يغيّر التعقيد أكثر من تحسين سطر داخل الخوارزمية.',
    'hash table ممتازة للبحث المتوقع السريع لكنها تعتمد على دالة hash وإدارة التصادمات.',
    'الشجرة المرتبة تفيد عندما تحتاج ترتيبًا أو range queries لا lookup فقط.',
    'dynamic programming مناسب عندما توجد subproblems متداخلة وبنية optimal substructure.',
    'اختبار edge cases مثل الإدخال الفارغ، عنصر واحد، التكرارات، والقيم القصوى يكشف أخطاء كثيرة.'
  ], ['اختيار خوارزمية بالاسم فقط','تجاهل حجم الإدخال','تحسين قبل قياس','نسيان الذاكرة مقابل الزمن'], ['حدد N والقيود','حدد العمليات الأهم','اختر بنية مناسبة','اكتب baseline صحيحًا','حلل time/space','اختبر edge cases','حسّن بعد القياس'], ['expert-software-architecture','expert-performance-engineering','mathematics']),

  expert('expert-databases-advanced', ['database','sql','postgres','mysql','sqlite','index','transaction','قاعدة بيانات','فهرس','استعلام'], 'تصميم قواعد البيانات القوي يوازن صحة البيانات ونمط الوصول والتزامن والتكلفة التشغيلية.', [
    'الفهرس يسرّع قراءات معينة لكنه يزيد تكلفة الكتابة والمساحة ويجب أن يطابق نمط الاستعلام.',
    'transaction تحمي مجموعة تغييرات كوحدة منطقية وتحتاج مستوى عزل يناسب المخاطر.',
    'N+1 queries قد تجعل واجهة بسيطة بطيئة جدًا رغم أن كل query منفرد سريع.',
    'EXPLAIN وخطة التنفيذ أفضل من التخمين عند تشخيص query بطيء.',
    'الـnormalization تقلل التكرار، لكن denormalization قد تكون منطقية لقراءات ثقيلة بعد قياس.',
    'قيود UNIQUE وFOREIGN KEY وCHECK تنقل جزءًا مهمًا من صحة البيانات إلى الطبقة الصحيحة.'
  ], ['فهرسة كل عمود','SELECT * دائمًا','إصلاح البطء بزيادة hardware فقط','تجاهل transaction boundaries'], ['حدد access patterns','راجع schema constraints','قِس queries','افحص query plan','أضف index مبررًا','اختبر concurrency','راقب بعد النشر'], ['expert-data-engineering','expert-software-architecture','expert-backend-api-design']),

  expert('expert-distributed-systems', ['distributed system','microservices','distributed','consensus','eventual consistency','نظام موزع','خدمات مصغرة','microservice'], 'الأنظمة الموزعة تفترض أن الشبكة والفشل الجزئي والتكرار حقائق طبيعية وليست استثناءات.', [
    'timeout لا يخبرك وحده هل العملية فشلت أم نجحت لكن الرد ضاع.',
    'retry بدون idempotency قد يكرر دفعًا أو إنشاء سجل مرتين.',
    'eventual consistency تعني أن القراءات قد ترى حالات مختلفة مؤقتًا ويجب تصميم UX والمنطق لذلك.',
    'clock ordering بين الأجهزة ليس ضمانًا لترتيب الأحداث المنطقي.',
    'تقسيم خدمة إلى microservices يضيف network latency وobservability وdeployment complexity.',
    'message delivery غالبًا at-least-once عمليًا، لذلك consumer يجب أن يتحمل التكرار.'
  ], ['اعتبار الشبكة موثوقة','retry بلا idempotency','microservices لمشروع صغير بلا سبب','اعتماد timestamps وحدها للترتيب'], ['حدد consistency المطلوبة','حدد failure modes','صمم idempotency','ضع timeout/retry budget','أضف tracing','اختبر partitions والتكرار'], ['expert-software-architecture','expert-sre-observability','expert-backend-api-design']),

  expert('expert-cloud-architecture', ['cloud','aws','azure','gcp','serverless','cloud architecture','سحابة','railway','hosting'], 'معمارية السحابة الجيدة تبدأ من الحمل والموثوقية والأمان والتكلفة بدل رسم خدمات كثيرة.', [
    'stateless application instances أسهل في التوسع والاستبدال من تخزين state محليًا داخل الحاوية.',
    'managed services تقلل عبء التشغيل لكنها تضيف اعتمادًا وتكلفة وحدود provider.',
    'autoscaling لا يعالج قاعدة بيانات مختنقة أو dependency بطيئة وحده.',
    'egress والتخزين والـlogs قد تكون تكاليف أكبر من compute في بعض الأنظمة.',
    'النسخ الاحتياطي لا يساوي disaster recovery ما لم تختبر الاستعادة.',
    'least privilege للشبكات والهوية يقلل blast radius عند اختراق مكون.'
  ], ['تصميم cloud من قائمة services','backup بلا restore test','autoscaling لكل مشكلة','صلاحيات واسعة لتسهيل التطوير'], ['حدد SLO والحمل','حدد state','اختر managed مقابل self-hosted','صمم network/IAM','خطط للنسخ والاستعادة','راقب التكلفة والأداء'], ['expert-devops-delivery','expert-sre-observability','expert-security-appsec']),

  expert('expert-devops-delivery', ['devops','ci cd','deployment','pipeline','github actions','deploy','نشر','تكامل مستمر'], 'DevOps الجيد يجعل التغيير صغيرًا وقابلًا للاختبار والملاحظة والتراجع بدل جعل النشر حدثًا عالي المخاطرة.', [
    'pipeline يجب أن يفشل مبكرًا على lint/tests/security قبل بناء ونشر نسخة غير سليمة.',
    'artifact ثابت أفضل من إعادة build بمكونات مختلفة بين staging وproduction.',
    'rollback يحتاج أن يكون مجربًا لا تعليمات مكتوبة فقط.',
    'database migrations تحتاج backward compatibility عندما تعمل نسختان أثناء rollout.',
    'feature flags تفصل نشر الكود عن تفعيل السلوك للمستخدمين.',
    'deployment frequency مفيدة فقط إذا change failure rate وMTTR تحت السيطرة.'
  ], ['deploy يدوي بلا سجل','migration غير قابلة للرجوع','تعطيل tests لتسريع CI','اعتماد latest tags'], ['صغّر التغيير','شغّل quality gates','ابن artifact ثابت','انشر تدريجيًا','راقب health metrics','ارجع سريعًا عند الخلل'], ['expert-cloud-architecture','expert-sre-observability','expert-testing-strategy']),

  expert('expert-containers-kubernetes', ['docker','container','kubernetes','k8s','pod','containerization','حاويات'], 'الحاويات تعزل runtime وتوحّد التوزيع، وKubernetes مفيد عندما تعقيد التشغيل الموزع يبرر منصة orchestration كاملة.', [
    'image صغيرة ومثبتة الإصدارات تقلل سطح الهجوم ووقت السحب.',
    'container filesystem مؤقت عادة، لذلك البيانات الدائمة تحتاج volume أو خدمة تخزين.',
    'readiness تختلف عن liveness: الأولى تحدد استقبال traffic والثانية صحة العملية.',
    'resource requests/limits تؤثر في scheduling والاستقرار ويجب أن تستند إلى قياس.',
    'secret ليس آمنًا لمجرد وجوده في Kubernetes إن كانت صلاحيات الوصول واسعة.',
    'Kubernetes يضيف control plane ومفاهيم وتشخيصًا قد لا يستحقه تطبيق صغير.'
  ], ['تخزين DB داخل container ephemeral','latest image tag','liveness aggressive','Kubernetes قبل الحاجة'], ['ثبّت base image','قلل privileges','حدد storage','اضبط health probes','قِس resources','اختبر restart/failure'], ['expert-cloud-architecture','expert-devops-delivery','expert-security-appsec']),

  expert('expert-backend-api-design', ['api design','rest api','graphql','endpoint','backend','api','واجهة برمجة','rest'], 'تصميم API احترافي يجعل العقد واضحًا ومتوقعًا وآمنًا وقابلًا للتطور بدون كسر العملاء.', [
    'HTTP status code يجب أن يعكس فئة النتيجة بينما body يحمل code تطبيقيًا ثابتًا للتعامل البرمجي.',
    'validation يجب أن تكون على حدود النظام حتى لو الواجهة تتحقق من نفس المدخلات.',
    'pagination ضرورية للقوائم التي قد تنمو بدل إعادة كل الصفوف.',
    'idempotency مهمة للعمليات التي قد يعاد إرسالها بسبب timeout أو retry.',
    'versioning أو backward-compatible evolution يقلل كسر التطبيقات القديمة.',
    'عدم تسريب stack traces أو تفاصيل provider يقلل المعلومات المفيدة للمهاجم.'
  ], ['الثقة في validation الواجهة','200 لكل الأخطاء','قائمة بلا pagination','رسائل خطأ تكشف internals'], ['حدد resource/action','صمم schema','حدد validation','ثبت error contract','أضف auth/rate limit','اختبر retries/backward compatibility'], ['expert-security-appsec','expert-distributed-systems','expert-databases-advanced']),

  expert('expert-software-architecture', ['software architecture','architecture','معمارية برمجية','design pattern','modular','refactor','كود كبير'], 'المعمارية الجيدة تقلل coupling وتوضح الحدود ومسؤولية كل مكون بحيث يمكن تغيير جزء دون كسر بقية النظام.', [
    'حدود modules يجب أن تتبع مسؤوليات وبيانات واضحة لا مجرد تقسيم ملفات بالتساوي.',
    'dependency direction المستقر يقلل circular imports وصعوبة الاختبار.',
    'abstraction مفيدة بعد ظهور نمط متكرر حقيقي، لا قبل معرفة الاحتياج.',
    'pure functions أسهل في الاختبار وإعادة الاستخدام من وظائف تربط DOM/network/state معًا.',
    'observability والأمان والتعامل مع الأخطاء خصائص معمارية وليست إضافات أخيرة.',
    'أكبر refactor آمن غالبًا سلسلة تغييرات صغيرة تحفظ behavior.'
  ], ['طبقات كثيرة بلا قيمة','global state لكل شيء','نسخ منطق fetch/error','big-bang rewrite'], ['ارسم responsibilities','حدد boundaries','افصل I/O عن logic','ثبت contracts','أضف tests','انقل تدريجيًا','راقب regression'], ['expert-backend-api-design','expert-frontend-architecture','expert-testing-strategy']),

  expert('expert-frontend-architecture', ['frontend','react','vite','state management','component','واجهة','react hooks'], 'هندسة الواجهة توازن state ownership وإعادة الاستخدام والأداء وإمكانية الوصول بدل تكبير component مركزي.', [
    'ضع state في أقرب مستوى مشترك يحتاجه بدل رفع كل شيء لأعلى التطبيق.',
    'derived state يفضل حسابه بدل مزامنته بنسخة ثانية يمكن أن تنحرف.',
    'effects للاتصال بالأنظمة الخارجية لا لتعويض تصميم state غير واضح.',
    'تقسيم component حسب مسؤولية وتجربة مستخدم أفضل من تقسيم اعتباطي حسب عدد الأسطر.',
    'lazy loading يفيد الأجزاء الثقيلة غير المطلوبة عند أول رسم.',
    'error boundaries تمنع خطأ عرض محلي من إسقاط التطبيق بالكامل.'
  ], ['state مكرر','effects لتحديث state مشتق','component عملاق','memoization بلا قياس'], ['حدد state ownership','افصل data access','قسم UI بمسؤوليات','اختبر loading/error/empty','قِس bundle/render','lazy-load الثقيل'], ['expert-web-performance','expert-accessibility','expert-ui-ux']),

  expert('expert-web-performance', ['web performance','performance','lcp','cls','inp','bundle size','سرعة موقع','اداء الويب'], 'أداء الويب يبدأ بقياس رحلة المستخدم ثم معالجة أكبر تكلفة في الشبكة أو JavaScript أو rendering.', [
    'LCP يتأثر بوقت الخادم والموارد الحرجة وتحميل العنصر الأكبر.',
    'CLS ينتج غالبًا من مساحات غير محجوزة للصور والمحتوى الديناميكي.',
    'JavaScript ثقيل يؤخر interactivity حتى لو التنزيل سريع.',
    'code splitting يفيد عندما يمنع تحميل feature ثقيلة قبل استخدامها.',
    'cache headers وimmutable assets يقللان إعادة التنزيل.',
    'تحسين benchmark صناعي بلا قياس أجهزة حقيقية قد يخفي تجربة موبايل سيئة.'
  ], ['تحسين Lighthouse فقط','تحميل كل JS أولًا','صور بلا أبعاد','memo لكل شيء'], ['قِس real/field data','حدد bottleneck','قلل critical path','قسم bundle','حسن assets/cache','أعد القياس على موبايل'], ['expert-frontend-architecture','expert-accessibility','expert-cloud-architecture']),

  expert('expert-accessibility', ['accessibility','a11y','wcag','aria','screen reader','إتاحة','ذوي الإعاقة','keyboard navigation'], 'الإتاحة تجعل الوظائف الأساسية قابلة للاستخدام بلوحة المفاتيح وقارئات الشاشة ومع التباين والحركة المناسبة.', [
    'semantic HTML أفضل من تعويض عناصر غير دلالية بكميات ARIA.',
    'كل وظيفة بالماوس يجب أن تكون قابلة للوصول بالكيبورد عند الحاجة.',
    'focus visible وترتيبه المنطقي مهمان خصوصًا dialogs والقوائم.',
    'label مرتبط بالحقل أفضل من placeholder كوسيلة تعريف وحيدة.',
    'الحركة يجب أن تحترم prefers-reduced-motion.',
    'contrast واللون وحده لا يجب أن يكونا الوسيلة الوحيدة لشرح الحالة.'
  ], ['div كزر بلا keyboard','aria عشوائي','placeholder بدل label','إخفاء focus'], ['استخدم semantics','اختبر Tab/Shift+Tab','اختبر focus trap','راجع labels/errors','راجع contrast','اختبر screen reader أساسي'], ['expert-ui-ux','expert-frontend-architecture','expert-testing-strategy']),

  expert('expert-ui-ux', ['ux','ui','user experience','تصميم واجهة','تجربة مستخدم','usability','interaction design'], 'UX قوي يقلل الحمل الذهني ويجعل الحالة والخطوة التالية واضحتين مع الحفاظ على اتساق بصري وسلوكي.', [
    'hierarchy البصرية تساعد المستخدم يميز الأساسي من الثانوي قبل قراءة كل النص.',
    'system status يجب أن يكون ظاهرًا أثناء loading/success/error بدل صمت الواجهة.',
    'progressive disclosure يخفي التعقيد غير الضروري حتى يحتاجه المستخدم.',
    'error message الجيد يشرح ما حدث وما يمكن فعله الآن دون تفاصيل داخلية.',
    'responsive design يحتاج اختبار تداخل العناصر والكيبورد الافتراضي لا مجرد تغيير العرض.',
    'animations تدعم الفهم عندما تشير للحالة أو العلاقة، وتضر إذا كانت مستمرة أو ثقيلة بلا غرض.'
  ], ['glow أكثر=UX أفضل','أزرار كثيرة بنفس الوزن','رسالة error تقنية','desktop مصغر للموبايل'], ['حدد primary task','رتب hierarchy','وضح states','قلل choices','اختبر mobile/keyboard','قِس نجاح المهمة'], ['expert-accessibility','expert-product-management','expert-frontend-architecture']),

  expert('expert-product-management', ['product management','product manager','roadmap','feature prioritization','منتج','أولوية ميزة','product'], 'إدارة المنتج تربط مشكلة المستخدم بنتيجة قابلة للقياس ثم ترتب الاستثمار حسب قيمة ومخاطرة وتكلفة.', [
    'feature request ليس المشكلة نفسها؛ افهم job-to-be-done قبل التنفيذ.',
    'roadmap القوية مبنية على outcomes ومخاطر لا قائمة وعود فقط.',
    'activation وretention غالبًا أقرب لقيمة المنتج من page views وحدها.',
    'MVP أصغر تجربة تختبر فرضية قيمة، وليس نسخة رديئة من كل الخصائص.',
    'التعقيد التشغيلي والصيانة جزء من تكلفة feature.',
    'إزالة feature ضعيفة قد تحسن المنتج أكثر من إضافة واحدة جديدة.'
  ], ['تنفيذ كل طلب مستخدم','roadmap بلا outcome','vanity metrics','MVP=كل شيء ناقص الجودة'], ['حدد المشكلة','حدد segment','اكتب hypothesis','اختر metric','نفذ أصغر test','قِس','وسع أو احذف'], ['expert-product-analytics','expert-ui-ux','expert-unit-economics']),

  expert('expert-product-analytics', ['product analytics','funnel','retention','activation','cohort','تحليلات منتج','conversion'], 'تحليلات المنتج تحول سلوك المستخدم إلى فرضيات قابلة للاختبار مع تعريف أحداث ومقاييس ثابت.', [
    'event naming المتسق ضروري قبل بناء dashboard معقد.',
    'conversion يحتاج denominator وwindow واضحين.',
    'cohort analysis يفصل مستخدمين بدأوا في فترات مختلفة بدل خلطهم.',
    'retention يجب أن ترتبط بسلوك قيمة حقيقي لا مجرد فتح التطبيق.',
    'correlation بين feature وretention قد يعكس أن المستخدمين الأقوى هم من يستخدمونها.',
    'instrumentation نفسها تحتاج QA حتى لا تتخذ قرارًا من بيانات ناقصة.'
  ], ['dashboard قبل taxonomy','نسب بلا denominator','خلط cohorts','اعتبار correlation سببية'], ['عرف events','حدد identities','حدد funnel/window','تحقق من tracking','حلل cohorts','اختبر hypothesis'], ['expert-product-management','statistics','expert-experimentation']),

  expert('expert-data-engineering', ['data engineering','etl','elt','pipeline','warehouse','lakehouse','هندسة بيانات','بيانات'], 'هندسة البيانات تبني تدفقات قابلة لإعادة التشغيل والتحقق مع lineage وجودة ومراقبة واضحة.', [
    'pipeline idempotent تسهّل إعادة التشغيل بعد failure دون مضاعفة البيانات.',
    'schema evolution يحتاج قواعد حتى لا يكسر المنتج downstream.',
    'partitioning يحسن بعض القراءات لكنه قد يخلق ملفات صغيرة أو skew.',
    'data quality تشمل completeness وvalidity وuniqueness وfreshness حسب الاستخدام.',
    'lineage يساعد معرفة أي dashboards/models تأثرت بتغيير مصدر.',
    'backfill كبير يحتاج حساب تكلفة وترتيب ومعايير إيقاف.'
  ], ['ETL بلا checks','overwrite بلا lineage','partition عشوائي','freshness غير مقاسة'], ['حدد contracts','ابن ingestion idempotent','أضف quality checks','سجل lineage','راقب freshness','اختبر backfill/recovery'], ['expert-databases-advanced','expert-analytics-engineering','expert-ml-engineering']),

  expert('expert-analytics-engineering', ['analytics engineering','dbt','metrics layer','semantic layer','data model','تحليلات بيانات'], 'Analytics engineering يجعل التعريفات التجارية قابلة لإعادة الاستخدام والاختبار بدل تكرار SQL مختلف لكل dashboard.', [
    'metric مثل active user يحتاج تعريفًا موحدًا للفترة والسلوك.',
    'staging models تنظف المصدر قبل منطق الأعمال وتقلل التكرار.',
    'tests على uniqueness/not-null/relationships تمنع أخطاء صامتة.',
    'incremental models تحتاج استراتيجية صحيحة للبيانات المتأخرة.',
    'documentation وownership يقللان اعتماد الفريق على معرفة شخص واحد.',
    'semantic layer تقلل اختلاف تعريف KPI بين الأدوات.'
  ], ['نفس KPI بتعريفات مختلفة','SQL business logic داخل dashboard فقط','incremental بلا late data strategy'], ['ثبت metric definitions','افصل staging/core/marts','أضف tests','وثق lineage','راجع incremental logic','راقب freshness'], ['expert-data-engineering','expert-product-analytics','expert-financial-analysis']),

  expert('expert-ml-engineering', ['machine learning engineering','mlops','model serving','feature store','ml engineering','تعلم آلي','نموذج تنبؤ'], 'ML engineering يحول نموذجًا تجريبيًا إلى نظام قابل للتكرار والمراقبة مع نفس منطق features بين التدريب والاستدلال.', [
    'offline accuracy وحدها لا تضمن قيمة المنتج أو latency مقبولة.',
    'training-serving skew يحدث عندما تحسب features بطريقة مختلفة في الإنتاج.',
    'data drift وconcept drift مشكلتان مختلفتان وتحتاجان إشارات مختلفة.',
    'model registry وdataset/versioning ضروريان لإعادة إنتاج قرار سابق.',
    'fallback مهم عندما model service بطيئة أو غير متاحة.',
    'A/B أو shadow deployment يقللان مخاطرة استبدال model مباشرة.'
  ], ['notebook=production','قياس accuracy فقط','لا version للبيانات','استبدال model بلا rollout'], ['ثبت dataset/features','ابن reproducible training','اختبر serving parity','قِس latency/quality','انشر تدريجيًا','راقب drift'], ['expert-ai-evaluation','expert-data-engineering','expert-llm-engineering']),

  expert('expert-llm-engineering', ['llm','large language model','language model','local llm','webllm','transformer','نموذج لغوي','ذكاء اصطناعي توليدي'], 'LLM engineering يوازن جودة النموذج والسياق والاسترجاع والـlatency والذاكرة والتقييم بدل الاعتماد على حجم النموذج وحده.', [
    'نموذج أصغر مع RAG جيد وتعليمات واضحة قد يتفوق في نطاق محدد على نموذج أكبر بسياق سيئ.',
    'context budget يجب أن يخصص للأدلة الأعلى قيمة بدل حشو كل المعرفة المتاحة.',
    'temperature الأقل تحسن الثبات لكنها لا تصلح نقص المعرفة.',
    'quantization تقلل الذاكرة والحجم مع احتمال فقد جودة يختلف حسب النموذج والمهمة.',
    'self-review pass قد يحسن الاتساق إذا طلب نقدًا محددًا ثم revision، لكنه يزيد latency.',
    'التقييم يجب أن يقيس correctness وinstruction following وgrounding وlatency وليس الانطباع فقط.'
  ], ['أكبر model دائمًا أفضل','context ضخم بلا ranking','temperature=ذكاء','غياب eval set'], ['حدد task profile','اختر model مناسب للجهاز','ابن retrieval مضبوط','حدد context budget','أضف critic عند التعقيد','قِس golden set'], ['expert-rag-engineering','expert-ai-evaluation','expert-prompt-engineering']),

  expert('expert-rag-engineering', ['rag','retrieval augmented generation','vector search','embedding','retrieval','استرجاع معرفي','knowledge base'], 'RAG الجيد يسترجع أقل مجموعة أدلة عالية الصلة ثم يعلّم النموذج حدود ما تدعمه الأدلة.', [
    'retrieval recall العالي بلا reranking قد يحشو السياق بمعلومات ضعيفة.',
    'chunk size يجب أن يحافظ على معنى كافٍ دون إدخال موضوعات كثيرة في chunk واحدة.',
    'hybrid lexical+semantic مفيد عندما توجد أسماء أو أكواد دقيقة مع مفاهيم دلالية.',
    'MMR أو تنويع النتائج يقلل تكرار عدة chunks تقول الشيء نفسه.',
    'metadata filters مثل domain/version/date تقلل مساحة البحث قبل ranking.',
    'الإجابة grounded يجب أن تفرق بين evidence وعدم اليقين بدل سد الفراغ بالتخمين.'
  ], ['top-k كبير جدًا','embedding فقط للأكواد والأسماء','لا dedup','context بلا budget'], ['حلل query','استرجع candidates','rerank','نوع النتائج','قص حسب budget','اطلب grounded synthesis','قِس retrieval+answer'], ['expert-llm-engineering','expert-information-retrieval','expert-ai-evaluation']),

  expert('expert-information-retrieval', ['information retrieval','search ranking','bm25','tf idf','search engine','بحث نصي','ترتيب نتائج'], 'استرجاع المعلومات يوازن التطابق الحرفي والمعنى والحداثة والسلطة والتنوع حسب نوع السؤال.', [
    'exact term matching مهم للأسماء والإصدارات والأخطاء حتى مع وجود semantic search.',
    'IDF يعطي الكلمات النادرة وزنًا أكبر من الكلمات الشائعة.',
    'field boosts تسمح أن trigger أو title يحمل وزنًا أكبر من body.',
    'query expansion مفيد للمرادفات لكن قد يسبب drift بعيدًا عن نية المستخدم.',
    'reranking على مجموعة صغيرة أرخص من scoring عميق على كل corpus.',
    'diversity تمنع top results من أن تكون نسخًا متقاربة لنفس المجال.'
  ], ['semantic فقط','توسيع query بلا حدود','top results مكررة','قياس answer فقط دون retrieval'], ['نظف query','استخرج entities','طبق lexical candidates','وسع بحذر','rerank بالحقول','طبق diversity','قِس recall/precision'], ['expert-rag-engineering','expert-search-ux','source-evaluation']),

  expert('expert-ai-evaluation', ['ai evaluation','llm evaluation','eval','benchmark','rubric','model quality','تقييم ذكاء اصطناعي','هلوسة'], 'تقييم أنظمة الذكاء يحتاج rubric واضحًا ومجموعة حالات تمثل الاستخدام الحقيقي مع فصل correctness عن style.', [
    'pairwise evaluation مفيدة للمقارنة لكنها تحتاج معايير تمنع تفضيل الطول أو النبرة فقط.',
    'golden set يجب أن يحتوي حالات سهلة وصعبة وحواف failure مع expected properties واضحة.',
    'hallucination تقييمها يحتاج التحقق من الادعاء لا مجرد ثقة الأسلوب.',
    'regression set يجب أن يحافظ على أخطاء تم إصلاحها حتى لا تعود.',
    'latency وcost وfallback behavior أجزاء من جودة المنتج بجانب answer quality.',
    'human disagreement إشارة لتحسين rubric أو توضيح الحالات لا ضوضاء يجب تجاهلها.'
  ], ['درجة واحدة لكل الجودة','تفضيل الرد الأطول','benchmark بعيد عن المنتج','عدم حفظ regressions'], ['حدد dimensions','ابن representative set','اكتب rubric','شغّل baseline','راجع disagreements','حوّل failures لاختبارات'], ['expert-llm-engineering','expert-rag-engineering','expert-testing-strategy']),

  expert('expert-prompt-engineering', ['prompt engineering','system prompt','prompt','instruction','تعليمات نموذج','برومبت'], 'هندسة البرومبت الجيدة تحدد المهمة والحدود والمخرجات والأدلة بدون تعليمات متعارضة أو حشو.', [
    'system instructions يجب أن تحتوي القواعد المستقرة بينما user prompt يحمل المهمة الحالية.',
    'أمثلة قليلة عالية الجودة تفيد عندما صيغة المخرج غير بديهية.',
    'طلب reasoning مخفي طويل ليس ضمانًا للجودة؛ الأفضل تحديد checks ومخرجات قابلة للتقييم.',
    'structured output يقلل parsing ambiguity عندما يحتاج النظام حقولًا ثابتة.',
    'prompt injection يتطلب فصل المحتوى غير الموثوق عن التعليمات ذات السلطة.',
    'كل سطر prompt يجب أن يخدم قرارًا أو constraint، وإلا يزيد الضوضاء.'
  ], ['تعليمات متعارضة','prompt طويل بلا غرض','خلط source text مع system commands','اعتماد على صياغة سحرية'], ['حدد deliverable','حدد constraints','افصل trusted/untrusted','أضف output format','أضف verification criteria','اختبر variants'], ['expert-llm-engineering','expert-ai-evaluation','expert-security-appsec']),

  expert('expert-security-appsec', ['appsec','application security','xss','csrf','injection','security','أمن تطبيقات','ثغرة','اختراق'], 'أمن التطبيقات يعتمد دفاعًا متعدد الطبقات عند حدود الإدخال والمخرجات والهوية والاعتماديات والتشغيل.', [
    'React escaping يحمي text rendering افتراضيًا لكنه لا يجعل URLs أو dangerouslySetInnerHTML آمنة تلقائيًا.',
    'server-side validation ضرورية لأن المهاجم يمكنه تجاوز الواجهة بالكامل.',
    'CSP تقلل أثر XSS لكنها ليست بديلًا عن encoding/sanitization.',
    'parameterized SQL يمنع فئة SQL injection أفضل من فلترة كلمات SQL.',
    'rate limiting يقلل abuse لكنه يحتاج identity وwindow وسياسة مناسبة للمسار.',
    'logs الأمنية يجب أن تتجنب secrets وتحتفظ بما يكفي للتحقيق مثل request id والحدث.'
  ], ['فلترة كلمات بدل تصميم آمن','الثقة في client','CSP كحل وحيد','تسجيل secrets'], ['حدد attack surface','طبق least privilege','validate/encode','احم auth/rate limits','افحص dependencies','سجل security events','اختبر abuse cases'], ['expert-threat-modeling','expert-incident-response','expert-iam']),

  expert('expert-threat-modeling', ['threat model','threat modeling','stride','attack surface','نموذج تهديد','سطح هجوم'], 'Threat modeling يحدد الأصول والحدود والمهاجمين ومسارات الإساءة قبل اختيار controls.', [
    'ابدأ بما تريد حمايته ومن يمكنه الوصول إليه قبل تعداد ثغرات عامة.',
    'trust boundary كل انتقال بين مستخدم ومتصفح وAPI وprovider وقاعدة بيانات يحتاج assumptions واضحة.',
    'abuse case مثل spam أو resource exhaustion مهم حتى لو ليس اختراق بيانات.',
    'control يجب أن يقلل احتمالًا أو أثرًا قابلًا للتفسير.',
    'مخاطر admin routes أعلى لأن صلاحيتها تغير حسابات أو حالة النظام.',
    'إعادة threat model بعد feature جديدة أهم من وثيقة ثابتة تُكتب مرة.'
  ], ['قائمة CVEs بدل model','نسيان abuse/DoS','controls بلا threat واضح','عدم تحديث model'], ['حدد assets','ارسم data flow','حدد trust boundaries','عدد attacker goals','رتب risk','اربط controls','اختبر المتبقي'], ['expert-security-appsec','expert-incident-response','risk-management']),

  expert('expert-incident-response', ['incident response','security incident','breach','اختراق','حادث أمني','containment','forensics'], 'الاستجابة للحوادث تفصل الاحتواء عن الاستئصال والتعافي وتحافظ على أدلة كافية لفهم ما حدث ومنع التكرار.', [
    'الاحتواء السريع قد يشمل تعطيل مسار أو تدوير credentials لكنه يجب أن يحافظ على القدرة على التحقيق قدر الإمكان.',
    'timeline موحد من logs وdeploys وauth events يساعد تحديد نقطة البداية والانتشار.',
    'rotation لمفتاح واحد لا يكفي إذا كانت root cause صلاحية أو code path أوسع.',
    'إعادة الخدمة لا تعني انتهاء incident قبل التأكد من إزالة persistence والسبب.',
    'post-incident review يجب أن ينتج controls واختبارات وملاك تنفيذ لا لوم أشخاص.',
    'communication أثناء الحادث تحتاج قناة ومالك وتحديثات مبنية على facts.'
  ], ['حذف logs بسرعة','إعلان الحل قبل root cause','تدوير secret فقط','postmortem لوم'], ['اعلن incident','احتوِ','احفظ evidence','ابن timeline','استأصل السبب','استعد تدريجيًا','أضف regression controls'], ['expert-security-appsec','expert-sre-observability','root-cause-analysis']),

  expert('expert-iam', ['iam','authentication','authorization','oauth','session','rbac','mfa','هوية وصلاحيات','تسجيل دخول'], 'IAM تفصل إثبات الهوية عن الصلاحية وتقلل مدة ونطاق الاعتماديات الحساسة.', [
    'authentication يثبت من أنت، authorization يحدد ما يسمح لك فعله.',
    'server يجب أن يتحقق من الدور لكل route حساسة حتى لو الزر مخفي في UI.',
    'session tokens تحتاج entropy عالية وتخزين hash server-side أو controls مساوية.',
    'MFA مهم أكثر للحسابات الإدارية لأن blast radius أعلى.',
    'OAuth scopes يجب أن تكون أقل ما يلزم وتفصل استخدامات غير مرتبطة عندما يمكن.',
    'تعطيل مستخدم يجب أن يبطل sessions الفعالة إذا كانت المخاطرة تستدعي ذلك.'
  ], ['إخفاء زر=authorization','role من client','token طويل بلا revocation','scope واسع'], ['حدد identities','حدد resources/actions','طبق server authorization','قلل token lifetime/scope','أضف MFA للإدارة','سجل changes','اختبر revocation'], ['expert-security-appsec','expert-privacy-engineering','expert-backend-api-design']),

  expert('expert-privacy-engineering', ['privacy engineering','privacy','pii','data retention','gdpr','خصوصية','بيانات شخصية','حذف بيانات'], 'هندسة الخصوصية تقلل جمع البيانات وتحدد الغرض والاحتفاظ والوصول والحذف بدل الاعتماد على سياسة نصية فقط.', [
    'data minimization تقلل أثر الاختراق والتعقيد القانوني والتشغيلي.',
    'retention يجب أن يكون له سبب ومدة وآلية حذف قابلة للتنفيذ.',
    'telemetry لا تحتاج غالبًا raw prompt أو بريد كامل لتحقيق metric منتج.',
    'export/delete workflows يجب أن تراعي النسخ والـlogs والبيانات المشتقة ضمن سياسة واضحة.',
    'access controls للبيانات الشخصية تختلف عن إخفائها في الواجهة.',
    'privacy by default يجعل أقل مشاركة هي الحالة الابتدائية.'
  ], ['جمع كل شيء للمستقبل','retention للأبد','analytics تحتوي PII بلا حاجة','سياسة بلا تنفيذ'], ['جرد البيانات','اربط كل حقل بغرض','قلل الجمع','حدد retention','قيد الوصول','ابن export/delete','راجع logs'], ['expert-iam','expert-security-appsec','risk-management']),

  expert('expert-cryptography-practical', ['cryptography','hash','encryption','scrypt','argon2','password hashing','تشفير','هاش'], 'التشفير التطبيقي يعتمد خوارزميات قياسية ومكتبات موثوقة وفصل hashing كلمات المرور عن encryption البيانات.', [
    'password hashing يجب أن يكون بطيئًا ومملحًا مثل scrypt/Argon2/bcrypt لا SHA سريع وحده.',
    'salt ليس secret ويمنع rainbow tables وإعادة استخدام نفس hash لكلمات متطابقة.',
    'hashing one-way مختلف عن encryption القابل لفك التشفير بمفتاح.',
    'nonce/IV requirements تختلف حسب الخوارزمية ولا يجوز اختراع قيم أو إعادة استخدامها دون فهم.',
    'timing-safe comparison مفيد عند مقارنة secrets ثابتة الطول في السياقات المناسبة.',
    'لا تخترع crypto protocol خاصًا إذا يوجد standard مجرب.'
  ], ['SHA لكلمات المرور','تشفير بدون authenticated mode','reuse nonce','custom crypto'], ['حدد الهدف','اختر primitive قياسي','استخدم library موثوقة','أدر keys','اختبر rotation/recovery','راجع threat model'], ['expert-security-appsec','expert-iam','cybersecurity']),

  expert('expert-testing-strategy', ['testing strategy','unit test','integration test','e2e','test pyramid','اختبارات','qa automation'], 'استراتيجية الاختبار توزع checks بحيث تمسك الخطأ في أرخص طبقة ممكنة وتحتفظ بحالات regression المهمة.', [
    'unit tests ممتازة للمنطق النقي، integration لاختبار حدود حقيقية، وE2E لرحلات حرجة قليلة.',
    'اختبار implementation details يجعل refactor البسيط يكسر tests بدون تغير behavior.',
    'contract tests مهمة عندما frontend/backend أو خدمات متعددة تتفق على schema.',
    'flaky test يستهلك الثقة ويجب تشخيصه بدل إعادة التشغيل حتى ينجح.',
    'security regression tests تحفظ payloads أو paths التي سببت ثغرة سابقة.',
    'test data يجب أن تكون صغيرة ومقروءة وتوضح سبب الحالة.'
  ], ['E2E لكل شيء','assert على تفاصيل داخلية','تجاهل flaky tests','تغطية رقمية كهدف'], ['حدد critical behaviors','اكتب unit للمنطق','integration للحدود','E2E للرحلات','أضف regressions','راقب flakiness'], ['expert-ai-evaluation','expert-devops-delivery','expert-security-appsec']),

  expert('expert-sre-observability', ['sre','observability','logging','metrics','tracing','slo','incident','مراقبة','سجل أخطاء'], 'SRE وobservability تجعلان حالة النظام قابلة للاستنتاج من metrics وlogs وtraces مرتبطة بطلب واحد.', [
    'SLO يحدد مستوى خدمة مستهدف ويمكن استخدام error budget لموازنة السرعة والموثوقية.',
    'metrics تخبرك أن مشكلة موجودة، logs تضيف تفاصيل، traces تربط رحلة request عبر المكونات.',
    'request ID يسهل ربط خطأ المستخدم بسجل backend وprovider.',
    'high-cardinality labels قد ترفع تكلفة metrics أو تجعلها غير قابلة للإدارة.',
    'alert جيد يشير لمشكلة تحتاج إجراء لا مجرد كل anomaly صغيرة.',
    'health check يجب أن يفرق بين process alive واعتماديات أساسية degraded.'
  ], ['alert على كل error منفرد','logs بلا request id','health=200 فقط','PII في logs'], ['حدد SLI/SLO','أضف request IDs','سجل structured events','قِس latency/errors','ابن dependency health','اضبط actionable alerts'], ['expert-incident-response','expert-cloud-architecture','expert-devops-delivery']),

  expert('expert-performance-engineering', ['performance engineering','profiling','latency','throughput','memory leak','profiling','تحسين أداء','بطء'], 'هندسة الأداء تبدأ بقياس bottleneck الحقيقي ثم تحسين المسار المسيطر مع الحفاظ على correctness.', [
    'p95/p99 قد تكشف تجربة سيئة لا تظهر في المتوسط.',
    'throughput وlatency قد يتعارضان قرب saturation.',
    'cache تحسن القراءة لكنها تضيف invalidation وstaleness يجب تصميمهما.',
    'memory leak في long-running process قد يظهر تدريجيًا تحت load لا في اختبار قصير.',
    'profiling قبل optimization يمنع قضاء وقت على مسار غير مؤثر.',
    'benchmark يجب أن يثبت البيانات والبيئة ويقارن baseline بنفس الشروط.'
  ], ['تحسين بالحدس','قياس average فقط','cache بلا invalidation','benchmark مختلف الظروف'], ['حدد workload','ثبت baseline','profile','حسن bottleneck واحد','اختبر correctness','قِس tail latency/resources','راقب production'], ['expert-web-performance','expert-distributed-systems','optimization']),

  expert('expert-financial-accounting', ['accounting','financial reporting','gaap','ifrs','journal entry','محاسبة','قوائم مالية','ميزانية'], 'المحاسبة المالية تربط المعاملة بالمستند والاعتراف والتصنيف والفترة ثم تسويتها إلى قوائم قابلة للمراجعة.', [
    'كل قيد يؤثر على معادلة المحاسبة ويجب أن يحافظ على توازن المدين والدائن.',
    'الاعتراف بالإيراد يعتمد على تحقق شروط الاعتراف لا مجرد استلام النقد.',
    'accrual accounting يفصل توقيت النشاط الاقتصادي عن حركة النقد.',
    'reconciliation تقارن دفترًا بمصدر مستقل لاكتشاف فروق أو أخطاء.',
    'materiality تؤثر في مستوى التفصيل والحكم لكنها لا تبرر إخفاء خطأ متعمد.',
    'audit trail القوي يربط الرقم بالمصدر والموافقة والتعديل.'
  ], ['cash=profit','قيد بلا supporting document','تسوية فرق بلا سبب','خلط estimate بالحقيقة'], ['حدد transaction','حدد accounts','حدد recognition period','سجل entry','صالح balances','راجع evidence','أغلق الفترة'], ['expert-financial-analysis','financial-controls','risk-management']),

  expert('expert-financial-analysis', ['financial analysis','ratio analysis','cash flow','margin','valuation','تحليل مالي','تدفق نقدي','ربحية'], 'التحليل المالي يربط الربحية والسيولة ورأس المال والعائد مع جودة الافتراضات لا رقم واحد منفرد.', [
    'ربح محاسبي موجب لا يضمن تدفقًا نقديًا تشغيليًا موجبًا.',
    'margin يجب فهم مكوناته وسياق القطاع وتغير mix لا مقارنة نسبة فقط.',
    'working capital قد يستهلك cash أثناء نمو شركة مربحة.',
    'ratio مفيد عند المقارنة الزمنية أو النظير بشرط تعريف متسق.',
    'DCF شديد الحساسية للنمو النهائي وdiscount rate لذلك scenario analysis ضروري.',
    'one-off items يجب فصلها بحذر مع توثيق سبب اعتبارها غير متكررة.'
  ], ['ratio بلا سياق','profit=cash','DCF رقم واحد','إزالة بنود غير مريحة كـone-off'], ['جمع statements','راجع quality/adjustments','حلل margins/cash','افحص working capital','قارن ratios','اختبر scenarios','اكتب drivers والمخاطر'], ['expert-financial-accounting','expert-unit-economics','decision-science']),

  expert('expert-unit-economics', ['unit economics','cac','ltv','gross margin','business model','اقتصاديات الوحدة','تكلفة اكتساب'], 'اقتصاديات الوحدة تختبر هل كل عميل أو معاملة تضيف قيمة بعد التكاليف المتغيرة قبل التوسع.', [
    'LTV يعتمد على retention/margin وليس revenue وحده.',
    'CAC يجب أن يشمل القنوات والتكاليف المرتبطة بالاكتساب حسب التعريف المختار.',
    'payback period مهم للسيولة حتى لو LTV/CAC يبدو جيدًا.',
    'متوسط blended قد يخفي قناة أو segment يخسر المال.',
    'growth قبل product-market fit قد يسرع الحرق بدل بناء ميزة.',
    'contribution margin أوضح من gross revenue عند تقييم توسع معاملة إضافية.'
  ], ['LTV متفائل بلا churn','CAC يستبعد مصاريف','average يخفي segments','scale قبل economics'], ['عرف unit','احسب variable cost','احسب contribution','حلل retention','احسب CAC/payback','قسم حسب segment/channel','اختبر sensitivity'], ['expert-product-management','expert-financial-analysis','marketing-strategy']),

  expert('expert-negotiation', ['negotiation','تفاوض','salary negotiation','offer','batna','راتب','عرض وظيفي'], 'التفاوض القوي يحدد المصالح والبدائل وحدود القبول ويصنع خيارات بدل تحويله لمعركة رقم واحد.', [
    'BATNA هي أفضل بديل لو لم يحدث اتفاق وتحدد قوة موقفك الواقعية.',
    'position مثل رقم راتب يخفي أحيانًا interests مثل المرونة أو scope أو سرعة البدء.',
    'الأسئلة تكشف قيود الطرف الآخر قبل تقديم تنازلات.',
    'التنازل المشروط أفضل من تنازل مجاني لأنه يبادل قيمة بقيمة.',
    'توثيق الاتفاق يمنع اختلاف الذاكرة بعد المحادثة.',
    'التهديد أو bluff غير الضروري قد يضر علاقة طويلة حتى لو كسب نقطة قصيرة.'
  ], ['رقم واحد فقط','تنازلات مجانية','bluff غير محسوب','موافقة بلا توثيق'], ['حدد الهدف والحد','حدد BATNA','افهم interests','قدم rationale','بادل concessions','لخص agreement','وثق'], ['career-strategy','sales','expert-leadership']),

  expert('expert-leadership', ['leadership','management','manager','قيادة','إدارة فريق','تفويض','delegation'], 'القيادة التشغيلية توضح النتيجة والملكية وحدود القرار ثم تبني feedback ومساءلة بدون micromanagement.', [
    'delegation تنقل مسؤولية التنفيذ مع وضوح outcome والقيود، لا مجرد تسليم task غامضة.',
    'decision rights تقلل التأخير عندما يعرف الفريق من يقرر ومن يستشار.',
    'feedback الفعال محدد للسلوك والأثر وقريب من الحدث.',
    'psychological safety لا تعني غياب المعايير بل القدرة على رفع المخاطر والأخطاء مبكرًا.',
    'one-on-one ليست status meeting فقط بل مساحة blockers وتطور وملاحظات متبادلة.',
    'المدير الذي يصبح bottleneck لكل قرار يحتاج تعديل النظام لا العمل ساعات أكثر.'
  ], ['تفويض بلا outcome','micromanagement','feedback شخصي عام','كل قرار عند المدير'], ['حدد outcomes','وزع ownership','حدد decision rights','أزل blockers','اعط feedback','راجع load/bottlenecks','طور الفريق'], ['expert-hiring','stakeholder-management','operations']),

  expert('expert-hiring', ['hiring','recruitment','interview process','توظيف','مقابلات','اختيار مرشح','job description'], 'التوظيف الجيد يبدأ بتعريف النجاح في الدور ثم يستخدم أدلة متسقة من work samples ومقابلات منظمة.', [
    'job description يجب أن يميز must-have من trainable skill حتى لا يضيق المرشحين بلا داعي.',
    'structured interview تقلل اختلاف الأسئلة والمعايير بين المرشحين.',
    'work sample قريب من العمل الحقيقي غالبًا أقوى من أسئلة عامة فقط.',
    'scorecard قبل المقابلة يقلل تحيز تغيير المعيار بعد رؤية المرشح.',
    'سنوات الخبرة proxy ضعيف إذا لم ترتبط بعمق المهارة والنتائج.',
    'reference أو background checks يجب أن تتبع القانون والسياسة وتحترم الخصوصية.'
  ], ['معيار يتغير لكل مرشح','culture fit غامض','سنوات=كفاءة','أسئلة غير مرتبطة بالدور'], ['حدد outcomes','ابن competencies','اكتب scorecard','استخدم structured questions','أضف work sample','اجمع evidence مستقل','قرر بالمعايير'], ['expert-leadership','career-strategy','expert-ai-evaluation']),

  expert('expert-operations-supply-chain', ['operations','supply chain','inventory','forecast','procurement','عمليات','مخزون','توريد'], 'العمليات وسلسلة التوريد توازن الخدمة والمخزون والوقت والتكلفة تحت طلب غير مؤكد واعتماديات متعددة.', [
    'inventory buffer يقلل stockout لكنه يربط رأس مال ويحمل مخاطر تلف أو تقادم.',
    'lead time variability قد تكون أخطر من متوسط lead time وحده.',
    'forecast error طبيعي ويجب ربط القرار بنطاق عدم يقين لا رقم واحد.',
    'bottleneck يحدد throughput للنظام حتى لو حسنت خطوات غير مقيدة.',
    'supplier concentration يرفع مخاطر الانقطاع رغم بساطة الإدارة.',
    'cycle counting يحسن دقة المخزون دون انتظار جرد شامل فقط.'
  ], ['forecast كنقطة يقين','مخزون أكثر دائمًا أفضل','تحسين غير bottleneck','مورد واحد بلا contingency'], ['قِس demand/lead variability','حدد service target','حدد bottleneck','اضبط reorder/buffer','راجع suppliers','راقب inventory accuracy','اختبر scenarios'], ['operations','risk-management','expert-financial-analysis']),

  expert('expert-troubleshooting-systems', ['troubleshooting','debugging','it support','windows','linux','network issue','حل مشكلة','تشخيص','مش شغال'], 'التشخيص الاحترافي يقلص مساحة الاحتمالات بتغييرات واحدة وقياسات قبل القفز لإعادة التثبيت أو الاستبدال.', [
    'الفرق بين last known good والحالة الحالية يقود لأقوى hypothesis غالبًا.',
    'إعادة الإنتاج تحت شروط محددة أهم من وصف عام مثل بطيء أو يعلق.',
    'غيّر متغيرًا واحدًا واحفظ النتيجة حتى تعرف ما الذي أثّر فعلًا.',
    'logs والـtimestamps تساعد ربط العرض بخدمة أو driver أو network event.',
    'workaround يعيد الإنتاجية لكنه لا يثبت root cause.',
    'بعد الإصلاح اختبر نفس السيناريو وحالات قريبة لمنع regression.'
  ], ['إعادة تثبيت أول خطوة','تغييرات كثيرة مرة واحدة','حل بلا verification','تجاهل آخر تغيير'], ['ثبت البيئة','حدد expected/actual','أعد الإنتاج','اجمع evidence','رتب hypotheses','اختبر الأرخص','تحقق ودوّن'], ['root-cause-analysis','expert-sre-observability','support-engineering']),

  expert('expert-search-ux', ['search ux','search interface','command palette','site search','بحث داخل الموقع','شريط بحث'], 'تجربة البحث الجيدة تجمع discoverability وranking واضح ومرادفات وتنفيذ سريع مع احترام الصلاحيات.', [
    'global search يجب أن يبحث في destinations والأدوات والمحتوى الذي يحق للمستخدم رؤيته فقط.',
    'synonyms والاختصارات تحسن الوصول عندما أسماء الواجهة تختلف عن كلمات المستخدم.',
    'recent/frequent actions مفيدة عند query فارغة لكن يجب ألا تزاحم التطابق القوي.',
    'keyboard shortcut يسرع الخبراء بينما زر مرئي يخدم discoverability.',
    'search result يجب أن يوضح أين سيذهب المستخدم وما نوع النتيجة.',
    'admin entries يجب ألا تظهر لغير admin حتى لو الصفحة نفسها محمية backend.'
  ], ['نتائج admin للجميع','بحث exact label فقط','قائمة نتائج بلا context','Ctrl+K بلا زر مرئي'], ['اجمع index مسموح','أضف aliases','score exact/prefix/contains','رتب frequency بحذر','وضح hints','اختبر permissions/mobile'], ['expert-ui-ux','expert-information-retrieval','expert-iam']),
];

const STOP = new Set(['the','and','for','with','from','that','this','into','على','الى','إلى','من','في','عن','مع','هذا','هذه','عايز','اريد','أريد','كيف','ايه','اي','what','how']);

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

function tokenSet(value) {
  return new Set(normalize(value).split(' ').filter((token) => token.length >= 2 && !STOP.has(token)));
}

function scoreExpert(entry, prompt, tool, mode, seedSet) {
  const text = normalize(`${prompt} ${tool} ${mode}`);
  const queryTokens = tokenSet(text);
  let score = 0;
  for (const trigger of entry.triggers || []) {
    const normalized = normalize(trigger);
    if (!normalized) continue;
    if (text.includes(normalized)) score += normalized.includes(' ') ? 10 : normalized.length >= 6 ? 7 : 4;
    else {
      const triggerTokens = tokenSet(normalized);
      let overlap = 0;
      for (const token of triggerTokens) if (queryTokens.has(token)) overlap += 1;
      score += overlap * 2.2;
    }
  }
  const domainTokens = tokenSet(`${entry.id} ${entry.summary} ${(entry.facts || []).slice(0, 4).join(' ')}`);
  let semanticOverlap = 0;
  for (const token of queryTokens) if (domainTokens.has(token)) semanticOverlap += 1;
  score += Math.min(10, semanticOverlap * 1.1);
  if (seedSet.has(entry.id)) score += 12;
  if (entry.related?.some((id) => seedSet.has(id))) score += 4;
  if (tool === 'qa' && /security|testing|troubleshooting|sre|architecture/.test(entry.id)) score += 4;
  if (tool === 'research' && /retrieval|evaluation|analytics|financial-analysis/.test(entry.id)) score += 3;
  if (tool === 'decide' && /financial|product|unit-economics|architecture/.test(entry.id)) score += 2;
  if (mode === 'work' && /product|leadership|hiring|financial|operations|architecture|api|security/.test(entry.id)) score += 2;
  if (mode === 'study' && /algorithms|llm|ml|data|testing|troubleshooting/.test(entry.id)) score += 2;
  return score;
}

export function retrieveExpertMaxKnowledge({ prompt, tool = 'ask', mode = 'general', limit = 8, seedIds = [] }) {
  const seedSet = new Set(seedIds);
  return LOCAL_EXPERTISE_MAX
    .map((entry) => ({ entry, score: scoreExpert(entry, prompt, tool, mode, seedSet) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id))
    .slice(0, Math.max(1, limit))
    .map(({ entry }) => entry);
}

export const LOCAL_EXPERTISE_MAX_STATS = {
  version: LOCAL_EXPERTISE_MAX_VERSION,
  domains: LOCAL_EXPERTISE_MAX.length,
  facts: LOCAL_EXPERTISE_MAX.reduce((sum, entry) => sum + entry.facts.length, 0),
  mistakes: LOCAL_EXPERTISE_MAX.reduce((sum, entry) => sum + entry.mistakes.length, 0),
  playbookSteps: LOCAL_EXPERTISE_MAX.reduce((sum, entry) => sum + entry.steps.length, 0),
};
