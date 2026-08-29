function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[؟?!.,،]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isEnglishText(value) {
  return /[a-z]/i.test(String(value || '')) && !/[\u0600-\u06ff]/.test(String(value || ''));
}

export function localConversationalReply(prompt) {
  const text = normalize(prompt);
  if (!text || text.length > 120) return null;
  const en = isEnglishText(prompt);

  if (/^(hi|hello|hey|اهلا|أهلا|هاي|هلا|سلام)$/.test(text)) {
    return en ? 'Hey! I’m here. What do you want to work on?' : 'أهلًا 👋 أنا معاك. عايز نشتغل على إيه؟';
  }

  if (/^(how are you|ازيك|عامل ايه|عامل إيه|اخبارك|أخبارك)$/.test(text)) {
    return en ? 'Doing well and ready to help. What are you working on?' : 'تمام وجاهز أساعدك 😄 قولي شغال على إيه دلوقتي؟';
  }

  if (/^(who are you|انت مين|إنت مين)$/.test(text)) {
    return en
      ? 'I’m PathPilot AI. I can chat normally, keep context, reason through problems, use local expert knowledge, and bring in search when current information actually needs it.'
      : 'أنا PathPilot AI. أقدر أتكلم معاك بشكل طبيعي، أفتكر سياق المحادثة، أحلل المشاكل، أستخدم المعرفة المحلية، وأدخل البحث بس لما المعلومة فعلًا محتاجة تحديث.';
  }

  if (/^(what are you doing|انت بتعمل اي|انت بتعمل إيه|إنت بتعمل اي|إنت بتعمل إيه|بتعمل اي|بتعمل إيه)$/.test(text)) {
    return en
      ? 'Right now I’m reading your message, connecting it to the conversation, deciding what kind of help it needs, and then building the answer. I only use search when the question actually needs fresh information.'
      : 'دلوقتي أنا بقرأ كلامك، بربطه بسياق المحادثة، بحدد نوع المساعدة المطلوبة، وبعدها ببني الرد. والبحث مش بستخدمه إلا لو السؤال فعلًا محتاج معلومة حديثة.';
  }

  if (/^(what can you do|تقدر تعمل ايه|تقدر تعمل إيه)$/.test(text)) {
    return en
      ? 'I can explain, analyze, compare, plan, write, debug, review code, reason with your earlier messages, use local RAG, and search the web when freshness matters. You can just ask normally and I’ll choose the useful tools automatically.'
      : 'أقدر أشرح، أحلل، أقارن، أخطط، أكتب، أراجع كود، أربط كلامك القديم بالجديد، أستخدم الـRAG المحلي، وأبحث لما الحداثة تفرق. إنت بس اسأل طبيعي وأنا أختار الأدوات المناسبة تلقائيًا.';
  }

  if (/^(thanks|thank you|شكرا|شكرًا)$/.test(text)) {
    return en ? 'Anytime 🙂' : 'حبيبي، في أي وقت 🙂';
  }

  return null;
}
