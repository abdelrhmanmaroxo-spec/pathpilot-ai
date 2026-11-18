import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpenCheck,
  CheckSquare,
  FileDown,
  Flame,
  GraduationCap,
  Palette,
  Sparkles,
  X,
} from 'lucide-react';
import { hasOnlineExamSignal } from '../lib/exam-generator.js';
import {
  buildCurriculumSummaryData,
  DEFAULT_PDF_OPTIONS,
  exportCurriculumPdf,
} from '../lib/pdf-curriculum-exporter.js';

export default function CurriculumPdfModal({
  open,
  onClose,
  language = 'ar',
  materials = [],
  rawText = '',
  defaultTitle = '',
  onGenerateCustomAiSummary,
  notify,
}) {
  const en = language === 'en';
  const [options, setOptions] = useState(() => ({
    ...DEFAULT_PDF_OPTIONS,
    template: 'reading-book',
    courseTitle: defaultTitle,
  }));
  const [customCurriculumText, setCustomCurriculumText] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);

  if (!open) return null;

  const update = (key, val) => setOptions((prev) => ({ ...prev, [key]: val }));

  const effectiveRawText = [rawText, customCurriculumText].filter(Boolean).join('\n\n').trim();
  const onlineExamsDetected = hasOnlineExamSignal(effectiveRawText, options.customInstructions);
  const hasAnyContent = Boolean(
    effectiveRawText
    || (Array.isArray(materials) && materials.some((m) => (typeof m === 'string' ? m.trim() : m?.content?.trim()))),
  );

  const handleInstantPdf = () => {
    if (!hasAnyContent) {
      notify?.(en ? 'Paste curriculum notes or add materials first to build your PDF.' : 'الصق نص المنهج أو امتحاناتك الأونلاين أولًا لتجهيز ملف الـ PDF.');
      return;
    }
    const summaryData = buildCurriculumSummaryData({
      materials,
      rawText: effectiveRawText,
      options: {
        ...options,
        courseTitle: options.courseTitle || defaultTitle,
      },
      uiLanguage: en ? 'en' : 'ar',
    });
    exportCurriculumPdf(summaryData);
    notify?.(en ? 'Reading PDF preview opened — choose Save as PDF.' : 'تم فتح ملف القراءة والمذاكرة — اختر Save as PDF لحفظه فورًا.');
  };

  const handleAiEnhancedPdf = async () => {
    if (!hasAnyContent) {
      notify?.(en ? 'Add or paste curriculum content first.' : 'أضف أو الصق محتوى المنهج أولًا.');
      return;
    }
    if (!onGenerateCustomAiSummary) {
      handleInstantPdf();
      return;
    }
    setGeneratingAi(true);
    try {
      const targetLang = options.language === 'auto' ? (en ? 'en' : 'ar') : options.language;
      const aiMarkdown = await onGenerateCustomAiSummary({
        materials,
        rawText: effectiveRawText,
        options: { ...options, language: targetLang },
      });
      const summaryData = buildCurriculumSummaryData({
        materials,
        rawText: effectiveRawText,
        aiGeneratedMarkdown: aiMarkdown || '',
        options: {
          ...options,
          courseTitle: options.courseTitle || defaultTitle,
        },
        uiLanguage: en ? 'en' : 'ar',
      });
      exportCurriculumPdf(summaryData);
      notify?.(en ? 'AI-tailored Reading PDF is ready!' : 'تم توليد وتجهيز ملف القراءة والملخص الذكي بصيغة PDF!');
    } catch {
      handleInstantPdf();
    } finally {
      setGeneratingAi(false);
    }
  };

  return createPortal(
    <div className="pdf-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <section className="pdf-modal-card" role="dialog" aria-modal="true" aria-label={en ? 'Curriculum Reading PDF Builder' : 'مصمم ملفات PDF للقراءة والملخصات'}>
        <header className="pdf-modal-head">
          <div className="pdf-modal-title">
            <span className="pdf-modal-icon"><BookOpenCheck size={20} /></span>
            <div>
              <small>READING & EXAM PDF STUDIO</small>
              <h2>{en ? 'Professional Reading & Exam Summary PDF' : 'توليد ملف PDF احترافي للقراءة وتلخيص المنهج'}</h2>
            </div>
          </div>
          <button type="button" className="pdf-modal-close" onClick={onClose} aria-label={en ? 'Close' : 'إغلاق'}>
            <X size={18} />
          </button>
        </header>

        <div className="pdf-modal-body">
          {onlineExamsDetected && (
            <div className="exam-online-alert" style={{ marginBottom: 12 }}>
              <Flame size={17} />
              <span>
                {en
                  ? 'Past Online Exams Detected! A dedicated High-Priority Online Exam Questions & Solutions section will be highlighted inside your PDF.'
                  : 'تم رصد إشارة لامتحانات أونلاين سابقة! سيتم إبراز قسم خاص بأسئلة وأفكار الامتحانات الأونلاين وحلولها داخل ملف الـ PDF.'}
              </span>
            </div>
          )}

          <div className="pdf-form-grid">
            <label>
              <span>{en ? 'Course / Reading Book Title' : 'اسم المادة / عنوان كتاب القراءة'}</span>
              <input
                type="text"
                value={options.courseTitle}
                onChange={(e) => update('courseTitle', e.target.value)}
                placeholder={en ? 'e.g. Operating Systems — Reading & Online Exams Guide' : 'مثال: ملخص قراءة ومراجعة الامتحانات الأونلاين — نظم التشغيل'}
              />
            </label>

            <label>
              <span>{en ? 'Student / Instructor / Subtitle (Optional)' : 'اسم الطالب أو المحاضر أو وصف فرعي (اختياري)'}</span>
              <input
                type="text"
                value={options.subtitle}
                onChange={(e) => update('subtitle', e.target.value)}
                placeholder={en ? 'e.g. Lectures 1–6 + Online Quizzes' : 'مثال: المحاضرات ١ إلى ٦ + أسئلة الأونلاين'}
              />
            </label>

            <label>
              <span>{en ? 'PDF Reading & Study Style' : 'نظام القراءة وهيكل الملخص'}</span>
              <select value={options.template} onChange={(e) => update('template', e.target.value)}>
                <option value="reading-book">{en ? 'Smooth Reading Book Edition (Comfortable Prose + Highlights)' : 'نسخة كتاب القراءة المريحة (شرح مترابط + إبراز امتحاني)'}</option>
                <option value="comprehensive">{en ? 'Comprehensive Merged Curriculum Guide' : 'ملخص منهج شامل ومترابط للفصول'}</option>
                <option value="exam-night">{en ? 'Exam-Night + Online Exams Capsule' : 'كبسولة ليلة الامتحان والامتحانات الأونلاين'}</option>
                <option value="cornell">{en ? 'Cornell Academic Two-Column System' : 'نظام كورنيل الأكاديمي (مفاهيم + شرح + خلاصة)'}</option>
                <option value="qna-bank">{en ? 'Summary + Exam Q&A Master Bank' : 'ملخص + بنك أسئلة وإجابات نموذجية'}</option>
              </select>
            </label>

            <label>
              <span>{en ? 'Detail Depth' : 'مستوى التكثيف والتفصيل'}</span>
              <select value={options.density} onChange={(e) => update('density', e.target.value)}>
                <option value="concise">{en ? 'Concise — Fast Revision' : 'مختصر وسريع للمراجعة الخاطفة'}</option>
                <option value="balanced">{en ? 'Balanced — Smooth Reading + Examples' : 'متوازن — قراءة سلسة مع الأمثلة'}</option>
                <option value="detailed">{en ? 'Detailed — Full Reading & Online Exam Coverage' : 'مفصل وشامل لكل نقاط المنهج والامتحانات'}</option>
              </select>
            </label>

            <label>
              <span>{en ? 'PDF Language' : 'لغة ملف الـ PDF'}</span>
              <select value={options.language} onChange={(e) => update('language', e.target.value)}>
                <option value="auto">{en ? 'Match current page language' : 'تلقائي حسب لغة الصفحة الحالية'}</option>
                <option value="ar">{en ? 'Arabic (RTL)' : 'العربية (تخطيط يمين ليسار)'}</option>
                <option value="en">{en ? 'English (LTR)' : 'English (تخطيط يسار ليمين)'}</option>
              </select>
            </label>

            <label>
              <span><Palette size={13} /> {en ? 'Visual Print Theme' : 'تصميم وألوان القراءة'}</span>
              <select value={options.theme} onChange={(e) => update('theme', e.target.value)}>
                <option value="indigo">{en ? 'Royal Academic Indigo' : 'أزرق أكاديمي ملكي'}</option>
                <option value="emerald">{en ? 'Emerald Reading Calm' : 'زمردي هادئ مريح للعين أثناء القراءة'}</option>
                <option value="minimal">{en ? 'Ink-Saver Classic B&W Print' : 'كلاسيكي موفر للحبر للطباعة الورقية'}</option>
              </select>
            </label>
          </div>

          <div className="pdf-sections-picker">
            <strong><CheckSquare size={14} /> {en ? 'Choose Sections to Include:' : 'اختر الأقسام التي تريدها داخل ملف القراءة:'}</strong>
            <div className="pdf-checkbox-grid">
              <label><input type="checkbox" checked={options.includeOverview} onChange={(e) => update('includeOverview', e.target.checked)} /> <span>{en ? 'Executive Reading Digest' : 'خلاصة القراءة وخريطة المنهج'}</span></label>
              <label><input type="checkbox" checked={options.includeCoreUnits} onChange={(e) => update('includeCoreUnits', e.target.checked)} /> <span>{en ? 'Reading Chapters & Units' : 'فصول القراءة وشرح الوحدات'}</span></label>
              <label><input type="checkbox" checked={options.includeTermsTable} onChange={(e) => update('includeTermsTable', e.target.checked)} /> <span>{en ? 'Key Terms Table' : 'جدول المصطلحات والتعريفات'}</span></label>
              <label><input type="checkbox" checked={options.includeRulesAndPitfalls} onChange={(e) => update('includeRulesAndPitfalls', e.target.checked)} /> <span>{en ? 'Rules & Online Exam Traps' : 'القواعد الحاكمة وتريكات الأونلاين'}</span></label>
              <label><input type="checkbox" checked={options.includeExamBank} onChange={(e) => update('includeExamBank', e.target.checked)} /> <span>{en ? 'Online & Expected Exam Q&A' : 'أسئلة الامتحانات الأونلاين والمتوقعة'}</span></label>
              <label><input type="checkbox" checked={options.includeStudyChecklist} onChange={(e) => update('includeStudyChecklist', e.target.checked)} /> <span>{en ? 'Mastery Checklist' : 'قائمة مراجعة إتقان الفصل'}</span></label>
            </div>
          </div>

          <label className="pdf-custom-focus">
            <span>{en ? 'Your Spoken/Written Context (e.g. "These were our online exams, focus on them")' : 'قول للملخص يركز على إيه حسب كلامك (مثلاً: دول امتحانات أونلاين كانت عندنا اهتم بيهم)'}</span>
            <input
              type="text"
              value={options.customInstructions}
              onChange={(e) => update('customInstructions', e.target.value)}
              placeholder={en ? 'e.g. These include past online exams we had — highlight every tested idea…' : 'مثال: دول امتحانات أونلاين كانت عندنا اهتم بيهم وركز على الأسئلة المتكررة…'}
            />
          </label>

          <label className="pdf-extra-paste">
            <span>{en ? 'Paste Lectures & Past Online Exams Here (Optional if chat already has content)' : 'الصق المحاضرات أو الامتحانات الأونلاين هنا مباشرة (اختياري لو فيه محادثة مفتوحة)'}</span>
            <textarea
              rows={4}
              value={customCurriculumText}
              onChange={(e) => setCustomCurriculumText(e.target.value)}
              placeholder={en ? 'Paste chapters, lecture notes, or online exam questions here…' : 'الصق نصوص المحاضرات أو أسئلة الامتحانات الأونلاين هنا لتحويلها لكتاب قراءة وملخص PDF احترافي…'}
            />
          </label>
        </div>

        <footer className="pdf-modal-footer">
          <button
            type="button"
            className="button button-ghost"
            onClick={() => {
              onClose?.();
              window.location.hash = '/exam';
            }}
          >
            <GraduationCap size={16} /> {en ? 'Open Interactive Exam Tab' : 'افتح خانة الامتحان التفاعلي'}
          </button>
          <button type="button" className="button button-secondary" onClick={handleInstantPdf}>
            <FileDown size={17} /> {en ? 'Export Reading PDF' : 'تصدير PDF للقراءة فورًا'}
          </button>
          {onGenerateCustomAiSummary && (
            <button type="button" className="button button-primary" disabled={generatingAi} onClick={handleAiEnhancedPdf}>
              <Sparkles size={17} /> {generatingAi ? (en ? 'Building Reading PDF…' : 'جاري تجهيز كتاب القراءة…') : (en ? 'Smart Synthesis + Reading PDF' : 'تلخيص احترافي مخصص + PDF')}
            </button>
          )}
        </footer>
      </section>
    </div>,
    document.body,
  );
}
