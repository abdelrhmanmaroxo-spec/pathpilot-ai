import { extractMaterialKeywords, mergeMaterials, parseMaterialSources, summarizeMaterials } from './material-intelligence.js';
import { detectDominantLanguage, translateMarkdownSync } from './live-content-translator.js';

export const DEFAULT_PDF_OPTIONS = Object.freeze({
  courseTitle: '',
  subtitle: '',
  template: 'comprehensive', // 'comprehensive' | 'exam-night' | 'cornell' | 'qna-bank'
  theme: 'indigo', // 'indigo' | 'emerald' | 'minimal'
  language: 'auto', // 'auto' | 'ar' | 'en'
  density: 'detailed', // 'concise' | 'balanced' | 'detailed'
  fontScale: 'normal', // 'normal' | 'large'
  customInstructions: '',
  includeOverview: true,
  includeCoreUnits: true,
  includeTermsTable: true,
  includeRulesAndPitfalls: true,
  includeExamBank: true,
  includeStudyChecklist: true,
});

const THEMES = {
  indigo: {
    primary: '#3730a3',
    secondary: '#0284c7',
    accentBg: '#eef2ff',
    accentBorder: '#c7d2fe',
    badgeBg: '#e0e7ff',
    badgeText: '#312e81',
    headerGrad: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 58%, #0369a1 100%)',
    headerText: '#ffffff',
  },
  emerald: {
    primary: '#065f46',
    secondary: '#0f766e',
    accentBg: '#ecfdf5',
    accentBorder: '#a7f3d0',
    badgeBg: '#d1fae5',
    badgeText: '#064e3b',
    headerGrad: 'linear-gradient(135deg, #064e3b 0%, #047857 58%, #0e7490 100%)',
    headerText: '#ffffff',
  },
  minimal: {
    primary: '#111827',
    secondary: '#374151',
    accentBg: '#f9fafb',
    accentBorder: '#d1d5db',
    badgeBg: '#f3f4f6',
    badgeText: '#111827',
    headerGrad: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
    headerText: '#ffffff',
  },
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatInlineHtml(value) {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function extractCandidateSentences(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .split(/(?<=[.!؟؛\n])\s+/)
    .map((line) => line.replace(/^\s*(?:#{1,6}|[-*•]|\d+[.)])\s*/, '').trim())
    .filter((line) => line.length >= 18);
}

export function buildCurriculumSummaryData({
  materials = [],
  rawText = '',
  aiGeneratedMarkdown = '',
  options = {},
  uiLanguage = 'ar',
} = {}) {
  const cfg = { ...DEFAULT_PDF_OPTIONS, ...(options || {}) };
  const combinedInput = [
    rawText,
    aiGeneratedMarkdown,
    ...(Array.isArray(materials) ? materials.map((m) => (typeof m === 'string' ? m : m?.content || '')) : []),
  ].filter(Boolean).join('\n\n').trim();

  const resolvedLang = cfg.language === 'ar' || cfg.language === 'en'
    ? cfg.language
    : (detectDominantLanguage(combinedInput) === 'en' || uiLanguage === 'en' ? 'en' : 'ar');
  const en = resolvedLang === 'en';

  const normalizedSources = parseMaterialSources(
    Array.isArray(materials) && materials.some((m) => (typeof m === 'string' ? m.trim() : m?.content?.trim()))
      ? materials
      : [{ id: 'curriculum-main', title: en ? 'Curriculum Core Content' : 'المحتوى الأساسي للمنهج', content: combinedInput }],
  );

  const translatedSources = normalizedSources.map((src) => ({
    ...src,
    title: translateMarkdownSync(src.title, resolvedLang),
    content: translateMarkdownSync(src.content, resolvedLang),
    highlights: src.highlights.map((h) => translateMarkdownSync(h, resolvedLang)),
  }));

  const fullTranslatedText = translateMarkdownSync(aiGeneratedMarkdown || combinedInput, resolvedLang);
  const allSentences = extractCandidateSentences(fullTranslatedText);
  const keywords = extractMaterialKeywords(fullTranslatedText, 12);
  const totalWords = translatedSources.reduce((acc, s) => acc + s.wordCount, 0);
  const reviewMinutes = Math.max(2, Math.ceil(totalWords / 150));

  const title = (cfg.courseTitle || '').trim()
    || (en ? 'Comprehensive Curriculum Master Summary' : 'الملخص الشامل المتكامل للمنهج الدراسي');
  const subtitle = (cfg.subtitle || '').trim()
    || (en
      ? `Prepared via PathPilot AI · ${translatedSources.length} Unit(s) · Tailored Study Edition`
      : `إعداد PathPilot AI · ${translatedSources.length} وحدات/محاضرات · نسخة مذاكرة مخصصة`);

  const overviewPoints = (allSentences.length ? allSentences : [fullTranslatedText])
    .slice(0, cfg.density === 'concise' ? 3 : cfg.density === 'detailed' ? 6 : 4);

  const units = translatedSources.map((src, idx) => {
    const unitLimit = cfg.density === 'concise' ? 3 : cfg.density === 'detailed' ? 7 : 5;
    const points = extractCandidateSentences(src.content).slice(0, unitLimit);
    return {
      index: idx + 1,
      title: src.title || (en ? `Unit ${idx + 1}` : `الوحدة ${idx + 1}`),
      wordCount: src.wordCount,
      keywords: extractMaterialKeywords(src.content, 5),
      points: points.length ? points : [src.content.slice(0, 320)],
    };
  });

  const termRows = keywords.slice(0, cfg.density === 'concise' ? 5 : 10).map((term) => {
    const matchingSentence = allSentences.find((s) => s.toLowerCase().includes(term.toLowerCase()))
      || (en
        ? `A foundational concept in ${title} governing practical application and analysis.`
        : `مفهوم محوري في المنهج يرتبط مباشرة بفهم العلاقات الأساسية وتطبيقاتها في المسائل والامتحان.`);
    return { term, explanation: matchingSentence };
  });

  const rulesAndPitfalls = [
    en
      ? 'Always distinguish between core definitions and conditional rules — exam questions frequently test edge cases where a condition changes.'
      : 'افصل دائمًا بين التعريف الأساسي والشرط الحاكم له؛ أغلب أسئلة الامتحانات الدقيقة تختبر اللحظة التي يتغير فيها الشرط.',
    en
      ? 'Link shared concepts across chapters instead of memorizing isolated lists so essay and comparison answers stay cohesive.'
      : 'اربط القواسم المشتركة بين الفصول بدل حفظ كل محاضرة بمعزل عن الأخرى لضمان قوة الإجابة في أسئلة المقارنة والربط.',
    ...(cfg.customInstructions?.trim()
      ? [en ? `Custom User Focus: ${cfg.customInstructions.trim()}` : `توجيه خاص من المستخدم: ${cfg.customInstructions.trim()}`]
      : []),
  ];

  const examQuestions = keywords.slice(0, cfg.template === 'qna-bank' ? 6 : 4).map((kw, idx) => {
    const contextHint = termRows[idx]?.explanation || overviewPoints[0] || '';
    if (idx % 2 === 0) {
      return {
        q: en
          ? `Explain the core role of "${kw}" within the curriculum and how it connects to practical outcomes.`
          : `اشرح الدور المحوري لمفهوم «${kw}» في المنهج وكيف يؤثر على النتائج التطبيقية.`,
        a: contextHint,
      };
    }
    return {
      q: en
        ? `Compare "${kw}" with adjacent concepts in this unit, highlighting when to apply it and common mistakes to avoid.`
        : `قارن بين «${kw}» وأقرب مفهوم مرتبط به في الوحدة، مع توضيح شروط الاستخدام وأبرز أخطاء الفهم الشائعة.`,
      a: contextHint,
    };
  });

  const checklist = [
    en ? 'Read the Executive Summary once out loud to build the mental map.' : 'قراءة الملخص التنفيذي بصوت مسموع لبناء الخريطة الذهنية للوحدات.',
    en ? 'Master all Key Terminology rows without looking at the explanation column.' : 'تسميع جدول المصطلحات والمفاهيم المحورية غيبًا بدون النظر لعمود الشرح.',
    en ? 'Solve the Active Exam Questions in writing and compare against the model hints.' : 'حل أسئلة الامتحان المتوقعة كتابةً ثم مطابقة الإجابة مع مفاتيح الحل.',
    en ? 'Final 10-minute rapid scan of Rules & Exam Pitfalls before the test.' : 'مراجعة سريعة لمدة 10 دقائق لقسم القواعد الحاكمة ومواضع اللبس قبل الامتحان.',
  ];

  return {
    language: resolvedLang,
    dir: en ? 'ltr' : 'rtl',
    title,
    subtitle,
    dateLabel: new Date().toLocaleDateString(en ? 'en-US' : 'ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }),
    stats: {
      unitCount: units.length,
      totalWords,
      conceptCount: keywords.length,
      reviewMinutes,
    },
    aiFormattedBody: aiGeneratedMarkdown ? fullTranslatedText : '',
    overviewPoints,
    units,
    termRows,
    rulesAndPitfalls,
    examQuestions,
    checklist,
    options: cfg,
  };
}

function renderMarkdownBodyToPrintHtml(md) {
  const lines = String(md || '').split('\n');
  let html = '';
  let inUl = false;
  let inOl = false;
  const flush = () => {
    if (inUl) { html += '</ul>'; inUl = false; }
    if (inOl) { html += '</ol>'; inOl = false; }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (/^#{1,4}\s+/.test(line)) {
      flush();
      html += `<h3>${formatInlineHtml(line.replace(/^#{1,4}\s+/, ''))}</h3>`;
    } else if (/^\d+[.)]\s+/.test(line)) {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (!inOl) { html += '<ol>'; inOl = true; }
      html += `<li>${formatInlineHtml(line.replace(/^\d+[.)]\s+/, ''))}</li>`;
    } else if (/^[-*•]\s+/.test(line)) {
      if (inOl) { html += '</ol>'; inOl = false; }
      if (!inUl) { html += '<ul>'; inUl = true; }
      html += `<li>${formatInlineHtml(line.replace(/^[-*•]\s+/, ''))}</li>`;
    } else {
      flush();
      html += `<p>${formatInlineHtml(line)}</p>`;
    }
  }
  flush();
  return html;
}

export function renderCurriculumPdfHtml(summaryData) {
  const data = summaryData;
  const en = data.language === 'en';
  const cfg = data.options || DEFAULT_PDF_OPTIONS;
  const palette = THEMES[cfg.theme] || THEMES.indigo;
  const baseFontPt = cfg.fontScale === 'large' ? '12.2pt' : '10.8pt';

  const templateLabel = {
    comprehensive: en ? 'COMPREHENSIVE CURRICULUM GUIDE' : 'ملخص منهج شامل ومتكامل',
    'exam-night': en ? 'EXAM-NIGHT CAPSULE' : 'كبسولة مراجعة ليلة الامتحان',
    cornell: en ? 'CORNELL ACADEMIC STUDY SYSTEM' : 'ملخص بنظام كورنيل الأكاديمي',
    'qna-bank': en ? 'EXAM Q&A MASTER BANK' : 'ملخص وبنك أسئلة وإجابات نموذجية',
  }[cfg.template] || (en ? 'CURRICULUM SUMMARY' : 'ملخص المنهج');

  const unitsHtml = data.units.map((unit) => {
    if (cfg.template === 'cornell') {
      return `
        <section class="card unit-card cornell-grid">
          <div class="cornell-cues">
            <span class="unit-badge">${en ? `Unit ${unit.index}` : `الوحدة ${unit.index}`}</span>
            <h3>${escapeHtml(unit.title)}</h3>
            <p class="cue-label">${en ? 'Key Cues & Terms' : 'المفاهيم والأسئلة المفتاحية'}</p>
            <ul>
              ${(unit.keywords.length ? unit.keywords : [unit.title]).map((k) => `<li><strong>${escapeHtml(k)}</strong></li>`).join('')}
            </ul>
          </div>
          <div class="cornell-notes">
            <h4>${en ? 'Core Structured Notes' : 'الشرح والنقاط الأساسية المركزة'}</h4>
            <ol>
              ${unit.points.map((pt) => `<li>${formatInlineHtml(pt)}</li>`).join('')}
            </ol>
          </div>
          <div class="cornell-summary">
            <strong>${en ? 'Unit Takeaway:' : 'خلاصة الوحدة السريعة:'}</strong>
            <span>${formatInlineHtml(unit.points[0] || '')}</span>
          </div>
        </section>
      `;
    }
    return `
      <section class="card unit-card">
        <div class="unit-head">
          <span class="unit-badge">${en ? `Unit ${unit.index}` : `الوحدة ${unit.index}`}</span>
          <h3>${escapeHtml(unit.title)}</h3>
        </div>
        <ol class="clean-list">
          ${unit.points.map((pt) => `<li>${formatInlineHtml(pt)}</li>`).join('')}
        </ol>
        ${unit.keywords.length ? `<div class="tag-row">${unit.keywords.map((k) => `<span class="tag">${escapeHtml(k)}</span>`).join('')}</div>` : ''}
      </section>
    `;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="${data.language}" dir="${data.dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(data.title)} — PDF</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet" />
  <style>
    @page {
      size: A4;
      margin: 13mm 14mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      background: #eef2f6;
      color: #0f172a;
      font-family: 'Cairo', 'Inter', 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: ${baseFontPt};
      line-height: 1.72;
    }
    .print-toolbar {
      position: sticky;
      top: 0;
      z-index: 50;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 12px 22px;
      background: #0f172a;
      color: #f8fafc;
      box-shadow: 0 6px 24px rgba(0,0,0,0.22);
    }
    .print-toolbar strong { font-size: 14px; }
    .print-toolbar-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .print-btn {
      padding: 8px 16px;
      border-radius: 999px;
      border: 0;
      font-family: inherit;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .print-btn.primary {
      background: linear-gradient(135deg, #2563eb, #10b981);
      color: #fff;
    }
    .print-btn.secondary {
      background: rgba(255,255,255,0.12);
      color: #e2e8f0;
    }
    .page-sheet {
      max-width: 210mm;
      margin: 18px auto 36px;
      padding: 16mm 15mm;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 16px 48px rgba(15, 23, 42, 0.12);
    }
    .cover-banner {
      padding: 22px 24px;
      border-radius: 14px;
      background: ${palette.headerGrad};
      color: ${palette.headerText};
      margin-bottom: 18px;
    }
    .cover-kicker {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 999px;
      background: rgba(255,255,255,0.18);
      font-size: 9.5pt;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .cover-banner h1 {
      margin: 8px 0 6px;
      font-size: 20pt;
      line-height: 1.28;
    }
    .cover-banner p {
      margin: 0;
      opacity: 0.92;
      font-size: 10.5pt;
    }
    .stats-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid rgba(255,255,255,0.22);
      font-size: 9.5pt;
    }
    .stats-strip div strong {
      display: block;
      font-size: 12pt;
    }
    .section-block {
      margin-bottom: 16px;
    }
    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 10px;
      padding-bottom: 5px;
      border-bottom: 2px solid ${palette.accentBorder};
      color: ${palette.primary};
      font-size: 13.5pt;
      font-weight: 800;
      page-break-after: avoid;
    }
    .card {
      padding: 13px 16px;
      border: 1px solid ${palette.accentBorder};
      border-radius: 11px;
      background: #ffffff;
      margin-bottom: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .overview-box {
      background: ${palette.accentBg};
    }
    .unit-head {
      display: flex;
      align-items: center;
      gap: 9px;
      margin-bottom: 8px;
    }
    .unit-head h3 {
      margin: 0;
      font-size: 12pt;
      color: ${palette.primary};
    }
    .unit-badge {
      display: inline-block;
      padding: 2px 9px;
      border-radius: 999px;
      background: ${palette.badgeBg};
      color: ${palette.badgeText};
      font-size: 8.8pt;
      font-weight: 800;
    }
    .clean-list {
      margin: 0;
      padding-inline-start: 20px;
    }
    .clean-list li {
      margin-bottom: 5px;
    }
    .tag-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 9px;
    }
    .tag {
      padding: 2px 8px;
      border-radius: 6px;
      background: ${palette.badgeBg};
      color: ${palette.badgeText};
      font-size: 8.5pt;
      font-weight: 700;
    }
    .cornell-grid {
      display: grid;
      grid-template-columns: 32% 68%;
      gap: 0;
      padding: 0;
      overflow: hidden;
    }
    .cornell-cues {
      padding: 12px;
      background: ${palette.accentBg};
      border-inline-end: 1px solid ${palette.accentBorder};
    }
    .cornell-cues h3 { margin: 6px 0; font-size: 11pt; color: ${palette.primary}; }
    .cue-label { margin: 6px 0 4px; font-size: 8.5pt; font-weight: 700; color: ${palette.secondary}; }
    .cornell-cues ul { margin: 0; padding-inline-start: 16px; font-size: 9.5pt; }
    .cornell-notes { padding: 12px 14px; }
    .cornell-notes h4 { margin: 0 0 6px; color: ${palette.secondary}; font-size: 10.5pt; }
    .cornell-summary {
      grid-column: 1 / -1;
      padding: 9px 14px;
      border-top: 1px solid ${palette.accentBorder};
      background: #f8fafc;
      font-size: 9.5pt;
    }
    table.terms-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 9.8pt;
    }
    table.terms-table th, table.terms-table td {
      border: 1px solid ${palette.accentBorder};
      padding: 8px 10px;
      text-align: start;
      vertical-align: top;
    }
    table.terms-table th {
      background: ${palette.badgeBg};
      color: ${palette.badgeText};
      font-weight: 800;
    }
    table.terms-table tr { break-inside: avoid; page-break-inside: avoid; }
    .qa-item {
      padding: 11px 14px;
      border-inline-start: 4px solid ${palette.secondary};
      background: #f8fafc;
      border-radius: 8px;
      margin-bottom: 9px;
      break-inside: avoid;
    }
    .qa-item strong { display: block; color: ${palette.primary}; margin-bottom: 4px; }
    .qa-item p { margin: 0; color: #334155; font-size: 9.8pt; }
    .checklist-row {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 6px 0;
      border-bottom: 1px dashed #cbd5e1;
    }
    .checkbox-box {
      width: 15px;
      height: 15px;
      border: 1.8px solid ${palette.primary};
      border-radius: 4px;
      flex: 0 0 auto;
    }
    .doc-footer {
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      color: #64748b;
      font-size: 8.5pt;
    }
    code {
      padding: 1px 5px;
      border-radius: 4px;
      background: #f1f5f9;
      font-family: Consolas, monospace;
      font-size: 0.92em;
    }
    @media print {
      body { background: #ffffff; }
      .print-toolbar { display: none !important; }
      .page-sheet {
        max-width: none;
        margin: 0;
        padding: 0;
        box-shadow: none;
        border-radius: 0;
      }
    }
  </style>
</head>
<body>
  <div class="print-toolbar">
    <div>
      <strong>📄 ${escapeHtml(data.title)}</strong>
      <span style="opacity:0.8; font-size:12px; margin-inline-start:10px;">
        ${en ? 'Choose "Save as PDF" in the print dialog for a crisp vector PDF' : 'اختر «حفظ بتنسيق PDF / Save as PDF» للحصول على ملف PDF احترافي جاهز للطباعة والمذاكرة'}
      </span>
    </div>
    <div class="print-toolbar-actions">
      <button type="button" class="print-btn primary" onclick="window.print()">
        🖨️ ${en ? 'Save as PDF / Print Now' : 'حفظ كملف PDF / طباعة الآن'}
      </button>
      <button type="button" class="print-btn secondary" onclick="window.close()">
        ✕ ${en ? 'Close Preview' : 'إغلاق المعاينة'}
      </button>
    </div>
  </div>

  <main class="page-sheet">
    <header class="cover-banner">
      <span class="cover-kicker">${escapeHtml(templateLabel)}</span>
      <h1>${escapeHtml(data.title)}</h1>
      <p>${escapeHtml(data.subtitle)}</p>
      <div class="stats-strip">
        <div><strong>${data.stats.unitCount}</strong><span>${en ? 'Curriculum Units' : 'وحدات / فصول'}</span></div>
        <div><strong>${data.stats.conceptCount}</strong><span>${en ? 'Key Concepts' : 'مفاهيم محورية'}</span></div>
        <div><strong>~${data.stats.reviewMinutes} ${en ? 'min' : 'دقيقة'}</strong><span>${en ? 'Focused Review' : 'زمن المراجعة المركزة'}</span></div>
        <div><strong>${escapeHtml(data.dateLabel)}</strong><span>${en ? 'Generated Date' : 'تاريخ الإصدار'}</span></div>
      </div>
    </header>

    ${data.aiFormattedBody ? `
      <section class="section-block">
        <h2 class="section-title">✦ ${en ? 'Tailored Curriculum Synthesis' : 'الملخص المنهجي المخصص'}</h2>
        <div class="card overview-box">${renderMarkdownBodyToPrintHtml(data.aiFormattedBody)}</div>
      </section>
    ` : ''}

    ${cfg.includeOverview && !data.aiFormattedBody ? `
      <section class="section-block">
        <h2 class="section-title">✦ ${en ? 'Executive Curriculum Overview' : 'الملخص التنفيذي وخريطة المنهج'}</h2>
        <div class="card overview-box">
          <ol class="clean-list">
            ${data.overviewPoints.map((pt) => `<li>${formatInlineHtml(pt)}</li>`).join('')}
          </ol>
        </div>
      </section>
    ` : ''}

    ${cfg.includeCoreUnits ? `
      <section class="section-block">
        <h2 class="section-title">✦ ${en ? 'Structured Curriculum Units & Synthesis' : 'شرح ودمج وحدات المنهج بدون تكرار'}</h2>
        ${unitsHtml}
      </section>
    ` : ''}

    ${cfg.includeTermsTable && data.termRows.length ? `
      <section class="section-block">
        <h2 class="section-title">✦ ${en ? 'Essential Terminology & Definitions' : 'جدول المصطلحات والمفاهيم الأساسية'}</h2>
        <table class="terms-table">
          <thead>
            <tr>
              <th style="width:26%;">${en ? 'Concept / Term' : 'المصطلح / المفهوم'}</th>
              <th>${en ? 'Curriculum Explanation & Context' : 'الشرح والارتباط داخل المنهج'}</th>
            </tr>
          </thead>
          <tbody>
            ${data.termRows.map((row) => `
              <tr>
                <td><strong>${escapeHtml(row.term)}</strong></td>
                <td>${formatInlineHtml(row.explanation)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </section>
    ` : ''}

    ${cfg.includeRulesAndPitfalls ? `
      <section class="section-block">
        <h2 class="section-title">✦ ${en ? 'Governing Rules & Common Exam Pitfalls' : 'القواعد الحاكمة ومواضع اللبس في الامتحانات'}</h2>
        <div class="card">
          <ul class="clean-list">
            ${data.rulesAndPitfalls.map((rule) => `<li>${formatInlineHtml(rule)}</li>`).join('')}
          </ul>
        </div>
      </section>
    ` : ''}

    ${cfg.includeExamBank && data.examQuestions.length ? `
      <section class="section-block">
        <h2 class="section-title">✦ ${en ? 'Expected Exam Questions & Model Answer Keys' : 'بنك الأسئلة المتوقعة وإرشادات الإجابة النموذجية'}</h2>
        ${data.examQuestions.map((item, idx) => `
          <div class="qa-item">
            <strong>${en ? `Q${idx + 1}:` : `س${idx + 1}:`} ${escapeHtml(item.q)}</strong>
            <p><strong>${en ? 'Answer Guide:' : 'مفتاح الإجابة:'}</strong> ${formatInlineHtml(item.a)}</p>
          </div>
        `).join('')}
      </section>
    ` : ''}

    ${cfg.includeStudyChecklist ? `
      <section class="section-block">
        <h2 class="section-title">✦ ${en ? 'Self-Assessment Mastery Checklist' : 'قائمة التحقق من إتقان المنهج قبل الامتحان'}</h2>
        <div class="card">
          ${data.checklist.map((item) => `
            <div class="checklist-row">
              <span class="checkbox-box"></span>
              <span>${escapeHtml(item)}</span>
            </div>
          `).join('')}
        </div>
      </section>
    ` : ''}

    <footer class="doc-footer">
      <span>PathPilot AI · Curriculum Intelligence Studio</span>
      <span>${escapeHtml(data.title)}</span>
    </footer>
  </main>

  <script>
    window.addEventListener('load', function () {
      setTimeout(function () {
        try { window.focus(); window.print(); } catch (e) {}
      }, 420);
    });
  </script>
</body>
</html>`;
}

export function exportCurriculumPdf(summaryData, { autoDownloadFallback = true } = {}) {
  const html = renderCurriculumPdfHtml(summaryData);
  if (typeof window === 'undefined') return { html, mode: 'ssr' };

  const popup = window.open('', '_blank');
  if (popup && popup.document) {
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    return { html, mode: 'print-window' };
  }

  // Fallback when popups are blocked: print via hidden iframe + optional downloadable printable HTML
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => iframe.remove(), 4000);
      }
    }, 450);
    return { html, mode: 'iframe-print' };
  }

  if (autoDownloadFallback) {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(summaryData.title || 'pathpilot-curriculum').slice(0, 48)}.html`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return { html, mode: 'download-fallback' };
}
