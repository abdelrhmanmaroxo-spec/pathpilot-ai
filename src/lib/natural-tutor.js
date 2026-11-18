import { extractPastOnlineExamQuestions, hasOnlineExamSignal } from './exam-generator.js';
import { detectDominantLanguage } from './live-content-translator.js';
import { summarizeMaterials } from './material-intelligence.js';
import { superLocalResponse } from './local-super-reasoner.js';

// ============================================================================
// PathPilot AI v6.0 — Natural Conversational & Exam-Aware Tutor Engine
// Speaks naturally like a knowledgeable peer/tutor without debug banners,
// answers user questions directly, and prioritizes past online exams!
// ============================================================================

function unwrapLatestUserTurn(rawPrompt = '') {
  const text = String(rawPrompt || '').trim();
  if (!text.startsWith('LATEST USER REQUEST\n')) {
    return { latest: text, historyContext: '' };
  }
  const start = 'LATEST USER REQUEST\n'.length;
  const marker = '\n\nCONVERSATION CONTEXT ANALYSIS';
  const end = text.indexOf(marker, start);
  if (end < 0) return { latest: text.slice(start).trim(), historyContext: '' };
  return {
    latest: text.slice(start, end).trim(),
    historyContext: text.slice(end + marker.length).trim(),
  };
}

function stripInternalReasonerHeaders(text = '') {
  return String(text || '')
    .replace(/^⚠️\s*Local Intelligence Beta[^\n]*\n(?:[^\n]*\n){0,2}/i, '')
    .replace(/^🧠\s*PathPilot Local (?:Reasoner|Intelligence)[^\n]*\n/i, '')
    .replace(/^🔄\s*Local Deliberation Pass[^\n]*\n/i, '')
    .replace(/^\s*•\s*(?:نوع المهمة|الموضوعات المستخرجة|القيود المكتشفة|ثقة المطابقة|المجالات الأقرب|إجمالي المجالات المستخدمة)[^\n]*\n/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function generateNaturalConversationalAnswer({ mode = 'general', tool = 'ask', prompt = '', preferences = {} } = {}) {
  const { latest, historyContext } = unwrapLatestUserTurn(prompt);
  const cleanPrompt = latest || String(prompt || '').trim();
  const lang = detectDominantLanguage(cleanPrompt);
  const en = lang === 'en';
  const isOnlineExamContext = hasOnlineExamSignal(cleanPrompt, historyContext);

  // 1. Special High-Priority Path: User pasted or mentioned Past Online Exams ("دول امتحانات اونلاين كانت عندنا")
  if (isOnlineExamContext) {
    const extractedQuestions = extractPastOnlineExamQuestions(cleanPrompt);
    const summaryBlock = summarizeMaterials(
      [{ title: en ? 'Online Exam & Study Notes' : 'محتوى الامتحانات الأونلاين والمحاضرات', content: cleanPrompt }],
      {
        style: 'detailed',
        focus: en ? 'Online exam questions and recurring high-yield concepts' : 'أسئلة الامتحانات الأونلاين المتكررة ومواضع الأسئلة',
        language: lang,
      },
    );

    if (extractedQuestions.length > 0) {
      const solvedList = extractedQuestions.slice(0, 12).map((q, idx) => {
        if (q.type === 'mcq' && Array.isArray(q.options)) {
          const best = q.options[q.correctIndex] || q.options[0];
          return en
            ? `${idx + 1}. **${q.stem}**\n   - Best / Key Answer: **${best}**\n   - Why it matters: ${q.explanation}`
            : `${idx + 1}. **${q.stem}**\n   - الإجابة والتركيز الأساسي: **${best}**\n   - شرح الفكرة: ${q.explanation}`;
        }
        return en
          ? `${idx + 1}. **${q.stem}**\n   - Key Takeaway: ${q.modelAnswer || q.explanation}`
          : `${idx + 1}. **${q.stem}**\n   - خلاصة الحل: ${q.modelAnswer || q.explanation}`;
      }).join('\n\n');

      return en
        ? `Got it! Since these are **online exam questions**, I gave them top priority, extracted the tested concepts, and organized the solutions clearly for you:\n\n### High-Priority Online Exam Questions & Analysis (${extractedQuestions.length} detected)\n${solvedList}\n\n### Core Exam Concepts to Master\n${summaryBlock}\n\n> Tip: You can click the **PDF** button to export this into a clean **Reading & Exam Study PDF**, or open the **Interactive Exam** tab in the top bar to practice these exact questions interactively with a timer!`
        : `تمام جدًا! طالما دي **امتحانات أونلاين كانت عندكم**، ركزت عليها بشكل خاص واستخرجتلك الأسئلة والأفكار اللي بتتكرر عشان تضمنها بالكامل:\n\n### تحليل وحل أسئلة الامتحانات الأونلاين (${extractedQuestions.length} سؤال مستخرج)\n${solvedList}\n\n### أهم الأفكار والمفاهيم اللي بيلعب عليها الامتحان\n${summaryBlock}\n\n> نصيحة سريعة: تقدر تضغط زر **PDF** فوق الرد لتحويل الملخص والأسئلة دي إلى **ملف PDF احترافي للقراءة والمراجعة**، أو تفتح خانة **الامتحان التفاعلي** من الشريط العلوي وتلصقهم هناك عشان تمتحن نفسك فيهم تفاعليًا بالدرجات!`;
    }

    return en
      ? `I focused directly on your **online exam notes** and organized the highest-yield concepts and expected exam angles:\n\n${summaryBlock}\n\nYou can also paste any past exam questions into the **Interactive Exam** tab at the top to turn them into a live practice test.`
      : `ركزت مباشرة على النقاط الخاصة بـ **الامتحانات الأونلاين** ورتبتلك الملخص الاحترافي لأهم الأفكار ومواضع الأسئلة المتوقعة:\n\n${summaryBlock}\n\nولو معاك نص الأسئلة نفسها ابعتهالي هنا أحلها معاك سؤال بسؤال، أو افتح خانة **الامتحان التفاعلي** فوق عشان تمتحن نفسك فيها عمليًا.`;
  }

  // 2. Summarization / Long Curriculum Text pasted in Chat ("لخص باحترافية" or long lecture text > 420 chars)
  const asksForSummary = /(?:لخص|لخّص|تلخيص|ملخص|اختصر|summarize|summary|tl;dr)/i.test(cleanPrompt);
  if (asksForSummary || cleanPrompt.length >= 480) {
    const cleanBody = cleanPrompt.replace(/^(?:لخص(?:لي)?|ملخص|تلخيص|summarize(?:\s+this)?)\s*[:：-]?\s*/i, '').trim() || cleanPrompt;
    const profSummary = summarizeMaterials(
      [{ title: en ? 'Study / Reading Material' : 'المحتوى المرفق', content: cleanBody }],
      { style: preferences.responseStyle || 'detailed', language: lang },
    );
    return en
      ? `Here is a clear, structured summary tailored for smooth reading and quick revision:\n\n${profSummary}\n\nWant me to turn this into a **Reading PDF** (click the PDF icon on this message) or test you on it with a quick question?`
      : `اتفضل ملخص احترافي مرتب للقراءة المريحة وتثبيت الأفكار الأساسية بدون حشو:\n\n${profSummary}\n\nتقدر تضغط أيقونة **PDF** على الرسالة دي لتحميله كـ **ملف PDF جاهز للقراءة**، أو قولي لو تحب أسألك فيه كام سؤال سريع نثبت بيه المعلومة!`;
  }

  // 3. Natural Direct Question Answering & Knowledge Synthesis (cleaned of robotic debug headers!)
  const rawKnowledge = superLocalResponse({ mode, tool, prompt: cleanPrompt, preferences });
  const naturalCore = stripInternalReasonerHeaders(rawKnowledge);

  if (naturalCore && naturalCore.length > 40) {
    const intro = en
      ? 'Here is a clear, direct breakdown of your question:'
      : 'خليني أوضحلك الإجابة بشكل طبيعي ومباشر خطوة بخطوة:';
    return `${intro}\n\n${naturalCore}`;
  }

  return en
    ? `Sure! Regarding **"${cleanPrompt}"**: tell me a bit more about the exact angle, course, or problem you have in mind, or paste your lecture/exam text and I will explain, summarize, or solve it with you right away.`
    : `أكيد معاك! بخصوص **«${cleanPrompt}»**: قولي تفاصيل أكتر عن الجزئية اللي واقفة معاك أو ابعتلي جزء المحاضرة أو السؤال زي ما هو، وهشرحهولك ببساطة أو ألخصهولك في نقاط واضحة فورًا.`;
}
