import { openVaultPayload, sealVaultPayload, sha256Hex } from './crypto-vault.js';
import { getFreeCloudConfig } from './free-cloud-hub.js';
import { generateBrowserLLMResponse, isBrowserLLMReady } from './local-llm.js';
import { generateNaturalConversationalAnswer } from './natural-tutor.js';

export const MAX_GOOGLE_AI_KEYS = 200;
const GOOGLE_KEY_POOL_VAULT = 'pathpilot.google_key_pool.v6';
const POOL_CURSOR_KEY = 'pathpilot.google_key_cursor.v6';
const STUDIO_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const EXPRESS_BASE = 'https://aiplatform.googleapis.com/v1/publishers/google/models';
const CANDIDATE_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3-flash-preview', 'gemini-2.5-flash-lite'];
const TEXT_EXTENSIONS_RE = /\.(?:txt|md|markdown|csv|tsv|json|js|jsx|ts|tsx|py|java|c|cpp|cs|go|rs|php|rb|html|css|sql|xml|yml|yaml|sh|log|ini|env)$/i;
let cachedPdfJsPromise = null;

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

function countWords(text = '') {
  const matches = String(text || '').trim().match(/\S+/g);
  return matches ? matches.length : 0;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsDataURL(file);
  });
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return globalThis.btoa(binary);
}

async function optimizeImageAttachment(file) {
  const rawDataUrl = await readFileAsDataUrl(file);
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    const idx = rawDataUrl.indexOf(',');
    return { previewUrl: rawDataUrl, thumbUrl: rawDataUrl, mimeType: file.type || 'image/png', base64Data: idx >= 0 ? rawDataUrl.slice(idx + 1) : '' };
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, 1560 / Math.max(img.width || 1, img.height || 1));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const fullUrl = canvas.toDataURL('image/jpeg', 0.86);

        const tScale = Math.min(1, 220 / Math.max(img.width || 1, img.height || 1));
        const tCanvas = document.createElement('canvas');
        tCanvas.width = Math.max(1, Math.round(img.width * tScale));
        tCanvas.height = Math.max(1, Math.round(img.height * tScale));
        tCanvas.getContext('2d').drawImage(img, 0, 0, tCanvas.width, tCanvas.height);
        const thumbUrl = tCanvas.toDataURL('image/jpeg', 0.72);
        const comma = fullUrl.indexOf(',');
        resolve({ previewUrl: fullUrl, thumbUrl, mimeType: 'image/jpeg', base64Data: comma >= 0 ? fullUrl.slice(comma + 1) : '', dimensions: `${img.width}×${img.height}` });
      } catch {
        const comma = rawDataUrl.indexOf(',');
        resolve({ previewUrl: rawDataUrl, thumbUrl: rawDataUrl, mimeType: file.type || 'image/png', base64Data: comma >= 0 ? rawDataUrl.slice(comma + 1) : '' });
      }
    };
    img.onerror = () => {
      const comma = rawDataUrl.indexOf(',');
      resolve({ previewUrl: rawDataUrl, thumbUrl: rawDataUrl, mimeType: file.type || 'image/png', base64Data: comma >= 0 ? rawDataUrl.slice(comma + 1) : '' });
    };
    img.src = rawDataUrl;
  });
}

async function decompressBytes(bytes, format = 'deflate') {
  if (typeof DecompressionStream === 'undefined') return null;
  try {
    const ds = new DecompressionStream(format);
    const writer = ds.writable.getWriter();
    writer.write(bytes);
    writer.close();
    return new Uint8Array(await new Response(ds.readable).arrayBuffer());
  } catch {
    return null;
  }
}

async function loadPdfJsLibrary() {
  if (typeof window === 'undefined') return null;
  if (!cachedPdfJsPromise) {
    cachedPdfJsPromise = (async () => {
      const modUrl = 'https://esm.run/pdfjs-dist@4.8.69/build/pdf.min.mjs';
      const pdfjs = await import(/* @vite-ignore */ modUrl);
      if (pdfjs?.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
        const workerRes = await fetch('https://esm.run/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs');
        if (workerRes.ok) {
          const blob = new Blob([await workerRes.text()], { type: 'text/javascript' });
          pdfjs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
        }
      }
      return pdfjs;
    })().catch(() => null);
  }
  return cachedPdfJsPromise;
}

function decodePdfHexUtf16(hexStr) {
  const clean = hexStr.replace(/\s+/g, '');
  if (clean.length < 4) return '';
  let out = '';
  for (let i = /^feff/i.test(clean) ? 4 : 0; i + 3 < clean.length; i += 4) {
    const code = Number.parseInt(clean.slice(i, i + 4), 16);
    if (Number.isFinite(code) && code >= 9) out += String.fromCharCode(code);
  }
  return out;
}

async function extractPdfTextFallback(arrayBuffer) {
  const latin = new TextDecoder('latin1').decode(new Uint8Array(arrayBuffer));
  const pageCount = (latin.match(/\/Type\s*\/Page\b/g) || []).length || 1;
  const chunks = [];
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  let count = 0;
  while ((match = streamRe.exec(latin)) !== null && count < 120) {
    count += 1;
    const body = match[1];
    const sub = new Uint8Array(body.length);
    for (let i = 0; i < body.length; i += 1) sub[i] = body.charCodeAt(i) & 0xff;
    const inflated = (await decompressBytes(sub, 'deflate')) || (await decompressBytes(sub, 'deflate-raw'));
    const decoded = inflated ? new TextDecoder('latin1').decode(inflated) : body;
    for (const hx of (decoded.match(/<([0-9A-Fa-f\s]{4,})>/g) || [])) {
      const str = decodePdfHexUtf16(hx.slice(1, -1));
      if (str.trim()) chunks.push(str);
    }
    for (const pm of (decoded.match(/\(([^()\\]*(?:\\.[^()\\]*)*)\)/g) || [])) {
      const inner = pm.slice(1, -1).replace(/\\n/g, '\n').replace(/\\r/g, ' ');
      if (/[\p{L}\p{N}]{2,}/u.test(inner)) chunks.push(inner);
    }
  }
  return { pageCount: Math.max(1, pageCount), text: chunks.join(' ').replace(/\s+/g, ' ').trim() };
}

async function extractPdfTextInBrowser(arrayBuffer) {
  try {
    const pdfjs = await loadPdfJsLibrary();
    if (pdfjs?.getDocument) {
      const doc = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) }).promise;
      const totalPages = doc.numPages || 1;
      const pagesText = [];
      for (let p = 1; p <= Math.min(totalPages, 70); p += 1) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        let lastY = null;
        const lineParts = [];
        for (const item of (content.items || [])) {
          const str = String(item.str || '');
          if (!str) continue;
          const y = Array.isArray(item.transform) ? Math.round(item.transform[5]) : null;
          if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) lineParts.push('\n');
          else if (lineParts.length && !lineParts[lineParts.length - 1].endsWith('\n')) lineParts.push(' ');
          lineParts.push(str);
          if (y !== null) lastY = y;
        }
        const pageStr = lineParts.join('').replace(/[ \t]+/g, ' ').trim();
        if (pageStr) pagesText.push(`[صفحة ${p}]\n${pageStr}`);
      }
      const fullText = pagesText.join('\n\n').trim();
      if (fullText.length >= 20) return { pageCount: totalPages, text: fullText };
      const fb = await extractPdfTextFallback(arrayBuffer);
      return { pageCount: totalPages, text: fb.text };
    }
  } catch {
    // Fall through to native deflate stream parser
  }
  return extractPdfTextFallback(arrayBuffer);
}

async function extractDocxTextInBrowser(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  let offset = 0;
  while (offset + 30 < bytes.length) {
    if (view.getUint32(offset, true) !== 0x04034b50) { offset += 1; continue; }
    const compression = view.getUint16(offset + 8, true);
    const compSize = view.getUint32(offset + 18, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const entryName = new TextDecoder('utf-8').decode(bytes.subarray(offset + 30, offset + 30 + nameLen));
    const dataStart = offset + 30 + nameLen + extraLen;
    const dataEnd = dataStart + compSize;
    if (entryName === 'word/document.xml' && dataEnd <= bytes.length) {
      const slice = bytes.subarray(dataStart, dataEnd);
      const rawXml = compression === 0 ? slice : await decompressBytes(slice, 'deflate-raw');
      if (rawXml) {
        return new TextDecoder('utf-8').decode(rawXml)
          .replace(/<\/w:(?:p|tr)>/g, '\n')
          .replace(/<w:tab\/>/g, '\t')
          .replace(/<w:br[^/>]*\/>/g, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      }
      break;
    }
    offset = compSize > 0 ? dataEnd : dataStart;
  }
  return '';
}

export async function inspectAndParseAttachmentFiles(fileList) {
  const files = Array.from(fileList || []).slice(0, 8);
  const results = [];
  for (const file of files) {
    if (file.size > 20 * 1024 * 1024) continue;
    const name = file.name || 'attachment';
    const mime = String(file.type || '').toLowerCase();
    const sizeKb = Math.max(1, Math.round(file.size / 1024));
    const isImage = mime.startsWith('image/') || /\.(?:png|jpe?g|webp|gif|bmp)$/i.test(name);
    const isPdf = mime === 'application/pdf' || /\.pdf$/i.test(name);
    const isDocx = /\.docx$/i.test(name) || mime.includes('wordprocessingml');
    const isAudio = mime.startsWith('audio/');
    const isTextLike = mime.startsWith('text/') || TEXT_EXTENSIONS_RE.test(name);

    if (isImage) {
      const img = await optimizeImageAttachment(file);
      results.push({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name, mimeType: img.mimeType, kind: 'image',
        previewUrl: img.previewUrl, thumbUrl: img.thumbUrl, base64Data: img.base64Data,
        sizeKb, pageCount: 1, wordCount: 0, textContent: '', excerpt: '',
        statusAr: `صورة جاهزة للفحص البصري (${img.dimensions || `${sizeKb}KB`})`,
        statusEn: `Image ready for AI Vision (${img.dimensions || `${sizeKb}KB`})`,
      });
    } else if (isPdf) {
      const buffer = await file.arrayBuffer();
      const extracted = await extractPdfTextInBrowser(buffer);
      const cleanText = String(extracted.text || '').slice(0, 48_000);
      const words = countWords(cleanText);
      const base64Data = file.size <= 10 * 1024 * 1024 ? arrayBufferToBase64(buffer) : '';
      results.push({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name, mimeType: 'application/pdf', kind: 'pdf',
        previewUrl: '', thumbUrl: '', base64Data,
        sizeKb, pageCount: extracted.pageCount || 1, wordCount: words,
        textContent: cleanText, excerpt: cleanText.slice(0, 1400),
        statusAr: words > 0 ? `تم فحص ${extracted.pageCount} صفحة • ${words} كلمة مقروءة` : `ملف PDF (${extracted.pageCount} صفحة) جاهز للقراءة البصرية عبر AI`,
        statusEn: words > 0 ? `Inspected ${extracted.pageCount} page(s) • ${words} words extracted` : `PDF (${extracted.pageCount} pages) ready for AI Vision`,
      });
    } else if (isDocx) {
      const docxText = (await extractDocxTextInBrowser(await file.arrayBuffer())).slice(0, 48_000);
      const words = countWords(docxText);
      results.push({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', kind: 'docx',
        previewUrl: '', thumbUrl: '', base64Data: '',
        sizeKb, pageCount: Math.max(1, Math.ceil(words / 280)), wordCount: words,
        textContent: docxText, excerpt: docxText.slice(0, 1400),
        statusAr: `تم فحص مستند Word • ${words} كلمة مقروءة`,
        statusEn: `Inspected Word doc • ${words} words extracted`,
      });
    } else if (isAudio) {
      const dataUrl = await readFileAsDataUrl(file);
      const comma = dataUrl.indexOf(',');
      results.push({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name, mimeType: mime || 'audio/mpeg', kind: 'audio',
        previewUrl: '', thumbUrl: '', base64Data: comma >= 0 ? dataUrl.slice(comma + 1) : '',
        sizeKb, pageCount: 1, wordCount: 0, textContent: '', excerpt: '',
        statusAr: `ملف صوتي جاهز للتحليل (${sizeKb}KB)`,
        statusEn: `Audio ready for analysis (${sizeKb}KB)`,
      });
    } else if (isTextLike || !mime) {
      const rawText = (await file.text()).slice(0, 48_000);
      const words = countWords(rawText);
      results.push({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name, mimeType: mime || 'text/plain', kind: 'text',
        previewUrl: '', thumbUrl: '', base64Data: '',
        sizeKb, pageCount: Math.max(1, Math.ceil(words / 300)), wordCount: words,
        textContent: rawText, excerpt: rawText.slice(0, 1400),
        statusAr: `تم قراءة الملف النصي • ${words} كلمة`,
        statusEn: `Read text file • ${words} words`,
      });
    }
  }
  return results;
}

function maskApiKey(key) {
  const k = String(key || '').trim();
  return k.length <= 12 ? '••••••••' : `${k.slice(0, 7)}••••••${k.slice(-4)}`;
}

function gatewayOrderForKey(item) {
  if (item?.gateway === 'express') return ['express', 'studio'];
  if (item?.gateway === 'studio') return ['studio', 'express'];
  return String(item?.key || '').startsWith('AQ.') ? ['express', 'studio'] : ['studio', 'express'];
}

function buildGatewayUrl({ gateway, model, key, stream = false }) {
  const base = gateway === 'express' ? EXPRESS_BASE : STUDIO_BASE;
  const encodedKey = encodeURIComponent(String(key || '').trim());
  return stream ? `${base}/${model}:streamGenerateContent?alt=sse&key=${encodedKey}` : `${base}/${model}:generateContent?key=${encodedKey}`;
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
    globalThis.localStorage?.setItem?.(GOOGLE_KEY_POOL_VAULT, sealVaultPayload({ keys: cleanKeys, preferredModel: state?.preferredModel || 'auto' }));
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
  ].map((k) => k.trim()).filter((k) => k.length >= 20);

  for (const envKey of envList) {
    if (!existingMap.has(envKey) && existingMap.size < MAX_GOOGLE_AI_KEYS) {
      existingMap.set(envKey, {
        id: `gkey-${sha256Hex(envKey).slice(0, 10)}`, key: envKey, maskedKey: maskApiKey(envKey),
        label: `Google Key #${existingMap.size + 1}`, enabled: true, uses: 0, failures: 0,
        cooldownUntil: 0, lastUsedAt: null, status: 'ready', gateway: '', verifiedModel: '',
      });
    }
  }
  const now = Date.now();
  const keys = [...existingMap.values()].slice(0, MAX_GOOGLE_AI_KEYS).map((item, idx) => ({
    ...item, index: idx + 1, maskedKey: maskApiKey(item.key), isCoolingDown: Number(item.cooldownUntil || 0) > now,
  }));
  return {
    keys, preferredModel: state.preferredModel || 'auto', maxCapacity: MAX_GOOGLE_AI_KEYS,
    totalCount: keys.length, activeCount: keys.filter((k) => k.enabled && !k.isCoolingDown && k.status !== 'invalid').length,
    totalUses: keys.reduce((sum, k) => sum + Number(k.uses || 0), 0),
  };
}

export function addGoogleAiKeysBulk(rawInput = '', labelPrefix = 'Google Key') {
  const tokens = String(rawInput || '').split(/[\n,\r\t ;]+/).map((s) => s.trim()).filter((s) => s.length >= 20);
  const state = readRawKeyPool();
  const map = new Map(state.keys.map((item) => [item.key, item]));
  let added = 0;
  for (const token of tokens) {
    if (map.size >= MAX_GOOGLE_AI_KEYS) break;
    if (map.has(token)) continue;
    map.set(token, {
      id: `gkey-${sha256Hex(token).slice(0, 10)}`, key: token, maskedKey: maskApiKey(token),
      label: `${labelPrefix} #${map.size + 1}`, enabled: true, uses: 0, failures: 0,
      cooldownUntil: 0, lastUsedAt: null, status: 'ready', gateway: '', verifiedModel: '',
    });
    added += 1;
  }
  writeRawKeyPool({ ...state, keys: [...map.values()] });
  return { added, pool: loadGoogleAiKeyPool() };
}

export function toggleGoogleAiKey(id) {
  const state = readRawKeyPool();
  writeRawKeyPool({ ...state, keys: state.keys.map((k) => (k.id === id ? { ...k, enabled: !k.enabled, cooldownUntil: 0, status: 'ready' } : k)) });
  return loadGoogleAiKeyPool();
}

export function removeGoogleAiKey(id) {
  const state = readRawKeyPool();
  writeRawKeyPool({ ...state, keys: state.keys.filter((k) => k.id !== id) });
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

function recordKeyOutcome(keyValue, outcome, extra = {}) {
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
    if (extra.gateway) target.gateway = extra.gateway;
    if (extra.model) target.verifiedModel = extra.model;
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
  let lastErrorReason = '';

  for (const gateway of gatewayOrderForKey(item)) {
    for (const model of CANDIDATE_MODELS) {
      try {
        const res = await fetch(buildGatewayUrl({ gateway, model, key: item.key, stream: false }), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Reply with OK' }] }], generationConfig: { maxOutputTokens: 16 } }),
        });
        if (res.ok) {
          recordKeyOutcome(item.key, 'ok', { gateway, model });
          return { ok: true, model: `${model} عبر ${gateway === 'express' ? 'Google Express Cloud' : 'Google AI Studio'}`, pool: loadGoogleAiKeyPool() };
        }
        const errJson = await res.json().catch(() => ({}));
        const apiMessage = errJson?.error?.message || `HTTP ${res.status}`;
        lastErrorReason = apiMessage;
        if (res.status === 429) {
          recordKeyOutcome(item.key, 'rate_limit');
          return { ok: false, reason: 'وصل المفتاح للحد المؤقت (429) — سيتخطاه الموزع التلقائي لغيره', pool: loadGoogleAiKeyPool() };
        }
        if (res.status === 403 || res.status === 401) break;
        if (res.status === 400 && /API_KEY_INVALID|key not valid/i.test(apiMessage)) {
          recordKeyOutcome(item.key, 'invalid');
          return { ok: false, reason: 'المفتاح غير صالح (API_KEY_INVALID)', pool: loadGoogleAiKeyPool() };
        }
      } catch (err) {
        lastErrorReason = err?.message || 'خطأ في الاتصال بالشبكة';
      }
    }
  }
  return { ok: false, reason: lastErrorReason || 'تعذر الاتصال بالنموذج حاليًا', pool: loadGoogleAiKeyPool() };
}

function nextOrderedKeysFromPool() {
  const pool = loadGoogleAiKeyPool();
  const available = pool.keys.filter((k) => k.enabled && !k.isCoolingDown && k.status !== 'invalid');
  if (!available.length) return { ordered: [], preferredModel: pool.preferredModel };
  let cursor;
  try {
    cursor = Number(globalThis.localStorage?.getItem?.(POOL_CURSOR_KEY) || 0) || 0;
    globalThis.localStorage?.setItem?.(POOL_CURSOR_KEY, String((cursor + 1) % available.length));
  } catch {
    cursor = 0;
  }
  const ordered = [];
  for (let i = 0; i < available.length; i += 1) ordered.push(available[(cursor + i) % available.length]);
  return { ordered, preferredModel: pool.preferredModel };
}

function cleanInput(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function sentences(value) {
  return String(value || '').split(/(?<=[.!؟\n])\s+/).map(cleanInput).filter((item) => item.length > 12);
}

export function extractKeywords(value, limit = 6) {
  const stopWords = new Set(['هذا', 'هذه', 'ذلك', 'التي', 'الذي', 'على', 'إلى', 'من', 'في', 'عن', 'مع', 'أو', 'هو', 'هي', 'تم', 'كان', 'have', 'with', 'from', 'that', 'this', 'and', 'the', 'for']);
  const counts = new Map();
  String(value || '').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)?.forEach((word) => {
    if (!stopWords.has(word)) counts.set(word, (counts.get(word) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([word]) => word);
}

function audiencePrefix(preferences = {}) {
  const audience = AUDIENCE_LABELS[preferences.audience];
  return audience && preferences.audience !== 'self' ? `مخصص لـ: ${audience}\n\n` : '';
}

function localComparison(prompt) {
  return ['مقارنة احتياطية', `طلبك: ${prompt}`, '', 'تعذر الوصول للمحرك الحي الآن، لذلك لن أخترع تفاصيل حديثة أو أسعارًا أو ترتيبات غير متحققة.', '', '1. حدّد الخيارات الحقيقية المرتبطة بطلبك.', '2. قارن سهولة البداية، الجودة، التطبيق العملي، التكلفة، المجتمع، والملاءمة للهدف.', '3. لكل خيار اكتب نقاط قوة وضعف.', '4. استبعد ما يفشل في شرط أساسي.', '5. اختر حسب حالة الاستخدام لا حسب ترتيب مطلق.', '', 'مهم', 'بمجرد عودة البحث الحي، أعد الطلب للحصول على أسماء ومصادر حديثة.'].join('\n');
}

function localBrainstorm(prompt) {
  return [`أفكار موسعة حول: ${cleanInput(prompt)}`, '', 'عملية وسريعة', '1. نسخة مصغرة تحل المشكلة الأساسية فقط.', '2. خدمة موجهة لشريحة ضيقة.', '3. قالب أو أداة قابلة لإعادة الاستخدام.', '4. أتمتة جزء متكرر.', '', 'أقوى من المعتاد', '5. دمج فكرتين في تجربة أبسط.', '6. تخصيص حسب نوع المستخدم.', '7. قياس تقدم واضح.', '8. نسخة مجانية محدودة تقود لقيمة مدفوعة.', '', 'تجريبية', '9. مساعد يقترح الخطوة التالية.', '10. نظام توصية يشرح سبب الاختيار.', '11. لوحة قياس للأخطاء والفرص.', '12. تجربة تفاعلية تتغير حسب مدخلات المستخدم.', '', 'اختبار سريع', 'اختر فكرتين فقط واسأل: هل تحل مشكلة حقيقية؟ هل أقدر أبني نسخة صغيرة منها هذا الأسبوع؟'].join('\n');
}

function localStudy(tool, prompt) {
  const keywords = extractKeywords(prompt);
  if (tool === 'summarize') {
    const points = sentences(prompt).slice(0, 8);
    return ['ملخص مركز', points.length ? points.map((item, idx) => `${idx + 1}. ${item}`).join('\n') : `• ${prompt}`, '', 'كلمات أساسية', keywords.join(' • ') || 'استخرج المصطلحات الأساسية من النص.', '', 'مراجعة نشطة', 'حاول شرح الفكرة بصوتك في دقيقتين، ثم ارجع للنقاط التي لم تستطع تذكرها.'].join('\n');
  }
  if (tool === 'plan') return ['خطة مذاكرة قابلة للتنفيذ', `الهدف: ${prompt}`, '', '1. قياس نقطة البداية — 20 دقيقة', '2. تقسيم المنهج إلى وحدات صغيرة مرتبة بالأهمية.', '3. جلسات تركيز 45–60 دقيقة يتبعها استرجاع من الذاكرة.', '4. نهاية كل جلسة: 5 أسئلة بدون الرجوع للمصدر.', '5. مراجعة تراكمية بعد كل 3 جلسات.', '6. آخر 20% من الوقت: نماذج وأسئلة على مناطق الضعف.', '', 'قاعدة التنفيذ', 'لو تأخرت، قلّل كمية المحتوى لا وقت الاسترجاع والاختبار.'].join('\n');
  if (tool === 'quiz') return ['اختبار فهم', `الموضوع: ${prompt}`, '', '1. عرّف الفكرة الأساسية بكلماتك.', '2. اذكر مثالًا صحيحًا ومثالًا مضادًا.', '3. ما الخطأ الشائع في هذا الموضوع؟', '4. طبّق الفكرة على موقف جديد.', '5. لخّصها في جملة واحدة لشخص مبتدئ.', '', 'طريقة الاستخدام', 'جاوب من الذاكرة أولًا، ثم راجع المصدر وصحح إجاباتك بلون مختلف.'].join('\n');
  if (tool === 'flashcards') return ['بطاقات مراجعة', `الموضوع: ${prompt}`, '', '• س: ما الفكرة الأساسية؟\n  ج: اكتب تعريفًا قصيرًا جدًا من المصدر.', '• س: لماذا تهم هذه الفكرة؟\n  ج: اربطها باستخدام حقيقي.', '• س: ما مثالها؟\n  ج: استخدم أبسط مثال صحيح.', '• س: ما الفرق بينها وبين أقرب مفهوم مشابه؟\n  ج: ركّز على معيار واحد حاسم.', '• س: ما الخطأ الشائع؟\n  ج: دوّن الخطأ وطريقة اكتشافه.'].join('\n');
  if (tool === 'research') return ['خريطة بحث', `الموضوع: ${prompt}`, '', 'أسئلة البحث', '1. ما تعريف وحدود الموضوع؟', '2. ما أهم النظريات أو التقنيات المرتبطة به؟', '3. ما الأدلة المؤيدة والمعارضة؟', '4. ما التطبيقات الحالية؟', '5. أين توجد فجوات أو أسئلة مفتوحة؟', '', 'ترتيب المصادر', 'مصادر أولية أو رسمية ← أوراق ومراجع أكاديمية ← مصادر شرح موثوقة ← أمثلة تطبيقية.', '', 'المخرج النهائي', 'ملخص تنفيذي + محاور + أدلة لكل محور + قائمة أسئلة تحتاج تحقق.'].join('\n');
  return ['شرح مبسّط', `الموضوع: ${prompt}`, '', 'ابدأ بالفكرة الكبيرة: حاول تحديد «ما المشكلة التي يحلها هذا المفهوم؟». بعد ذلك افهم المكوّنات الأساسية واحدة واحدة واربط كل جزء بمثال صغير.', '', 'مصطلحات تستحق التركيز', keywords.join(' • ') || 'التعريف • المكونات • المثال • التطبيق', '', 'مثال عملي', 'حوّل المفهوم إلى موقف تعرفه، وحدد المدخلات، ما الذي يحدث بينها، والنتيجة.', '', 'سؤال مراجعة', 'لو تغير عنصر أساسي في المثال، كيف ستتغير النتيجة ولماذا؟'].join('\n');
}

function localWork(tool, prompt, preferences) {
  const name = cleanInput(preferences?.displayName);
  if (tool === 'email') return ['Subject: Follow-up / Next Step', '', 'Hello,', '', prompt, '', 'Please let me know the best next step or if you need anything else from me.', '', 'Best regards,', name || '[Your name]'].join('\n');
  if (tool === 'tasks') return ['خطة تنفيذ', `الهدف: ${prompt}`, '', 'الآن', '1. حدّد المخرج النهائي ومعيار القبول.', '2. اجمع المدخلات والاعتماديات الناقصة.', '3. نفّذ أصغر جزء يزيل أكبر قدر من عدم اليقين.', '', 'بعدها', '4. قسّم التنفيذ إلى وحدات يمكن اختبارها.', '5. راجع الجودة قبل الدمج أو التسليم.', '6. وثّق ما تم وما تبقى والمالك والموعد.', '', 'تعريف الانتهاء', 'مخرج قابل للتسليم + مراجعة مكتملة + لا توجد نقاط حرجة بلا مالك.'].join('\n');
  if (tool === 'meeting') return ['ملخص اجتماع منظم', `الملاحظات: ${prompt}`, '', 'القرارات', '• حوّل كل قرار واضح إلى جملة واحدة.', '', 'Action items', '• [المهمة] — Owner: [الاسم] — Due: [الموعد]', '', 'أسئلة مفتوحة', '• ما الذي لم يُحسم؟', '', 'مخاطر / Dependencies', '• ما الذي قد يؤخر التنفيذ أو يحتاج موافقة خارجية؟'].join('\n');
  if (tool === 'cv') return ['CV bullet مقترح', `• Executed ${prompt.replace(/[.!؟]+$/u, '')}, documenting findings and applying structured quality checks to support accurate, consistent delivery.`, '', 'قبل الاستخدام', 'استبدل أي صياغة عامة برقم أو أداة أو نتيجة حقيقية لو كانت عندك، ولا تضف ادعاء لم يحدث.'].join('\n');
  if (tool === 'cover') return ['Dear Hiring Team,', '', `I am interested in this opportunity because it aligns with my hands-on experience and the type of work I want to continue developing. My relevant background includes ${prompt}`, '', 'I focus on careful execution, clear documentation, and learning project-specific guidelines quickly. I would welcome the opportunity to discuss how this experience can support your team.', '', 'Best regards,', name || '[Your name]'].join('\n');
  return ['QA / Bug Report', '', 'Summary', prompt, '', 'Environment', '• Device / OS: [add]', '• Browser / app version: [add]', '', 'Steps to reproduce', '1. [step]', '2. [step]', '3. [step]', '', 'Expected result', '[what should happen]', '', 'Actual result', '[what happened]', '', 'Impact / Severity', '[who is affected and how badly]', '', 'Evidence', '[screenshot, recording, logs, timestamp]'].join('\n');
}

function localGeneral(tool, prompt) {
  if (tool === 'rewrite') return ['نسخة أوضح', cleanInput(prompt), '', 'مراجعة سريعة', '• الفكرة الأساسية واضحة ومباشرة.', '• احذف أي تكرار لا يضيف معلومة.', '• ضع الطلب أو الخطوة التالية في آخر سطر إن كان النص رسالة عملية.'].join('\n');
  if (tool === 'brainstorm') return localBrainstorm(prompt);
  if (tool === 'decide') return localComparison(prompt);
  if (tool === 'organize') return ['تنظيم عملي', `المطلوب: ${prompt}`, '', '1. ثبّت المواعيد التي لا يمكن تحريكها.', '2. اختر أهم 1–3 نتائج لليوم.', '3. ضع أصعب مهمة في فترة طاقة عالية.', '4. اجمع الأعمال الصغيرة في كتلة واحدة.', '5. اترك 20% من الوقت فراغًا للتأخير والطوارئ.', '6. في النهاية انقل غير الضروري بدل تمديد اليوم بلا نهاية.'].join('\n');
  if (tool === 'content') return ['هيكل محتوى', `الموضوع: ${prompt}`, '', 'Hook', 'ابدأ بالمشكلة أو النتيجة التي تهم الجمهور فورًا.', '', 'القيمة', '• الفكرة الأساسية.', '• مثال أو دليل.', '• خطوة قابلة للتطبيق.', '', 'الخاتمة', 'لخّص الرسالة في سطر واحد ثم ضع CTA مناسبًا للمنصة.'].join('\n');
  return ['تحليل أولي', `طلبك: ${prompt}`, '', 'أفضل طريقة للبدء', '1. حدّد النتيجة التي تريد الوصول لها بدقة.', '2. افصل الحقائق المؤكدة عن الافتراضات.', '3. اكتشف أكبر معلومة ناقصة قد تغيّر القرار.', '4. نفّذ أصغر خطوة آمنة تعطيك معلومة جديدة.', '5. راجع النتيجة وعدّل المسار بدل الالتزام بخطة ثابتة.', '', 'لو كان الطلب يعتمد على أسعار أو أخبار أو معلومات تتغير بمرور الوقت، استخدم البحث الحي قبل اتخاذ قرار نهائي.'].join('\n');
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
      'You are PathPilot AI — an exceptionally smart, multimodal assistant, tutor, and workspace organizer.',
      '1) Thoroughly read and inspect every attached PDF, Word document, image, or file provided in the prompt or inline media. Reference concrete headings, laws, definitions, equations, and details directly from the file.',
      '2) Begin analytical, document-reading, academic, or exam answers with a concise reasoning block inside <thinking>Step 1: ... | Step 2: ... | Step 3: ...</thinking> followed by your structured answer.',
      '3) Workspace powers: if the user asks to create or organize a folder, append [[FOLDER:Folder Name]] at the end. If the user asks to export/create a PDF, write the complete structured text and append [[PDF:Document Title]] at the end.',
    ]
    : [
      'أنت PathPilot AI — مساعد ومعلم خبير ومتعدد الوسائط، تدخل داخل الملفات المرفقة (PDF، Word، صور، محاضرات، وامتحانات) وتفحص كل صفحة وفقرة فيها بدقة عالية.',
      '١) عند وجود ملف مرفق أو نص مستخرج من ملف، اقرأ محتواه الفعلي بعمق، واستشهد بالعناوين والتعريفات والقواعد والأمثلة الواردة داخل الملف مباشرة بدل أي كلام عام.',
      '٢) ابدأ ردود التحليل أو فحص الملفات أو المسائل بكتلة تفكير مختصرة في أول سطر داخل <thinking>فحص الملف: ... | استخراج المحاور: ... | بناء الإجابة: ...</thinking> ثم اكتب شرحك الكامل والمنظم بعدها مباشرة.',
      '٣) صلاحيات تنفيذية في المنصة: إذا طلب المستخدم إنشاء مجلد أضف في نهاية ردك [[FOLDER:اسم المجلد]]، وإذا طلب استخراج أو عمل ملف PDF اكتب الملخص المنظم كاملًا وأضف في نهايته [[PDF:عنوان الملف]].',
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
    const parts = thinkMatch[1].split(/\||\n/).map((s) => s.replace(/^[-•*\d.)]+\s*/, '').trim()).filter(Boolean);
    thinkingSteps = parts.slice(0, 5).map((p, idx) => ({
      id: `t-${idx + 1}`,
      title: idx === 0 ? 'فحص الطلب والمرفقات' : `خطوة التحليل ${idx + 1}`,
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

  if (!isFinal) text = text.replace(/\[\[(?:FOLDER|PDF):[^\]]*$/i, '').trimEnd();

  return {
    visibleText: text,
    thinkingTrace: thinkingSteps.length ? { intent: 'deep-ai', materialCount: 0, steps: thinkingSteps } : null,
    actions: {
      ...(createFolder ? { createFolder } : {}),
      ...(openPdfTitle ? { openPdfTitle } : {}),
    },
  };
}

function buildEffectiveUserText(prompt, attachments = []) {
  const list = Array.isArray(attachments) ? attachments : [];
  const docBlocks = list
    .filter((a) => a?.textContent && String(a.textContent).trim().length > 0)
    .map((a) => {
      const meta = a.pageCount ? ` (${a.pageCount} صفحة • ${a.wordCount || 0} كلمة)` : '';
      return `\n\n=== [محتوى الملف المرفق بعد فتحه وفحصه: ${a.name}${meta}] ===\n${String(a.textContent).slice(0, 34_000)}\n=== [نهاية الملف: ${a.name}] ===`;
    });
  const defaultAsk = list.length ? 'افحص الملفات/الصور المرفقة بعمق، واشرح أهم المحاور والتفاصيل والنقاط الجوهرية الواردة بداخلها بشكل منظم.' : '';
  return `${String(prompt || '').trim() || defaultAsk}${docBlocks.join('')}`;
}

function buildGeminiContents(prompt, turns = [], attachments = [], includeBinary = true) {
  const history = Array.isArray(turns)
    ? turns.slice(-8).flatMap((turn) => {
      const items = [];
      if (turn?.prompt) items.push({ role: 'user', parts: [{ text: String(turn.prompt).slice(0, 3500) }] });
      if (turn?.answer) items.push({ role: 'model', parts: [{ text: String(turn.answer).slice(0, 3500) }] });
      return items;
    })
    : [];

  const userParts = [];
  if (includeBinary) {
    for (const att of (Array.isArray(attachments) ? attachments : [])) {
      const shouldSendBinary = att?.base64Data && att?.mimeType && (
        att.kind === 'image'
        || att.kind === 'audio'
        || (att.kind === 'pdf' && (Number(att.wordCount || 0) < 40 || Number(att.sizeKb || 0) <= 3500))
      );
      if (shouldSendBinary) {
        userParts.push({ inlineData: { mimeType: att.mimeType, data: att.base64Data } });
      }
    }
  }
  userParts.push({ text: buildEffectiveUserText(prompt, attachments) });
  return [...history, { role: 'user', parts: userParts }];
}

function buildOpenAiMessages(prompt, turns = [], language = 'ar', attachments = []) {
  const history = Array.isArray(turns)
    ? turns.slice(-8).flatMap((turn) => {
      const items = [];
      if (turn?.prompt) items.push({ role: 'user', content: String(turn.prompt).slice(0, 3500) });
      if (turn?.answer) items.push({ role: 'assistant', content: String(turn.answer).slice(0, 3500) });
      return items;
    })
    : [];

  const imageAtts = (Array.isArray(attachments) ? attachments : []).filter((a) => a?.base64Data && String(a?.mimeType || '').startsWith('image/'));
  const textBody = buildEffectiveUserText(prompt, attachments);
  const userContent = imageAtts.length
    ? [{ type: 'text', text: textBody }, ...imageAtts.map((img) => ({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.base64Data}` } }))]
    : textBody;

  return [{ role: 'system', content: buildSystemInstruction(language) }, ...history, { role: 'user', content: userContent }];
}

function fetchWithTimeout(url, options = {}, timeoutMs = 28_000) {
  const controller = new AbortController();
  const externalSignal = options.signal;
  const onAbort = () => controller.abort(externalSignal?.reason);
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort(externalSignal.reason);
    else externalSignal.addEventListener('abort', onAbort, { once: true });
  }
  const timer = globalThis.setTimeout(() => controller.abort(new Error('Request timeout')), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => {
    globalThis.clearTimeout(timer);
    externalSignal?.removeEventListener?.('abort', onAbort);
  });
}

async function readStreamChunks(response, onRawProgress) {
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('event-stream') || !response.body) {
    const textBody = await response.text();
    try {
      const json = JSON.parse(textBody);
      const list = Array.isArray(json) ? json : [json];
      const combinedParts = list.map((entry) => (
        entry?.choices?.[0]?.message?.content
        || entry?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('')
        || entry?.answer
        || ''
      )).join('');
      if (combinedParts && combinedParts.trim()) {
        onRawProgress?.(combinedParts.trim());
        return combinedParts.trim();
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

async function tryGooglePoolRotation({ prompt, turns, language, attachments, signal, onRawProgress }) {
  const { ordered, preferredModel } = nextOrderedKeysFromPool();
  if (!ordered.length) return null;
  const sysMsg = buildSystemInstruction(language);
  const contentsWithBinary = buildGeminiContents(prompt, turns, attachments, true);
  const contentsTextOnly = buildGeminiContents(prompt, turns, attachments, false);

  for (const keyEntry of ordered.slice(0, 6)) {
    throwIfAborted(signal);
    const models = preferredModel && preferredModel !== 'auto'
      ? [preferredModel, 'gemini-2.5-flash'].filter((v, i, arr) => arr.indexOf(v) === i)
      : (keyEntry.verifiedModel
        ? [keyEntry.verifiedModel, 'gemini-2.5-flash'].filter((v, i, arr) => arr.indexOf(v) === i)
        : ['gemini-2.5-flash', 'gemini-2.5-pro']);

    let keyRateLimited = false;
    let keyInvalid = false;

    for (const gateway of gatewayOrderForKey(keyEntry)) {
      if (keyRateLimited || keyInvalid) break;
      for (const model of models) {
        throwIfAborted(signal);
        const url = buildGatewayUrl({ gateway, model, key: keyEntry.key, stream: true });
        let res;
        try {
          res = await fetchWithTimeout(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: sysMsg }] },
              contents: contentsWithBinary,
              generationConfig: { temperature: 0.4, maxOutputTokens: 4096 },
            }),
            signal,
          }, 28_000);
        } catch (err) {
          if (signal?.aborted) throw err;
          break;
        }

        if (res.status === 429 || res.status === 503) {
          recordKeyOutcome(keyEntry.key, 'rate_limit');
          keyRateLimited = true;
          break;
        }
        if (res.status === 403 || res.status === 401) break;
        if (res.status === 400) {
          const errBody = await res.text().catch(() => '');
          if (/API_KEY_INVALID|key not valid/i.test(errBody)) {
            recordKeyOutcome(keyEntry.key, 'invalid');
            keyInvalid = true;
            break;
          }
          if (attachments?.some((a) => a.textContent)) {
            try {
              const retryRes = await fetchWithTimeout(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  systemInstruction: { parts: [{ text: sysMsg }] },
                  contents: contentsTextOnly,
                  generationConfig: { temperature: 0.4, maxOutputTokens: 4096 },
                }),
                signal,
              }, 24_000);
              if (retryRes.ok) {
                const retryAnswer = await readStreamChunks(retryRes, onRawProgress);
                if (retryAnswer) {
                  recordKeyOutcome(keyEntry.key, 'ok', { gateway, model });
                  return { rawAnswer: retryAnswer, source: `google-${gateway}:${model}` };
                }
              }
            } catch (err) {
              if (signal?.aborted) throw err;
            }
          }
          break;
        }
        if (!res.ok) continue;

        const rawAnswer = await readStreamChunks(res, onRawProgress);
        if (rawAnswer) {
          recordKeyOutcome(keyEntry.key, 'ok', { gateway, model });
          return { rawAnswer, source: `google-${gateway}:${model}` };
        }
      }
    }
  }
  return null;
}

async function tryZeroKeyFreeCloudAi(messages, signal, onRawProgress) {
  try {
    const res = await fetchWithTimeout('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai', messages, temperature: 0.4, stream: true }),
      signal,
    }, 30_000);
    if (res.ok) {
      const rawAnswer = await readStreamChunks(res, onRawProgress);
      if (rawAnswer) return { rawAnswer, source: 'cloud-ai-free' };
    }
  } catch (error) {
    if (signal?.aborted) throw error;
  }

  try {
    const res = await fetchWithTimeout('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai', messages, jsonMode: false }),
      signal,
    }, 26_000);
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
  attachments = [],
  language = 'ar',
  mode = 'general',
  tool = 'ask',
  preferences = {},
  signal,
  onDelta,
} = {}) {
  throwIfAborted(signal);
  const effectiveText = buildEffectiveUserText(prompt, attachments);
  const emitVisible = (rawFull) => {
    const parsed = parseAiEnvelopeAndCleanText(rawFull, false);
    if (parsed.visibleText) onDelta?.(parsed.visibleText, parsed.visibleText, parsed.thinkingTrace);
  };

  try {
    const fromPool = await tryGooglePoolRotation({ prompt, turns, language, attachments, signal, onRawProgress: emitVisible });
    if (fromPool?.rawAnswer) {
      const finalParsed = parseAiEnvelopeAndCleanText(fromPool.rawAnswer, true);
      const cleanAnswer = finalParsed.visibleText || fromPool.rawAnswer;
      onDelta?.(cleanAnswer, cleanAnswer, finalParsed.thinkingTrace);
      return { answer: cleanAnswer, source: fromPool.source, degraded: false, thinkingTrace: finalParsed.thinkingTrace, actions: finalParsed.actions };
    }
  } catch (error) {
    if (signal?.aborted) throw error;
  }

  const messages = buildOpenAiMessages(prompt, turns, language, attachments);
  const zeroKeyCloud = await tryZeroKeyFreeCloudAi(messages, signal, emitVisible);
  if (zeroKeyCloud?.rawAnswer) {
    const finalParsed = parseAiEnvelopeAndCleanText(zeroKeyCloud.rawAnswer, true);
    const cleanAnswer = finalParsed.visibleText || zeroKeyCloud.rawAnswer;
    onDelta?.(cleanAnswer, cleanAnswer, finalParsed.thinkingTrace);
    return { answer: cleanAnswer, source: zeroKeyCloud.source, degraded: false, thinkingTrace: finalParsed.thinkingTrace, actions: finalParsed.actions };
  }

  if (preferences?.localLlmEnabled && isBrowserLLMReady()) {
    try {
      const localLlm = await generateBrowserLLMResponse({ mode, tool, prompt: effectiveText, preferences, timeoutMs: 25_000 });
      if (localLlm?.answer) {
        onDelta?.(localLlm.answer, localLlm.answer, null);
        return { answer: localLlm.answer, source: 'local-llm', degraded: false, thinkingTrace: null, actions: {} };
      }
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  }

  const offline = generateNaturalConversationalAnswer({ prompt: effectiveText, preferences: { ...preferences, uiLanguage: language } });
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
        return { answer: payload.answer.trim(), source: payload.sourceMode || 'live', degraded: Boolean(payload.researchFailed), sources: Array.isArray(payload.sources) ? payload.sources : [] };
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
