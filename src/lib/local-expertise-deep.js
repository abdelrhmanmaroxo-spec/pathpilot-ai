const specialist = (id, triggers, summary, facts, mistakes, steps, related = []) => ({
  id,
  triggers,
  summary,
  facts,
  mistakes,
  steps,
  related,
  pack: 'deep-specialist',
});

export const LOCAL_EXPERTISE_DEEP_VERSION = '2026.08.29-deep-v1';

export const LOCAL_EXPERTISE_DEEP = [
  specialist('deep-python-engineering', ['python','بايثون','pip','venv','asyncio','fastapi','django','flask','pandas'], 'هندسة Python الاحترافية تركز على وضوح العقود، إدارة البيئة والاعتماديات، الأداء، الاختبارات، واختيار sync/async بصورة صحيحة.', [
    'virtual environment تعزل الاعتماديات وتقلل اختلاف بيئة التطوير عن التشغيل.',
    'asyncio مفيد لعمليات I/O المتزامنة ولا يجعل CPU-bound code أسرع تلقائيًا.',
    'type hints تحسن أدوات الفحص والتوثيق لكنها لا تفرض الأنواع وقت التشغيل وحدها.',
    'context managers تقلل تسريب الملفات والاتصالات والموارد.',
    'generator يفيد في التدفق التدريجي ويقلل الذاكرة عند معالجة مجموعات كبيرة.',
    'profiling يحدد bottleneck قبل اللجوء إلى multiprocessing أو تحسينات معقدة.'
  ], ['global state غير منضبط','async لكل شيء','catch Exception بلا معالجة','requirements غير مثبتة'], ['ثبت البيئة','حدد interfaces','اكتب tests','قِس الأداء','اختر sync/async حسب I/O','راجع errors/resources'], ['expert-software-architecture','expert-testing-strategy','deep-api-backends']),

  specialist('deep-javascript-typescript', ['javascript','typescript','js','ts','node','event loop','promise','async await','npm'], 'JavaScript/TypeScript القوي يحتاج فهم event loop والـpromises والأنواع وحدود runtime بدل الاعتماد على syntax فقط.', [
    'Promise rejection غير المعالجة قد تصبح failure صامتة أو crash حسب البيئة.',
    'await داخل loop قد يجعل العمليات المتوازية متسلسلة دون قصد.',
    'TypeScript يختفي وقت runtime لذلك validation الخارجية ما زالت ضرورية.',
    'object mutation المشتركة تزيد أخطاء state خصوصًا في الواجهات المتزامنة.',
    'AbortController هو مسار قياسي لإلغاء fetch وعمليات متوافقة معه.',
    'package lockfile مهم لتكرار نفس dependency graph بين الأجهزة وCI.'
  ], ['اعتبار TypeScript validation runtime','Promise بلا catch','parallel work يتحول sequential','تعديل objects مشتركة بلا داعي'], ['حدد runtime','ثبت dependencies','اكتب types للعقود','validate الحدود','اختبر async failures','استخدم cancellation','راقب bundle/runtime'], ['expert-frontend-architecture','deep-api-backends','expert-testing-strategy']),

  specialist('deep-react-engineering', ['react','react hooks','useeffect','usestate','component','jsx','react performance'], 'React الاحترافي يدير state ownership وeffects وrender boundaries بحيث تظل الواجهة متوقعة وقابلة للاختبار.', [
    'Effect مناسب للمزامنة مع نظام خارجي وليس لحساب قيمة يمكن اشتقاقها أثناء render.',
    'state initializer يفيد للحساب المكلف أو قراءة أولية لا يجب تكرارها كل render.',
    'stale closure تظهر عندما callback يعتمد على قيم قديمة بسبب dependencies ناقصة.',
    'keys يجب أن تمثل هوية ثابتة للعنصر لا index عندما يمكن أن يعاد الترتيب.',
    'controlled inputs تسهل مزامنة القيمة لكنها قد تحتاج تقسيمًا عند forms ضخمة.',
    'memoization لها تكلفة ويجب استخدامها عند وجود render أو calculation مؤثر فعليًا.'
  ], ['setState مباشر داخل effect بلا حاجة','index key لقائمة متغيرة','effects بdependencies ناقصة','memo لكل component'], ['حدد state owner','احسب derived values مباشرة','استخدم effects للأنظمة الخارجية','اختبر loading/error','قِس renders','قسم الحدود الثقيلة'], ['expert-frontend-architecture','expert-web-performance','expert-accessibility']),

  specialist('deep-api-backends', ['node backend','express','http server','backend server','api server','middleware','server'], 'Backend موثوق يفصل parsing/validation/auth/business logic/data access ويضع حدودًا واضحة للمهل والحجم والأخطاء.', [
    'request body limit يقلل استهلاك الذاكرة وإساءة الاستخدام قبل وصول الطلب للمنطق.',
    'middleware order قد يحدد هل auth أو rate limit أو logging يطبق قبل route أم بعدها.',
    'timeout يجب أن يشمل dependency calls لا socket الخارجي فقط.',
    'structured error codes أفضل للعميل من تحليل نص الرسالة.',
    'graceful shutdown يمنع قطع requests وكتابات أثناء نشر نسخة جديدة.',
    'health endpoint العام يجب ألا يكشف secrets أو تفاصيل بنية غير لازمة.'
  ], ['route يحتوي كل المنطق','body بلا limit','stack trace للمستخدم','shutdown فوري'], ['حدد middleware order','validate input','طبق auth/rate limits','اعزل business/data','أضف timeouts','اختبر graceful shutdown'], ['expert-backend-api-design','expert-security-appsec','expert-sre-observability']),

  specialist('deep-networking', ['networking','tcp','udp','dns','http','https','latency','packet','شبكات','dns'], 'تشخيص الشبكات يفرق بين DNS والاتصال والنقل وTLS وHTTP والتطبيق بدل تسمية كل عطل مشكلة إنترنت.', [
    'DNS resolution قد ينجح بينما الاتصال بالمنفذ يفشل والعكس صحيح.',
    'TCP يضمن ترتيب stream لا حدود الرسائل التي أرسلها التطبيق.',
    'TLS يضيف مصادقة وتشفيرًا لكنه يعتمد على trust chain واسم المضيف والوقت.',
    'packet loss وretransmission قد يرفعان tail latency دون انقطاع كامل.',
    'HTTP 5xx يشير غالبًا لخادم أو upstream بينما 4xx يتعلق بالطلب أو الصلاحية حسب الكود.',
    'proxy/CDN/load balancer يضيف طبقات يجب تحديد أيها أعاد status أو أغلق الاتصال.'
  ], ['ping=كل الشبكة سليمة','كل timeout نفس السبب','DNS وTCP شيء واحد','تجاهل proxy layer'], ['حدد hostname/port','اختبر DNS','اختبر TCP/TLS','راجع HTTP status','قارن direct/proxy إن أمكن','طابق timestamps/logs'], ['expert-distributed-systems','deep-it-support','expert-sre-observability']),

  specialist('deep-operating-systems', ['windows','linux','macos','process','thread','memory','filesystem','نظام تشغيل','ويندوز','لينكس'], 'فهم نظام التشغيل يربط العمليات والذاكرة والملفات والصلاحيات والخدمات بالأعراض بدل الاعتماد على إعادة التشغيل فقط.', [
    'process وthread يختلفان في العزل ومشاركة الذاكرة والموارد.',
    'virtual memory تسمح بمساحة عناوين أكبر من RAM لكن الضغط الشديد قد يسبب paging وبطء.',
    'file permissions والownership قد تجعل تطبيقًا يعمل لمستخدم ويفشل كخدمة.',
    'service startup environment قد يختلف عن shell التفاعلي من PATH ومتغيرات وworking directory.',
    'disk full أو inode exhaustion قد يظهر كأخطاء كتابة غامضة.',
    'CPU usage منخفض لا ينفي bottleneck في I/O أو lock أو dependency خارجية.'
  ], ['reinstall أول حل','CPU فقط مقياس الأداء','تشغيل يدوي=الخدمة ستعمل','تجاهل disk/permissions'], ['حدد process/service','راجع resources','راجع permissions/environment','افحص logs','أعد الإنتاج','اختبر تغييرًا واحدًا'], ['deep-it-support','expert-performance-engineering','deep-networking']),

  specialist('deep-it-support', ['it support','technical support','computer troubleshooting','hardware issue','driver','دعم فني','كمبيوتر','تعريفات'], 'الدعم الفني القوي يجمع الأثر والبيئة وآخر تغيير ثم يعزل hardware/software/network قبل أي إصلاح كبير.', [
    'Safe mode أو clean boot قد يساعد في فصل driver/service conflict عن النظام الأساسي.',
    'SMART أو diagnostics تعطي إشارات أفضل من استنتاج تلف التخزين من البطء وحده.',
    'driver أحدث ليس دائمًا الأنسب إذا ظهر regression بعد التحديث.',
    'event logs تساعد في ربط freeze أو restart بخدمة أو driver أو hardware event.',
    'اختبار RAM يحتاج أدوات مناسبة ووقتًا كافيًا لأن الأخطاء قد تكون متقطعة.',
    'backup للبيانات الحرجة يسبق خطوات إصلاح قد تزيد خطر فقد البيانات.'
  ], ['format مباشرة','تحديث كل drivers مرة واحدة','استبدال hardware بلا test','نسيان backup'], ['احم البيانات','حدد آخر تغيير','اعزل software/hardware/network','اجمع logs/diagnostics','اختبر فرضية واحدة','ثبت الحل وأعد الاختبار'], ['expert-troubleshooting-systems','deep-operating-systems','deep-networking']),

  specialist('deep-cybersecurity-web', ['web security','owasp','xss','csrf','ssrf','sql injection','rce','cybersecurity','امن ويب','ثغرات'], 'أمن الويب يركز على حدود الثقة والتحقق والـencoding والصلاحيات ومنع انتقال بيانات غير موثوقة إلى sinks خطرة.', [
    'XSS يحدث عندما تتحول بيانات غير موثوقة إلى HTML/JS قابل للتنفيذ دون encoding/sanitization مناسب.',
    'CSRF يتعلق بإرسال متصفح المستخدم request موثقة دون قصده، وتخففه SameSite وCSRF tokens حسب التصميم.',
    'SSRF يستغل خادمًا للوصول لعناوين داخلية أو metadata ويحتاج URL allow/deny controls وnetwork restrictions.',
    'SQL injection يمنع أساسًا بالparameterized queries لا blacklist للكلمات.',
    'command injection يظهر عند بناء shell command من input غير موثوق دون تجنب shell أو escaping مضبوط.',
    'security headers طبقة مساعدة ولا تصلح authorization أو validation ناقص.'
  ], ['فلتر regex كحماية وحيدة','CORS=CSRF protection كامل','sanitize قبل التخزين لكل سياق','إخفاء endpoint كحماية'], ['حدد source/sink','استخدم safe APIs','طبق server authz','validate schema','encode حسب output context','اختبر abuse cases','راقب events'], ['expert-security-appsec','expert-threat-modeling','deep-api-backends']),

  specialist('deep-auth-oauth', ['oauth','oidc','google sign in','login','refresh token','access token','jwt','authentication','تسجيل دخول'], 'مصادقة OAuth/OIDC الصحيحة تتحقق من issuer/audience/expiry/state/nonce حسب التدفق وتفصل هوية المستخدم عن صلاحيات API.', [
    'ID token يثبت هوية ضمن OIDC بينما access token مخصص للوصول إلى API ولا يتبادلان الدور تلقائيًا.',
    'refresh token طويل العمر نسبيًا ويحتاج تخزينًا أشد حماية وإبطالًا عند الاشتباه.',
    'redirect URI يجب أن تطابق المسجل بدقة لتقليل سرقة authorization code.',
    'state تقلل login CSRF في تدفقات redirect، وPKCE يحمي authorization code خصوصًا للعملاء العموميين.',
    'audience يجب أن يطابق client المقصود لا مجرد أن التوقيع صحيح.',
    'ربط حساب اجتماعي ببريد موجود يحتاج قواعد تمنع account takeover.'
  ], ['استخدام access token كهوية بلا تحقق','تجاهل audience','refresh token في frontend storage بلا سبب','ربط بريد آلي بلا قواعد'], ['حدد flow','قلل scopes','ثبت redirect','تحقق issuer/aud/exp','استخدم state/PKCE حسب flow','صمم linking/revocation'], ['expert-iam','expert-privacy-engineering','deep-cybersecurity-web']),

  specialist('deep-ai-agents', ['ai agent','agents','agentic','tool use','function calling','agent','وكيل ذكاء','ادوات ai'], 'الـAI agents تحتاج حدود أدوات وصلاحيات وخطة تنفيذ ومراقبة لأن الخطأ يتحول من نص خاطئ إلى فعل خاطئ.', [
    'tool schema الضيق يقلل مساحة الأخطاء مقارنة بأداة عامة تقبل نصًا حرًا.',
    'read actions أقل خطورة عادة من write/delete/purchase وتحتاج مستويات تأكيد مختلفة.',
    'agent loop يحتاج حد خطوات ووقت وميزانية حتى لا يدور بلا نهاية.',
    'tool result غير موثوق وقد يحتوي prompt injection ويجب اعتباره data.',
    'idempotency مهمة عند إعادة محاولة write tool بعد timeout.',
    'audit trail يجب أن يسجل الأداة والنتيجة والقرار بدون secrets.'
  ], ['أداة shell عامة','write بلا confirmation','loop بلا budget','الثقة في tool output'], ['حدد goals/tools','قلل permissions','صمم schemas','أضف step/time budget','طبق confirmations','تحقق outputs','سجل actions'], ['expert-llm-engineering','expert-security-appsec','deep-function-calling']),

  specialist('deep-function-calling', ['function calling','tool calling','json schema','structured output','function call','استدعاء دوال'], 'Function calling يعتمد على schema واضح والتحقق بعد الموديل لأن structured output يقلل الغموض لكنه لا يضمن صحة المعنى.', [
    'required fields يجب أن تعكس ما لا يمكن تنفيذ الأداة بدونه.',
    'enum يقلل القيم غير المتوقعة عندما المساحة محدودة فعلاً.',
    'model arguments يجب أن تمر validation server-side قبل التنفيذ.',
    'tool error يجب أن يعاد للنموذج بصورة منظمة دون كشف secrets.',
    'اختيار tool خاطئ يحتاج eval منفصل عن صحة arguments.',
    'nested schemas المعقدة جدًا قد تزيد أخطاء الموديل دون فائدة.'
  ], ['تنفيذ arguments مباشرة','schema permissive جدًا','كل شيء required','error raw من backend'], ['حدد tool purpose','صمم minimal schema','validate arguments','طبق authorization','نفذ','رجع structured result','قيّم tool selection/arguments'], ['deep-ai-agents','expert-prompt-engineering','expert-ai-evaluation']),

  specialist('deep-nlp', ['nlp','tokenization','embedding','text classification','sentiment','language model','معالجة لغة','نصوص'], 'NLP يجمع تمثيل النص مع task/evaluation مناسبين، ويحتاج حساسية للغة واللهجة والتقطيع والتحيز في البيانات.', [
    'tokenization قد يجزئ العربية والأسماء والكود بصورة مختلفة حسب النموذج ويؤثر على التكلفة والجودة.',
    'embedding similarity لا تعني تطابق الحقيقة أو النية في كل السياقات.',
    'class imbalance قد يجعل accuracy مرتفعة رغم فشل الفئة النادرة المهمة.',
    'dialect shift بين تدريب واستخدام فعلي يخفض الجودة حتى لو اللغة واحدة.',
    'normalization العربي قد يحسن search لكنه قد يفقد فروقًا مهمة لو طُبق بلا سياق.',
    'human evaluation ضروري للمهام التي يصعب اختزال الجودة فيها إلى metric واحد.'
  ], ['accuracy فقط','normalization عدواني','embedding=فهم كامل','تجاهل dialect'], ['حدد task/labels','راجع data distribution','ثبت preprocessing','اختر metrics متعددة','اختبر dialect/edge cases','راجع بشرية'], ['expert-ai-evaluation','expert-information-retrieval','deep-arabic-language-qa']),

  specialist('deep-computer-vision', ['computer vision','image classification','object detection','ocr','vision model','رؤية حاسوبية','صور'], 'Computer vision يحتاج تعريف المهمة والبيانات والـaugmentation والـmetrics بما يتوافق مع أخطاء الواقع لا dataset فقط.', [
    'classification وdetection وsegmentation مهام مختلفة ومقياسها المناسب يختلف.',
    'data leakage بين صور متشابهة جدًا في train/test قد يضخم الأداء.',
    'lighting/camera/domain shift قد يخفض الجودة في الإنتاج.',
    'precision/recall tradeoff يعتمد على تكلفة false positive مقابل false negative.',
    'OCR quality تتأثر بالدقة واللغة والتدوير والضوضاء والتخطيط.',
    'visual hallucination في multimodal models تحتاج تحقق من الصورة لا الثقة اللغوية.'
  ], ['split عشوائي مع near-duplicates','accuracy لكل المهام','تجاهل domain shift','ثقة لغوية=رؤية صحيحة'], ['حدد task/error cost','نظف/split البيانات','اختر metric','اختبر augment/domain','حلل confusion/errors','راقب production drift'], ['expert-ml-engineering','expert-ai-evaluation','deep-multimodal-evaluation']),

  specialist('deep-multimodal-evaluation', ['multimodal evaluation','image evaluation','audio evaluation','video evaluation','speech to speech','تقييم صور','تقييم صوت','تقييم فيديو'], 'تقييم الأنظمة متعددة الوسائط يفصل فهم المحتوى عن جودة الإشارة والتعليمات والتزامن وسلامة الاستنتاج.', [
    'تقييم الصوت يشمل الوضوح والنطق والطبيعية والضوضاء والانقطاع إضافة لصحة المحتوى.',
    'الفيديو يحتاج ربط الادعاء بإطار/زمن صحيح لا وصف عام للمشهد.',
    'side-by-side preference يجب أن تستند rubric لا مجرد الأسلوب المفضل.',
    'instruction following يمكن أن يفشل رغم factual accuracy والعكس.',
    'turn-taking والانقطاع في speech systems جودة تفاعل مستقلة عن جودة النص.',
    'artifact تقني في الصورة أو الصوت قد يغير الحكم حتى لو المعنى مفهوم.'
  ], ['تقييم المحتوى فقط','تفضيل النبرة بلا rubric','خلط audio quality مع factuality','نسيان temporal grounding'], ['حدد dimensions','ثبت rubric','راجع signal/content منفصلين','قارن evidence','سجل failure category','راجع disagreements'], ['expert-ai-evaluation','deep-computer-vision','deep-arabic-language-qa']),

  specialist('deep-arabic-language-qa', ['arabic qa','arabic language','egyptian arabic','لهجة مصرية','لغة عربية','تعريب','localization'], 'جودة العربية تحتاج تمييز الفصحى واللهجة والسياق والاتجاه والمصطلحات والتطبيع بدون قتل طبيعة النص.', [
    'اللغة المطلوبة قد تكون عربية فصحى أو مصرية أو خليطًا مهنيًا ويجب احترام نبرة المستخدم.',
    'RTL ليس مجرد text-align؛ ترتيب الأيقونات والأرقام والحقول المختلطة يحتاج اختبارًا.',
    'الأسماء والمنتجات والأكواد قد تبقى LTR داخل سياق عربي دون ترجمة.',
    'الترجمة الحرفية للمصطلح التقني قد تكون أقل وضوحًا من إبقاء المصطلح الشائع مع شرح عربي.',
    'normalization لألف/همزات مفيد للبحث لكنه لا يجب أن يغير النص الأصلي المعروض.',
    'واجهة English يجب ألا تعتمد على ترجمة DOM متأخرة للنصوص الديناميكية الحساسة فقط.'
  ], ['خلط لهجة بلا سبب','ترجمة أسماء المنتجات','RTL=text-align فقط','تعديل النص الأصلي لأجل search'], ['حدد locale/tone','افصل display عن search normalization','اختبر RTL/LTR mixed','راجع المصطلحات','اختبر dynamic UI','اعمل coverage'], ['deep-nlp','expert-accessibility','expert-search-ux']),

  specialist('deep-data-annotation', ['data annotation','labeling','annotation','human in the loop','hitl','تصنيف بيانات','وسم بيانات'], 'Data annotation عالية الجودة تحتاج guideline قابلة للتطبيق، أمثلة حدودية، calibration، وقياس اتفاق المراجعين.', [
    'تعريف label يجب أن يحدد inclusion/exclusion وليس اسمًا مختصرًا فقط.',
    'edge cases يجب أن تدخل guideline بعد ظهورها بدل بقائها معرفة شفوية.',
    'inter-annotator agreement يكشف غموض المهمة أو اختلاف التدريب.',
    'gold questions تفيد لضبط الجودة لكن يجب ألا تصبح سهلة التخمين.',
    'adjudication يحل الخلاف ويوثق القاعدة الجديدة للمستقبل.',
    'sampling للمراجعة يجب أن يركز أكثر على المخاطر والـnew annotators والحالات الصعبة.'
  ], ['guideline بلا أمثلة','accuracy من annotator واحد','تغيير قاعدة شفهي','مراجعة عشوائية فقط'], ['عرف labels','ابن examples/edge cases','درب/calibrate','قِس agreement','adjudicate','حدث guideline','راقب drift'], ['expert-ai-evaluation','deep-arabic-language-qa','quality-management']),

  specialist('deep-qa-manual-automation', ['qa testing','manual testing','test case','bug report','regression testing','quality assurance','اختبار جودة'], 'QA فعالة تربط المخاطر بحالات اختبار وتفصل exploratory عن regression وتوثق evidence قابل لإعادة الإنتاج.', [
    'test case الجيد يوضح preconditions/data/steps/expected result دون تفاصيل زائدة غير مؤثرة.',
    'severity تصف أثر العيب بينما priority تعكس أولوية إصلاحه ويمكن أن يختلفا.',
    'exploratory testing مفيد لاكتشاف مخاطر لم تُكتب في حالات مسبقة.',
    'automation يناسب checks المتكررة والمستقرة أكثر من UI سريع التغير.',
    'regression suite يجب أن تحمي الوظائف الحرجة والأخطاء السابقة لا أن تتضخم بلا صيانة.',
    'bug report بدون environment/evidence قد يستهلك وقت إعادة الاكتشاف.'
  ], ['automation لكل شيء','severity=priority','خطوات ناقصة','regression بلا pruning'], ['حدد risk areas','اكتب critical cases','اختبر exploratory','وثق defects','أتمت المستقر','راجع regression suite','قِس escaped defects'], ['expert-testing-strategy','root-cause-analysis','deep-multimodal-evaluation']),

  specialist('deep-career-applications', ['job application','resume','cv','linkedin','cover letter','interview','تقديم وظيفة','سيرة ذاتية','لينكدان'], 'التقديم الوظيفي القوي يطابق الخبرة الحقيقية مع متطلبات الدور ويقلل الادعاءات العامة ويستخدم أدلة قابلة للدفاع عنها.', [
    'CV لكل دور يجب أن يبرز الخبرات الأقرب للمطلوب بدل إعادة كتابة التاريخ كله.',
    'ATS keywords مفيدة عندما تعكس خبرة حقيقية، والحشو قد يضر المقروئية والمصداقية.',
    'bullet قوي يبدأ بفعل ونطاق ونتيجة أو قيمة، مع رقم فقط إذا كان موثقًا.',
    'cover letter الجيد يربط 2-3 نقاط fit محددة بدل إعادة CV كنثر.',
    'LinkedIn headline يجب أن يوضح التخصص والقيمة لا حالة البحث عن وظيفة فقط.',
    'المقابلة تختبر القدرة على شرح القرار والـtradeoff وراء الخبرة المكتوبة.'
  ], ['metrics مختلقة','CV واحد لكل الوظائف','keyword stuffing','cover letter عامة'], ['حلل الوصف','استخرج must-haves','طابق evidence','أعد ترتيب CV','راجع claims','جهز أمثلة مقابلة','خصص الرسالة'], ['career-strategy','expert-hiring','expert-negotiation']),

  specialist('deep-financial-modeling', ['financial modeling','valuation','dcf','forecast model','excel model','نموذج مالي','تقييم شركة','توقعات مالية'], 'Financial modeling الجيد يجعل drivers والافتراضات منفصلة وقابلة للتدقيق ويختبر الحساسية بدل إنتاج رقم نهائي زائف الدقة.', [
    'revenue forecast يجب أن يرتبط drivers مثل volume/price/users لا نسبة نمو معزولة عندما تتوفر بيانات.',
    'three-statement model يحتاج روابط منطقية بين income statement وbalance sheet وcash flow.',
    'circular references قد تكون مقصودة في debt/interest لكنها تحتاج معالجة واضحة.',
    'scenario/sensitivity تظهر أثر عدم اليقين أفضل من base case واحد.',
    'hardcodes المبعثرة تجعل audit والتحديث أصعب من assumption section مركزية.',
    'check lines مثل balance sheet balance وcash roll-forward تكشف أخطاء الربط.'
  ], ['hardcodes داخل formulas','base case فقط','خلط units','نموذج بلا checks'], ['حدد drivers','افصل assumptions','ابن schedules','اربط statements','أضف checks','اختبر scenarios','راجع reasonableness'], ['expert-financial-analysis','expert-financial-accounting','deep-spreadsheets']),

  specialist('deep-spreadsheets', ['excel','google sheets','spreadsheet','formula','pivot table','vlookup','xlookup','جداول بيانات','اكسل'], 'هندسة الجداول تقلل الأخطاء بفصل raw data عن calculations عن output واستخدام formulas قابلة للمراجعة.', [
    'structured tables/ranges تجعل الصيغ أوضح وأكثر مقاومة لإضافة صفوف.',
    'XLOOKUP أو INDEX/MATCH غالبًا أكثر وضوحًا من VLOOKUP عندما عمود الإرجاع ليس يمين المفتاح.',
    'pivot tables ممتازة للتجميع السريع لكنها لا تستبدل تنظيف وتعريف البيانات.',
    'volatile functions قد تزيد إعادة الحساب في ملفات كبيرة.',
    'data validation تقلل إدخالات غير متوقعة قبل وصولها للصيغ.',
    'الألوان وحدها ليست control؛ checks وصيغ تحقق أفضل للتدقيق.'
  ], ['دمج raw/output','صيغ hardcoded طويلة','manual copy/paste متكرر','اعتماد على اللون'], ['نظف raw data','ثبت keys/types','افصل calculation layer','استخدم lookups واضحة','أضف validation/checks','ابن output/pivots','راجع edge cases'], ['deep-financial-modeling','expert-analytics-engineering','expert-data-engineering']),

  specialist('deep-project-delivery', ['project management','delivery','milestone','dependency','deadline','مشروع','إدارة مشروع','تسليم'], 'إدارة التسليم تحول الهدف إلى milestones وdependencies وowners ومخاطر مع تحديث مستمر للحالة لا خطة جامدة فقط.', [
    'critical path يحدد سلسلة الأنشطة التي تؤثر مباشرة على تاريخ الانتهاء.',
    'status الأخضر بدون evidence أو milestone قابلة للقياس قد يخفي تأخيرًا.',
    'dependency خارج الفريق تحتاج owner وموعد متابعة وcontingency.',
    'scope change يجب أن يوضح أثره على الوقت والتكلفة والجودة بدل امتصاصه بصمت.',
    'buffer يوضع حيث عدم اليقين مؤثر لا توزيعه بالتساوي دائمًا.',
    'definition of done يقلل اختلاف معنى اكتمال المهمة بين الفريق.'
  ], ['كل المهام high priority','status بالانطباع','scope يزيد بلا tradeoff','dependencies بلا owner'], ['حدد outcome','قسم milestones','ارسم dependencies','حدد owners','سجل risks','تابع critical path','أعد التخطيط عند التغيير'], ['project-management','expert-leadership','expert-devops-delivery']),

  specialist('deep-business-strategy', ['business strategy','competitive advantage','market entry','moat','strategy','استراتيجية عمل','ميزة تنافسية'], 'الاستراتيجية تحدد أين تنافس وكيف تفوز وما الذي لن تفعله، مع اختبار assumptions عن السوق والقدرات والاقتصاديات.', [
    'ميزة تنافسية يجب أن تنتج قيمة أو تكلفة يصعب على المنافس تقليدها، لا مجرد feature قابلة للنسخ.',
    'TAM الكبير لا يثبت أن segment الأول مناسب للدخول.',
    'distribution قد تكون ميزة أقوى من المنتج في بعض الأسواق.',
    'tradeoffs تصنع استراتيجية أوضح لأن محاولة خدمة كل segment تضعف positioning.',
    'capability موجودة داخليًا قد تحدد ما يمكن تنفيذه أسرع من فرصة جذابة نظريًا.',
    'scenario planning أفضل عندما عوامل خارجية قد تغير economics جذريًا.'
  ], ['strategy=قائمة أهداف','TAM=فرصة مضمونة','كل العملاء target','ميزة بلا دفاعية'], ['حدد customer/problem','حدد alternatives','حلل economics/distribution','حدد advantage hypothesis','اختر tradeoffs','اختبر assumptions','راجع scenarios'], ['expert-product-management','expert-unit-economics','marketing-strategy']),

  specialist('deep-content-video', ['video editing','premiere','capcut','motion graphics','editing','مونتاج','فيديو','سكريبت فيديو'], 'المحتوى المرئي الجيد يربط الإيقاع واللقطة والصوت والنص بالرسالة بدل إضافة مؤثرات لمجرد وجودها.', [
    'shot change يخدم تغير معنى أو إيقاع ولا يحتاج مدة ثابتة لكل الفيديو.',
    'sound design يوجه الانتباه ويعزز transition لكن كثرة المؤثرات تضعفها.',
    'motion text يجب أن يبقى مقروءًا ومرتبطًا بالكلمة أو الفكرة المهمة.',
    'B-roll الجيد يضيف معنى أو دليلًا بدل تكرار ما يقوله الصوت حرفيًا دائمًا.',
    'loudness والوضوح أهم من موسيقى مرتفعة تخفي التعليق الصوتي.',
    'export settings يجب أن تطابق المنصة والدقة ومعدل الإطارات للمصدر قدر الإمكان.'
  ], ['transition لكل cut','مؤثرات صوت كثيرة','نص صغير سريع','B-roll حرفي فقط'], ['حدد message beats','قسم audio','اختر visual لكل beat','اضبط pacing','أضف text/sfx باعتدال','راجع الصوت','صدر واختبر'], ['content-strategy','expert-ui-ux','deep-career-applications']),

  specialist('deep-research-reasoning', ['research methods','evidence synthesis','literature review','scientific research','منهج بحث','مراجعة أدبيات'], 'البحث القوي يحول السؤال إلى claims، يجمع أدلة مستقلة، يزن المنهج والجودة، ثم يركب ما هو معروف وما هو مختلف عليه.', [
    'مصدران ينقلان نفس الخبر الأصلي ليسا دليلين مستقلين.',
    'study design يحدد نوع الاستنتاج الممكن أكثر من حجم العينة وحده.',
    'systematic review قوية بقدر جودة الدراسات ومعايير inclusion والبحث.',
    'publication bias يجعل النتائج المنشورة غير ممثلة لكل ما تم اختباره أحيانًا.',
    'effect size وconfidence interval أكثر فائدة من significant/not significant فقط.',
    'تعارض الدراسات قد ينتج من population أو measurement أو intervention مختلفة لا أن واحدة خاطئة بالضرورة.'
  ], ['عد المصادر بدل استقلالها','sample size=جودة','p-value كخلاصة','إخفاء تعارض الأدلة'], ['حدد claims','ابحث primary evidence','صنف design/quality','استخرج effect/uncertainty','قارن populations/methods','ركب consensus/conflict','حدد gaps'], ['source-evaluation','statistics-advanced','expert-ai-evaluation']),

  specialist('deep-probability-decision', ['probability','expected value','risk','bayesian decision','احتمالات','قيمة متوقعة','قرار تحت عدم اليقين'], 'القرار تحت عدم اليقين يربط الاحتمال بحجم النتيجة وقابلية الرجوع والمعلومات الجديدة الممكن جمعها.', [
    'expected value قد يخفي downside غير مقبول إذا التوزيع واسع أو الخسارة كارثية.',
    'base rate مهم قبل تفسير signal أو test جديد.',
    'value of information يحدد هل يستحق تأخير القرار لجمع معلومة إضافية.',
    'reversible decision يسمح تجربة أصغر أسرع من irreversible decision.',
    'sensitivity analysis تكشف أي assumption يغير النتيجة فعليًا.',
    'probability qualitative range أفضل من رقم مخترع عندما البيانات ناقصة.'
  ], ['EV فقط','تجاهل base rate','رقم احتمالي وهمي','كل القرارات تحتاج نفس اليقين'], ['حدد outcomes','قدر ranges','احسب/قارن expected impact','افحص downside','اختبر sensitivity','قيم value of info','اختر action/review point'], ['bayesian-reasoning','decision-science','risk-management']),

  specialist('deep-ai-product-design', ['ai product','ai ux','human ai interaction','copilot','ai assistant product','منتج ذكاء','مساعد ذكي'], 'تصميم منتج AI ناجح يوضح متى يثق المستخدم ومتى يتحقق ويجعل الفشل والاسترجاع جزءًا من UX لا حالة نادرة.', [
    'عرض حالة البحث أو المعالجة يفيد أكثر من spinner صامت عندما الانتظار طويل.',
    'confidence UI يجب ألا يعطي أرقامًا زائفة لا ترتبط بتقييم حقيقي.',
    'source presentation يجب أن تساعد التحقق بدل تحويل الواجهة إلى قائمة روابط.',
    'fallback يجب أن يوضح حدود freshness والجودة بدون إغراق المستخدم بالتفاصيل الداخلية.',
    'edit/regenerate/stop تقلل تكلفة الخطأ وتجعل النظام قابلًا للتوجيه.',
    'feedback capture أفضل عندما يربط التقييم بنوع failure محدد قدر الإمكان.'
  ], ['إخفاء كل الفشل','confidence وهمي','عرض internals بدل الفائدة','لا user control'], ['حدد user jobs','حدد trust boundaries','صمم loading/failure states','أضف edit/stop/retry','اعرض evidence مناسب','اجمع feedback','قِس task success'], ['expert-product-management','expert-ui-ux','expert-ai-evaluation']),
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

function tokenSet(value) {
  return new Set(normalize(value).split(' ').filter((token) => token.length > 1));
}

function score(entry, prompt, tool, mode, seeds) {
  const text = normalize(`${prompt} ${tool} ${mode}`);
  const query = tokenSet(text);
  let total = 0;
  for (const trigger of entry.triggers || []) {
    const term = normalize(trigger);
    if (text.includes(term)) total += term.includes(' ') ? 11 : 7;
    else {
      const triggerTokens = tokenSet(term);
      let overlap = 0;
      for (const token of triggerTokens) if (query.has(token)) overlap += 1;
      total += overlap * 2;
    }
  }
  const bodyTokens = tokenSet(`${entry.id} ${entry.summary} ${(entry.facts || []).slice(0, 4).join(' ')}`);
  let overlap = 0;
  for (const token of query) if (bodyTokens.has(token)) overlap += 1;
  total += Math.min(10, overlap);
  if (seeds.has(entry.id)) total += 10;
  if (entry.related?.some((id) => seeds.has(id))) total += 3;
  if (tool === 'qa' && /qa|security|support|operating|network/.test(entry.id)) total += 3;
  if (tool === 'cv' && /career/.test(entry.id)) total += 5;
  if (mode === 'work' && /project|business|career|financial|spreadsheet|qa/.test(entry.id)) total += 2;
  return total;
}

export function retrieveDeepExpertise({ prompt, tool = 'ask', mode = 'general', limit = 8, seedIds = [] }) {
  const seeds = new Set(seedIds);
  return LOCAL_EXPERTISE_DEEP
    .map((entry) => ({ entry, score: score(entry, prompt, tool, mode, seeds) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id))
    .slice(0, Math.max(1, limit))
    .map(({ entry }) => entry);
}

export const LOCAL_EXPERTISE_DEEP_STATS = {
  version: LOCAL_EXPERTISE_DEEP_VERSION,
  domains: LOCAL_EXPERTISE_DEEP.length,
  facts: LOCAL_EXPERTISE_DEEP.reduce((sum, entry) => sum + entry.facts.length, 0),
  mistakes: LOCAL_EXPERTISE_DEEP.reduce((sum, entry) => sum + entry.mistakes.length, 0),
  playbookSteps: LOCAL_EXPERTISE_DEEP.reduce((sum, entry) => sum + entry.steps.length, 0),
};
