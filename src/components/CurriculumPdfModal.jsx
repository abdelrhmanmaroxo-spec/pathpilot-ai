import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpenCheck,
  CheckSquare,
  FileDown,
  Palette,
  Sparkles,
  X,
} from 'lucide-react';
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
    courseTitle: defaultTitle,
  }));
  const [customCurriculumText, setCustomCurriculumText] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);

  if (!open) return null;

  const update = (key, val) => setOptions((prev) => ({ ...prev, [key]: val }));

  const effectiveRawText = [rawText, customCurriculumText].filter(Boolean).join('\n\n').trim();
  const hasAnyContent = Boolean(
    effectiveRawText
    || (Array.isArray(materials) && materials.some((m) => (typeof m === 'string' ? m.trim() : m?.content?.trim()))),
  );

  const handleInstantPdf = () => {
    if (!hasAnyContent) {
      notify?.(en ? 'Paste curriculum notes or add materials first to build your PDF.' : 'الصق نص المنهج أو أضف مادة أولًا لتجهيز ملف الـ PDF.');
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
    notify?.(en ? 'Curriculum PDF preview opened — choose Save as PDF.' : 'تم فتح ملخص المنهج الاحترافي — اختر Save as PDF لحفظه فورًا.');
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
      notify?.(en ? 'AI-tailored Curriculum PDF is ready!' : 'تم توليد وتجهيز ملخص المنهج الذكي بصيغة PDF!');
    } catch {
      handleInstantPdf();
    } finally {
      setGeneratingAi(false);
    }
  };

  return createPortal(
    <div className="pdf-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <section className="pdf-modal-card" role="dialog" aria-modal="true" aria-label={en ? 'Curriculum PDF Builder' : 'مصمم ملخصات المنهج بصيغة PDF'}>
        <header className="pdf-modal-head">
          <div className="pdf-modal-title">
            <span className="pdf-modal-icon"><BookOpenCheck size={20} /></span>
            <div>
              <small>CURRICULUM PDF STUDIO</small>
              <h2>{en ? 'Custom Curriculum PDF Summary Builder' : 'مصمم ملخص المنهج القوي بصيغة PDF'}</h2>
            </div>
          </div>
          <button type="button" className="pdf-modal-close" onClick={onClose} aria-label={en ? 'Close' : 'إغلاق'}>
            <X size={18} />
          </button>
        </header>

        <div className="pdf-modal-body">
          <div className="pdf-form-grid">
            <label>
              <span>{en ? 'Course / Curriculum Title' : 'اسم المادة / عنوان الملخص'}</span>
              <input
                type="text"
                value={options.courseTitle}
                onChange={(e) => update('courseTitle', e.target.value)}
                placeholder={en ? 'e.g. Operating Systems — Final Review' : 'مثال: ملخص شامل مادة نظم التشغيل — مراجعة النهائي'}
              />
            </label>

            <label>
              <span>{en ? 'Student / Instructor / Subtitle (Optional)' : 'اسم الطالب أو المحاضر أو وصف فرعي (اختياري)'}</span>
              <input
                type="text"
                value={options.subtitle}
                onChange={(e) => update('subtitle', e.target.value)}
                placeholder={en ? 'e.g. Lectures 1–6 · Spring Semester' : 'مثال: المحاضرات ١ إلى ٦ · نسخة مركزة للامتحان'}
              />
            </label>

            <label>
              <span>{en ? 'Summary Style & Layout' : 'نظام وهيكل الملخص'}</span>
              <select value={options.template} onChange={(e) => update('template', e.target.value)}>
                <option value="comprehensive">{en ? 'Comprehensive Merged Curriculum Guide' : 'ملخص منهج شامل ومترابط للفصول'}</option>
                <option value="exam-night">{en ? 'Exam-Night High-Yield Capsule' : 'كبسولة ليلة الامتحان المكثفة'}</option>
                <option value="cornell">{en ? 'Cornell Academic Two-Column System' : 'نظام كورنيل الأكاديمي (مفاهيم + شرح + خلاصة)'}</option>
                <option value="qna-bank">{en ? 'Summary + Exam Q&A Master Bank' : 'ملخص + بنك أسئلة وإجابات نموذجية'}</option>
              </select>
            </label>

            <label>
              <span>{en ? 'Detail Depth' : 'مستوى التكثيف والتفصيل'}</span>
              <select value={options.density} onChange={(e) => update('density', e.target.value)}>
                <option value="concise">{en ? 'Concise — Fast Revision' : 'مختصر وسريع للمراجعة الخاطفة'}</option>
                <option value="balanced">{en ? 'Balanced — Core + Examples' : 'متوازن — الشرح الأساسي والأمثلة'}</option>
                <option value="detailed">{en ? 'Detailed — Deep Full Coverage' : 'مفصل وشامل لكل نقاط المنهج'}</option>
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
              <span><Palette size={13} /> {en ? 'Visual Print Theme' : 'تصميم وألوان الملخص'}</span>
              <select value={options.theme} onChange={(e) => update('theme', e.target.value)}>
                <option value="indigo">{en ? 'Royal Academic Indigo' : 'أزرق أكاديمي ملكي'}</option>
                <option value="emerald">{en ? 'Emerald Study Calm' : 'زمردي هادئ مريح للقراءة'}</option>
                <option value="minimal">{en ? 'Ink-Saver Classic B&W Print' : 'كلاسيكي موفر للحبر للطباعة الورقية'}</option>
              </select>
            </label>
          </div>

          <div className="pdf-sections-picker">
            <strong><CheckSquare size={14} /> {en ? 'Choose Sections to Include:' : 'اختر الأقسام التي تريدها داخل الملخص:'}</strong>
            <div className="pdf-checkbox-grid">
              <label><input type="checkbox" checked={options.includeOverview} onChange={(e) => update('includeOverview', e.target.checked)} /> <span>{en ? 'Executive Overview' : 'الملخص التنفيذي وخريطة المنهج'}</span></label>
              <label><input type="checkbox" checked={options.includeCoreUnits} onChange={(e) => update('includeCoreUnits', e.target.checked)} /> <span>{en ? 'Merged Units Breakdown' : 'شرح ودمج الوحدات والمحاضرات'}</span></label>
              <label><input type="checkbox" checked={options.includeTermsTable} onChange={(e) => update('includeTermsTable', e.target.checked)} /> <span>{en ? 'Key Terms Table' : 'جدول المصطلحات والتعريفات'}</span></label>
              <label><input type="checkbox" checked={options.includeRulesAndPitfalls} onChange={(e) => update('includeRulesAndPitfalls', e.target.checked)} /> <span>{en ? 'Rules & Exam Pitfalls' : 'القواعد الحاكمة وأخطاء الامتحان'}</span></label>
              <label><input type="checkbox" checked={options.includeExamBank} onChange={(e) => update('includeExamBank', e.target.checked)} /> <span>{en ? 'Expected Exam Q&A Bank' : 'بنك أسئلة الامتحان ومفاتيح الحل'}</span></label>
              <label><input type="checkbox" checked={options.includeStudyChecklist} onChange={(e) => update('includeStudyChecklist', e.target.checked)} /> <span>{en ? 'Printable Mastery Checklist' : 'قائمة مراجعة ذاتية قابلة للطباعة'}</span></label>
            </div>
          </div>

          <label className="pdf-custom-focus">
            <span>{en ? 'Custom Instructions (What exactly do you want focused on?)' : 'توجيهاتك الخاصة (عايز الملخص يركز على إيه بالظبط؟)'}</span>
            <input
              type="text"
              value={options.customInstructions}
              onChange={(e) => update('customInstructions', e.target.value)}
              placeholder={en ? 'e.g. Focus heavily on laws, comparisons, and practical problems…' : 'مثال: ركز جدًا على القوانين والمقارنات وأسئلة علل والمسائل العملية…'}
            />
          </label>

          <label className="pdf-extra-paste">
            <span>{en ? 'Paste Curriculum / Syllabus / Extra Notes (Optional if chat or studio already has content)' : 'الصق المنهج أو الفصول هنا مباشرة (اختياري لو فيه محادثة أو مواد مرفوعة بالفعل)'}</span>
            <textarea
              rows={4}
              value={customCurriculumText}
              onChange={(e) => setCustomCurriculumText(e.target.value)}
              placeholder={en ? 'Paste chapters, lecture slides text, or syllabus points here…' : 'الصق نصوص المحاضرات أو الملازم أو نقاط المنهج هنا لتحويلها لملف PDF منظم…'}
            />
          </label>
        </div>

        <footer className="pdf-modal-footer">
          <button type="button" className="button button-ghost" onClick={onClose}>
            {en ? 'Cancel' : 'إلغاء'}
          </button>
          <button type="button" className="button button-secondary" onClick={handleInstantPdf}>
            <FileDown size={17} /> {en ? 'Instant Structured PDF' : 'تصدير PDF منظم فوري'}
          </button>
          {onGenerateCustomAiSummary && (
            <button type="button" className="button button-primary" disabled={generatingAi} onClick={handleAiEnhancedPdf}>
              <Sparkles size={17} /> {generatingAi ? (en ? 'Synthesizing PDF…' : 'جاري بناء الملخص الذكي…') : (en ? 'AI Smart Synthesis + PDF' : 'توليد ذكي مخصص + تصدير PDF')}
            </button>
          )}
        </footer>
      </section>
    </div>,
    document.body,
  );
}
