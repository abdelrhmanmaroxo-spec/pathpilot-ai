# PathPilot AI

> مساعد عربي عام للدراسة والعمل والمهام اليومية — موقع وPWA قابل للتثبيت، مع Backend وحسابات وتحليلات ولوحة إدارة جاهزة للنشر.

[![CI](https://github.com/abdelrhmanmaroxo-spec/pathpilot-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/abdelrhmanmaroxo-spec/pathpilot-ai/actions/workflows/ci.yml)
[![PWA](https://img.shields.io/badge/PWA-installable-6d5dfc)](https://abdelrhmanmaroxo-spec.github.io/pathpilot-ai/)
[![React](https://img.shields.io/badge/React-19-149eca)](https://react.dev/)

## ما الذي يقدمه؟

PathPilot يقسم الطلبات إلى ثلاث مساحات و18 أداة:

- **Universal Workspace:** سؤال عام، إعادة كتابة، توليد أفكار، مقارنة قرارات، تنظيم، وصناعة محتوى.
- **Study Workspace:** شرح، تلخيص، خطة مذاكرة، اختبار، بطاقات مراجعة، وخريطة بحث.
- **Work Workspace:** بريد احترافي، مهام، اجتماع، CV bullets، خطاب تقديم، وتقارير QA/Bug Reports.

ويحتوي كذلك على **PathPilot Chat** التجريبي لحسابات Admin وOwner: محادثات محفوظة، استكمال طبيعي للسياق، مطابقة تلقائية لنوع السؤال، بحث وتحليل عند الحاجة، وبث حي للإجابة من الخادم أو من نموذج WebLLM المحلي على الأجهزة المدعومة.

النسخة العامة تعمل حاليًا في **وضع محلي غير مدعوم بنموذج AI حقيقي**، وتعرض ذلك للمستخدم بوضوح. عند نشر الخادم وإضافة مفتاح المزود في أسرار الاستضافة، تتحول الطلبات إلى Live AI تلقائيًا؛ وإذا توقف الخادم يظل الوضع المحلي متاحًا.

## النسخة العامة والتثبيت

افتح [PathPilot AI Live](https://abdelrhmanmaroxo-spec.github.io/pathpilot-ai/) من أي جهاز.

- **Windows:** Chrome أو Edge ثم Install من شريط العنوان.
- **Android:** Chrome ثم Install app أو Add to Home screen.
- **iPhone / iPad:** Safari ثم Share ثم Add to Home Screen.
- يمكن استخدامه كموقع عادي، وتظل واجهة التطبيق والوظائف المحلية متاحة بعد أول زيارة عند ضعف الاتصال.

## المنصة الكاملة

المستودع يحتوي على طبقتين منفصلتين:

- **Frontend:** React 19 + Vite، RTL، PWA، 18 أداة، تخصيص، سجل محلي، مشاركة، تنزيل، تقييمات، وحالة اتصال واضحة.
- **Backend:** Node HTTP server، SQLite، حسابات، جلسات مشفرة، صلاحية Admin، تحليلات فعلية، سجل أخطاء، Feedback، Rate limiting، CORS، وAI provider adapter.

لوحة `PathPilot Admin` لا تعرض بيانات تجريبية. المقاييس تأتي من قاعدة البيانات وتشمل:

- إجمالي المستخدمين والنشطين اليوم.
- عدد طلبات AI ونسبة النجاح.
- استخدام مساحات General وStudy وWork.
- حالة قاعدة البيانات ومزود AI والموديل.
- المستخدمين والأخطاء والتقييمات.

## التشغيل محليًا

```bash
npm install
npm run dev
```

تشغيل الخادم في Terminal أخرى:

```bash
npm run server
```

الفحص الكامل قبل النشر:

```bash
npm run check
```

## تفعيل الحسابات والتحليلات وLive AI

1. انشر مجلد المشروع على استضافة تدعم Node وقرصًا دائمًا لملف SQLite.
2. أضف القيم التالية في **Encrypted Secrets** الخاصة بالاستضافة، لا داخل GitHub أو كود الواجهة:

```env
AI_API_KEY=your-secret-provider-key
AI_PROVIDER=OpenAI
AI_MODEL=your-model-name
AI_BASE_URL=https://api.openai.com/v1
AI_API_MODE=chat-completions
ALLOWED_ORIGINS=https://abdelrhmanmaroxo-spec.github.io,http://localhost:5173
ADMIN_EMAIL=your-admin-email@example.com
DATABASE_PATH=server/data/pathpilot.sqlite
PORT=8787
```

3. ابنِ الواجهة بالقيم العامة فقط:

```env
VITE_PLATFORM_API_URL=https://your-backend.example.com
VITE_AI_API_URL=https://your-backend.example.com/api/assistant
```

الحساب الذي يُنشأ بنفس `ADMIN_EMAIL` يأخذ صلاحية Admin. لا يوجد مفتاح داخل المتصفح أو المستودع. راجع [دليل الخادم](server/README.md) لكل الإعدادات.

## الأمان والخصوصية

- كلمات المرور محفوظة بصيغة `scrypt` مع salt، والجلسات لا تحفظ التوكن الخام في قاعدة البيانات.
- مفاتيح AI تقرأ في الخادم فقط.
- CORS يسمح بالنطاقات المحددة فقط، مع حدود للطلبات والتحقق من المدخلات.
- وضع العرض المحلي لا يرفع محتوى المستخدم إلى خادم خارجي.
- عند تفعيل الخادم تُسجل أحداث الاستخدام التشغيلية اللازمة للتحليلات، ولا تُحفظ نصوص طلبات AI في جداول التحليلات.
- التطبيق ينبه المستخدم إلى التحقق من القرارات الطبية والقانونية والمالية عالية المخاطر.

## البناء والنشر

```bash
npm run build
npm run preview
```

GitHub Actions يفحص المشروع وينشر الواجهة على GitHub Pages. لأن Pages استضافة Static، يجب نشر `server/` على استضافة Node منفصلة لتفعيل الحسابات وقاعدة البيانات وLive AI للعامة.

## المطور

**Abdelrhman Essam** — AI Quality & Full-Stack Developer
[LinkedIn](https://www.linkedin.com/in/abdelrhman-essam-vib/) · [GitHub](https://github.com/abdelrhmanmaroxo-spec)
