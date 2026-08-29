# PathPilot AI

> منصة عربية ذكية تساعد الطالب في الجامعة، ثم ترافقه إلى بيئة العمل — كتطبيق ويب قابل للتثبيت.

[![CI](https://github.com/abdelrhmanmaroxo-spec/app/actions/workflows/ci.yml/badge.svg)](https://github.com/abdelrhmanmaroxo-spec/app/actions/workflows/ci.yml)
[![PWA](https://img.shields.io/badge/PWA-installable-6d5dfc)](https://github.com/abdelrhmanmaroxo-spec/app)
[![React](https://img.shields.io/badge/React-19-149eca)](https://react.dev/)

## لماذا PathPilot؟

المشروع يجمع مسارين في تجربة واحدة واضحة:

- **Study Workspace:** شرح المفاهيم، تلخيص الملاحظات، إنشاء خطة مذاكرة، وتوليد أسئلة مراجعة.
- **Work Workspace:** كتابة بريد احترافي، تحويل الأهداف إلى مهام، تلخيص الاجتماعات، وصياغة إنجازات للسيرة الذاتية دون اختلاق أرقام.

يعمل التطبيق فورًا في **Smart Demo Mode** من دون مفاتيح سرية، ويمكن ربطه بواجهة AI حقيقية من خلال متغير بيئة واحد. البيانات والسجل محفوظان محليًا في متصفح المستخدم.

## أبرز النقاط التقنية

- React 19 + Vite 8
- واجهة عربية RTL متجاوبة ومراعية لإمكانية الوصول
- PWA قابلة للتثبيت مع Service Worker ودعم Offline
- AI provider adapter مع fallback محلي آمن للعرض
- سجل محلي، نسخ النتائج، وتنزيلها كنص
- ESLint + اختبارات Node + GitHub Actions CI
- GitHub Pages deployment workflow

## التشغيل محليًا

```bash
npm install
npm run dev
```

الفحص قبل الدمج:

```bash
npm run check
```

## ربط AI حقيقي

أنشئ ملف `.env.local`:

```env
VITE_AI_API_URL=https://your-secure-backend.example.com/assistant
```

يرسل التطبيق طلب `POST` بالشكل التالي:

```json
{
  "mode": "study",
  "tool": "explain",
  "prompt": "اشرح مفهوم التعلّم العميق"
}
```

ويستقبل:

```json
{
  "answer": "..."
}
```

> لا تضع مفتاح مزود الذكاء الاصطناعي داخل متغيرات Vite أو كود الواجهة. المفتاح يجب أن يبقى في Backend آمن.

## البناء والنشر

```bash
npm run build
npm run preview
```

Workflow النشر موجود في `.github/workflows/deploy-pages.yml` ويجهّز التطبيق لـGitHub Pages.

## الخصوصية

- لا يرفع وضع العرض المحلي أي محتوى إلى خادم خارجي.
- عند تفعيل AI API، تظهر للمستخدم حالة الاتصال بوضوح.
- المستندات والنتائج لا تُخزن في المستودع.

## المطور

**Abdelrhman Essam** — AI Quality & Full-Stack Developer  
[LinkedIn](https://www.linkedin.com/in/abdelrhman-essam-vib/) · [GitHub](https://github.com/abdelrhmanmaroxo-spec)
