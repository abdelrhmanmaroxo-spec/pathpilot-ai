import { detectConversationalArchetype } from './conversation-intent.js';
import { selectConversationVariant } from './conversation-variation.js';

const RESPONSES = {
  ar: {
    morning_greeting: [
      'صباح الفل ☀️ منور. قولي نبدأ بإيه؟',
      'صباح الخير يا معلم 😄 أنا معاك، إيه اللي في بالك؟',
      'صباح النور 👋 يلا نفتح اليوم بحاجة مفيدة. محتاج إيه؟',
      'صباحك جميل ☀️ هات اللي عندك ونمشي فيه سوا.',
    ],
    evening_greeting: [
      'مساء الفل 🌙 أنا معاك. نشتغل على إيه؟',
      'مساء الخير 😄 قولي عندك إيه النهارده؟',
      'مساء النور 👋 هات اللي في دماغك ونبدأ.',
      'مساءك هادي 🌙 أنا جاهز، محتاج نعمل إيه؟',
    ],
    greeting: [
      'أهلًا 👋 منور. قولي نبدأ منين؟',
      'يا أهلا 😄 أنا معاك، إيه اللي في بالك؟',
      'أهلًا بيك. تحب نشتغل على إيه؟',
      'هلا 👋 قولّي عندك إيه.',
      'نورت PathPilot 😄 يلا بينا، محتاج إيه؟',
    ],
    how_are_you: [
      'الحمد لله تمام 😄 وإنت أخبارك إيه؟',
      'تمام الحمد لله، وجاهز لك. عامل إيه إنت؟',
      'كله تمام 👌 قولي الدنيا معاك عاملة إيه؟',
      'زي الفل والحمد لله 😄 جاهز نشتغل على اللي عندك.',
      'الحمد لله كويس، وجاهز. إنت عامل إيه؟',
      'تمام يا معلم 🙌 موجود معاك. إيه الأخبار عندك؟',
    ],
    thanks: [
      'العفو يا معلم 🙌',
      'حبيبي، تحت أمرك في أي وقت.',
      'ولا يهمك 🙂 لو في حاجة تانية هاتها.',
      'تسلم إنت 😄 المهم إن الموضوع ظبط معاك.',
      'على راسي. نكمل وقت ما تحب.',
    ],
    acknowledgement: [
      'تمام 👌 نكمل.',
      'فل، كده إحنا على نفس الصفحة.',
      'وصلت. هات اللي بعده.',
      'تمام كده، أنا معاك.',
      'اشطا 😄 نتحرك على الخطوة اللي بعدها.',
    ],
    ready: [
      'يلا بينا 🔥 هات أول حاجة.',
      'جاهزين 👌 ابعت اللي عايز نبدأ بيه.',
      'تمام، نبدأ فورًا. إيه أول خطوة؟',
      'يلا نتحرك 😄 هات المطلوب.',
      'أنا جاهز. ارمِ أول حاجة على الطاولة ونمسكها.',
    ],
    encouragement: [
      'إنت محتاج حركة واحدة بس دلوقتي: ابدأ بأصغر خطوة، وبعدها الدنيا بتفتح لوحدها 💪',
      'يلا يا معلم، متستناش المزاج المثالي. اعمل أول 10 دقايق بس وخلي الباقي ييجي وراهم.',
      'شد حيلك 🔥 ركّز على اللي تقدر تعمله دلوقتي، مش على حجم المشوار كله.',
      'إنت مش محتاج تخلص كل حاجة مرة واحدة. خلّص الخطوة الجاية بس، وبعدها ناخد اللي بعدها.',
      'يلا بينا 💪 هدف صغير واضح دلوقتي أحسن من خطة عظيمة مركونة.',
    ],
    positive_update: [
      'حلو جدًا 😄 كده نكمّل وإحنا رايقين.',
      'عاش 👌 المهم إن الدنيا ماشية معاك.',
      'الحمد لله 🙌 كده تمام. هات اللي عندك بقى.',
      'زي الفل 😄 نكمّل على كده.',
    ],
    goodbye: [
      'سلام يا معلم 👋 أشوفك على خير.',
      'في أمان الله، ونكمل وقت ما تحب.',
      'أشوفك على خير 🙌 الشات موجود لما ترجع.',
      'سلام 👋 يومك جميل.',
      'تصبح على خير لو هتقفلها النهارده 🌙',
    ],
    apology: [
      'ولا يهمك خالص، نكمل عادي 🙂',
      'مفيش مشكلة يا معلم. حصل خير.',
      'عادي جدًا، ولا تشغل بالك. هات اللي بعده.',
      'متقلقش، إحنا تمام 👌 نكمل.',
    ],
    confusion: [
      'ولا يهمك. قولي أنهي نقطة اللي وقفت معاك وأنا أفكها واحدة واحدة.',
      'تمام، ابعت الجزء اللي مش واضح وأنا أشرحه من غير لف.',
      'مفيش مشكلة. نرجع خطوة ونبسطها لحد ما تبقى واضحة.',
      'خدها من أولها: قولي بالظبط إيه اللي لخبطك وأنا أرتبهولك.',
      'أنا معاك. حددلي آخر نقطة كانت واضحة وبعدها نكمل منها.',
    ],
    vague_help: [
      'أكيد. ابعتلي اللي واقف معاك أو الهدف اللي عايز توصله ونمشي فيه.',
      'طبعًا. قولي محتاج توصل لإيه وأنا أبدأ معاك من أقصر طريق.',
      'معاك 👌 هات المشكلة أو المطلوب زي ما هو وأنا أرتبه.',
      'أكيد يا معلم. ابعت التفاصيل حتى لو ملخبطة وأنا أمسكها من أولها.',
    ],
    frustration: [
      'فاهمك. قولي إيه اللي واقف أو مش شغال بالظبط ونمسكه من أول الخيط.',
      'تمام، بدل ما نلف حوالين المشكلة هاتها زي ما ظهرت ونشخصها خطوة خطوة.',
      'خلينا نحول الزهق لحل 😄 ابعت آخر حاجة عملتها وإيه النتيجة اللي ظهرت.',
      'أنا معاك. قولّي المتوقع كان إيه واللي حصل فعلًا إيه، ونفصل السبب.',
    ],
    compliment: [
      'تسلم 😄 المهم إن النتيجة نفعتك.',
      'حبيبي يا معلم 🙌 كده نزودها حبة كمان.',
      'عاش عليك 😄 إحنا كده على الطريق الصح.',
      'تسلملي. هات التحدي اللي بعده بقى 😄',
    ],
    laughter: [
      '😂 وصلتني. يلا كمل.',
      'هههه 😄 تمام، إيه اللي بعده؟',
      '😂 كده الجو اتظبط. هات اللي عندك.',
      '🤣 تمام يا معلم، نكمل بقى.',
    ],
    identity: [
      'أنا PathPilot AI. بتكلم معاك بشكل طبيعي، بربط الرسائل بسياقها، وبستخدم البحث أو الأدوات التقيلة بس لما تكون مفيدة فعلًا.',
      'أنا PathPilot AI، مساعد للمحادثة والتحليل والتنفيذ. أقدر أفتكر السياق المفيد وأختار بين الرد المحلي والـRAG والبحث حسب الطلب.',
      'أنا PathPilot AI. دوري إني أفهم طلبك، أحافظ على سياق الشات، وأوصلك لإجابة عملية من غير ما أشغّل أدوات زيادة من غير داعي.',
    ],
    doing: [
      'دلوقتي بقرأ كلامك وبربطه بسياق المحادثة، وبعدها بختار أخف وأفيد طريقة أرد بيها.',
      'بقرأ كلامك الأول، وبشوف هل محتاج رد مباشر ولا تحليل أو بحث. البسيط بخليه بسيط.',
      'أنا دلوقتي بقرأ كلامك وبفهم علاقته بسياق المحادثة، وبعدها ببني الرد المناسب من غير خطوات زيادة مالهاش لازمة.',
      'بربط رسالتك بسياق المحادثة وبحدد المطلوب، ولو مش محتاج بحث أو RAG مش بشغلهم أصلًا.',
    ],
    capability: [
      'أقدر أشرح وأحلل وأقارن وأخطط وأكتب وأراجع كود، وأستخدم الـRAG أو البحث لما يكونوا مفيدين. إنت اسأل طبيعي وأنا أختار الأدوات المناسبة.',
      'أقدر أساعدك في الشرح والتحليل والكتابة والبرمجة والقرارات، وأدخل الـRAG والبحث عند الحاجة بدل ما أشغلهم في كل سؤال.',
      'عندي أدوات للمحادثة، التحليل، الكود، الـRAG والبحث الحديث. المهم تقول المطلوب بطريقتك وأنا أرتب الباقي.',
    ],
  },
  en: {
    morning_greeting: [
      'Good morning ☀️ I’m here. What should we start with?',
      'Morning! 👋 What are you working on today?',
      'Good morning 😄 Send me what you’ve got and we’ll get into it.',
      'Morning ☀️ Ready when you are. What do you need?',
    ],
    evening_greeting: [
      'Good evening 🌙 I’m here. What are we working on?',
      'Evening! 👋 What’s on your mind?',
      'Good evening 😄 Send it over and we’ll start.',
      'Evening 🌙 Ready when you are.',
    ],
    greeting: [
      'Hey! 👋 What do you want to work on?',
      'Hi 😄 I’m here. What’s on your mind?',
      'Hey there. Send me what you’ve got.',
      'Hello 👋 Where should we start?',
      'Hey! Ready when you are.',
    ],
    how_are_you: [
      'Doing well 😄 How are things with you?',
      'I’m good and ready to help. How are you doing?',
      'All good here 👌 What’s going on with you?',
      'Doing great and ready. What are you up to?',
      'Good, thanks 😄 How’s your day going?',
    ],
    thanks: [
      'Anytime 🙌',
      'You’re welcome. Send the next thing whenever you’re ready.',
      'Glad it helped 🙂',
      'No problem at all. I’m here if you need more.',
      'You got it 👌',
    ],
    acknowledgement: [
      'Got it 👌 Let’s keep going.',
      'Perfect, we’re on the same page.',
      'Sounds good. What’s next?',
      'Got it. I’m with you.',
      'Cool 😄 Let’s move to the next step.',
    ],
    ready: [
      'Let’s go 🔥 Send the first thing.',
      'Ready 👌 What are we starting with?',
      'I’m in. Give me the first step.',
      'Let’s start 😄 Send it over.',
      'Ready when you are. Put the first thing in front of me.',
    ],
    encouragement: [
      'Start with the smallest useful step. Momentum is much easier to build than motivation 💪',
      'You don’t need the perfect mood. Give it ten focused minutes and let the next step earn its way in.',
      'Keep the target small and concrete 🔥 One finished step beats a huge plan sitting still.',
      'Don’t carry the whole project at once. Do the next clear thing, then reassess.',
      'You’ve got a move available right now 💪 Pick the smallest one and make it real.',
    ],
    positive_update: [
      'Nice 😄 Glad things are going well.',
      'Love that 👌 Let’s keep the momentum.',
      'Good to hear 🙌 What’s next?',
      'Great 😄 Let’s keep rolling.',
    ],
    goodbye: [
      'See you 👋 Come back anytime.',
      'Take care. We can pick it up whenever you’re back.',
      'Bye for now 🙌',
      'See you later 👋',
      'Good night 🌙',
    ],
    apology: [
      'No worries at all. We’re good 🙂',
      'It’s completely fine. Let’s keep going.',
      'No problem 👌 What’s next?',
      'All good. Don’t worry about it.',
    ],
    confusion: [
      'No problem. Tell me which part stopped making sense and I’ll unpack it step by step.',
      'Got it. Send me the unclear part and I’ll explain it plainly.',
      'That’s fine. We can go back one step and rebuild it more simply.',
      'Tell me the last part that felt clear, and we’ll continue from there.',
      'Point to the bit that confused you and I’ll straighten it out.',
    ],
    vague_help: [
      'Absolutely. Tell me what you’re trying to achieve or what’s blocking you.',
      'Sure. Send me the problem as it is and we’ll work through it.',
      'I’m with you 👌 Give me the goal and the current situation.',
      'Of course. Even rough details are fine; send them over and I’ll organize them.',
    ],
    frustration: [
      'I get it. Tell me what you expected and what actually happened, and we’ll isolate the problem.',
      'Let’s make it concrete. Send the exact thing that isn’t working and the last step you tried.',
      'We can untangle it. Show me the error, symptom, or result you’re getting.',
      'Got you. Give me the shortest version of what’s failing and we’ll start there.',
    ],
    compliment: [
      'Appreciate it 😄 Glad it landed well.',
      'Thank you 🙌 Let’s make the next one even better.',
      'Glad you liked it 😄 What’s next?',
      'Nice 😄 Keep them coming.',
    ],
    laughter: [
      '😂 Got you. Keep going.',
      'Haha 😄 Alright, what’s next?',
      '😂 Fair. Send the next thing.',
      '🤣 Okay, I’m with you.',
    ],
    identity: [
      'I’m PathPilot AI. I keep useful conversation context, reason through requests, and only bring in heavier tools like RAG or search when they actually help.',
      'I’m PathPilot AI, a conversational assistant for analysis and getting things done. I can keep context and choose between local knowledge, RAG, and fresh search as needed.',
      'I’m PathPilot AI. My job is to understand what you need, keep the useful context, and get you to a practical answer without unnecessary tool calls.',
    ],
    doing: [
      'Right now I’m reading your message, connecting it to the conversation, and choosing the lightest useful way to answer.',
      'I’m reading your message and checking the conversation context first, then deciding whether this needs a direct answer, reasoning, or fresh search.',
      'I’m connecting what you just said to the conversation context and building the response without adding unnecessary steps.',
      'I’m reading your message in context and only turning on search or RAG if the request actually needs them.',
    ],
    capability: [
      'I can explain, analyze, compare, plan, write, debug, review code, use RAG, and search when freshness matters. Just ask naturally and I’ll pick the useful tools.',
      'I can help with reasoning, writing, programming, decisions, RAG, and current web research without forcing heavy tools onto simple questions.',
      'I have tools for conversation, analysis, code, RAG, and fresh research. Tell me the outcome you want and I’ll handle the routing.',
    ],
  },
};

export function detectConversationalIntent(prompt, options = {}) {
  return detectConversationalArchetype(prompt, options)?.intent || null;
}

export function localConversationalReply(prompt, options = {}) {
  const archetype = detectConversationalArchetype(prompt, {
    hasPriorContext: options.hasPriorContext === true,
  });
  if (!archetype) return null;

  const language = options.language === 'en' || options.language === 'ar'
    ? options.language
    : archetype.language;
  const variants = RESPONSES[language]?.[archetype.intent] || RESPONSES.ar[archetype.intent] || [];
  const answer = selectConversationVariant({
    intent: archetype.intent,
    language,
    variants,
    storage: options.storage,
    random: options.random,
  });
  return answer || null;
}
