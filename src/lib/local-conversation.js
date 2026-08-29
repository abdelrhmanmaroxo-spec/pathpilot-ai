function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[؟?!.,،]/g, ' ')
    .replace(/[ـ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isEnglishText(value) {
  return /[a-z]/i.test(String(value || '')) && !/[\u0600-\u06ff]/.test(String(value || ''));
}

const GREETING_PATTERN = /^(?:hi|hello|hey|اهلا|أهلا|هاي|هلا|سلام|السلام عليكم)$/;
const HOW_ARE_YOU_PATTERN = /^(?:how are you|ازيك|إزيك|ازيكم|إزيكم|عامل اي|عامل إيه|عامل ايه|عامل اية|عامل إية|عاملة اي|عاملة إيه|عاملة ايه|اخبارك|أخبارك|ايه الاخبار|إيه الأخبار|الدنيا ايه|الدنيا إيه)$/;
const IDENTITY_PATTERN = /^(?:who are you|انت مين|إنت مين)$/;
const DOING_PATTERN = /^(?:what are you doing|انت بتعمل اي|انت بتعمل إيه|إنت بتعمل اي|إنت بتعمل إيه|بتعمل اي|بتعمل إيه)$/;
const CAPABILITY_PATTERN = /^(?:what can you do|تقدر تعمل اي|تقدر تعمل إيه|تقدر تعمل ايه|تقدر تعمل اية|تقدر تعمل إية)$/;
const THANKS_PATTERN = /^(?:thanks|thank you|شكرا|شكرًا|تسلم|متشكر)$/;

export function localConversationalReply(prompt) {
  const text = normalize(prompt);
  if (!text || text.length > 120) return null;
  const en = isEnglishText(prompt);

  if (GREETING_PATTERN.test(text)) {
    return en ? 'Hey! I’m here. What do you want to work on?' : 'أهلًا 👋 أنا معاك. عايز نشتغل على إيه؟';
  }

  if (HOW_ARE_YOU_PATTERN.test(text)) {
    return en ? 'Doing well and ready to help. What are you working on?' : 'تمام وزي الفل 😄 أنا جاهز. قولي عايز نعمل إيه؟';
  }

  if (IDENTITY_PATTERN.test(text)) {
    return en
      ? 'I’m PathPilot AI. I can chat normally, keep context, reason through problems, use local expert knowledge, and bring in search when current information actually needs it.'
      : 'أنا PathPilot AI. أقدر أتكلم معاك بشكل طبيعي، أفتكر سياق المحادثة، أحلل المشاكل، أستخدم المعرفة المحلية، وأدخل البحث بس لما المعلومة فعلًا محتاجة تحديث.';
  }

  if (DOING_PATTERN.test(text)) {
    return en
      ? 'Right now I’m reading your message, connecting it to the conversation, deciding what kind of help it needs, and then building the answer. I only use search when the question actually needs fresh information.'
      : 'دلوقتي أنا بقرأ كلامك، بربطه بسياق المحادثة، بحدد نوع المساعدة المطلوبة، وبعدها ببني الرد. والبحث مش بستخدمه إلا لو السؤال فعلًا محتاج معلومة حديثة.';
  }

  if (CAPABILITY_PATTERN.test(text)) {
    return en
      ? 'I can explain, analyze, compare, plan, write, debug, review code, reason with your earlier messages, use local RAG, and search the web when freshness matters. You can just ask normally and I’ll choose the useful tools automatically.'
      : 'أقدر أشرح، أحلل، أقارن، أخطط، أكتب، أراجع كود، أربط كلامك القديم بالجديد، أستخدم الـRAG المحلي، وأبحث لما الحداثة تفرق. إنت بس اسأل طبيعي وأنا أختار الأدوات المناسبة تلقائيًا.';
  }

  if (THANKS_PATTERN.test(text)) {
    return en ? 'Anytime 🙂' : 'حبيبي، في أي وقت 🙂';
  }

  return null;
}
