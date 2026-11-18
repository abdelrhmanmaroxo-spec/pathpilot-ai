import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  BookOpenCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileDown,
  FileText,
  Flag,
  Flame,
  GraduationCap,
  ImagePlus,
  LoaderCircle,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  UploadCloud,
  X,
  XCircle,
} from 'lucide-react';
import {
  extractKeywords,
  inspectAndParseAttachmentFiles,
  streamSmartAiReply,
} from './lib/assistant.js';
import {
  exportExamPaperPdf,
  generateInteractiveExam,
  gradeExamSubmission,
  hasOnlineExamSignal,
} from './lib/exam-generator.js';
import { getDocumentLanguage, subscribeLanguageChanges } from './lib/language-state.js';

function parseAiExamQuestionsJson(rawText, en = false) {
  const str = String(rawText || '');
  const startIdx = str.indexOf('[');
  const endIdx = str.lastIndexOf(']');
  if (startIdx === -1 || endIdx <= startIdx) return [];

  try {
    const parsed = JSON.parse(str.slice(startIdx, endIdx + 1));
    if (!Array.isArray(parsed)) return [];
    const normalized = [];

    for (const item of parsed) {
      const stem = String(item?.stem || item?.question || '').trim();
      if (stem.length < 6) continue;
      const rawType = String(item?.type || 'mcq').toLowerCase();

      if (rawType === 'short') {
        normalized.push({
          id: `ai-q-${normalized.length + 1}`,
          type: 'short',
          sourceTag: 'ai-exam',
          badge: String(item?.badge || (en ? 'AI Exam Written' : 'سؤال مقالي من المرفقات')),
          stem,
          modelAnswer: String(item?.modelAnswer || item?.explanation || ''),
          keywords: extractKeywords(`${stem} ${item?.modelAnswer || ''}`, 4),
          explanation: String(item?.explanation || item?.modelAnswer || ''),
        });
      } else if (rawType === 'tf') {
        const opts = en ? ['True', 'False'] : ['صح', 'خطأ'];
        const cIdx = Number(item?.correctIndex) === 1 ? 1 : 0;
        normalized.push({
          id: `ai-q-${normalized.length + 1}`,
          type: 'tf',
          sourceTag: 'ai-exam',
          badge: String(item?.badge || (en ? 'True / False' : 'صح أم خطأ من الملف')),
          stem,
          options: opts,
          correctIndex: cIdx,
          explanation: String(item?.explanation || ''),
        });
      } else if (Array.isArray(item?.options) && item.options.length >= 2) {
        const opts = item.options.map((o) => String(o || '').trim()).filter(Boolean).slice(0, 4);
        if (opts.length < 2) continue;
        const cIdx = Math.max(0, Math.min(opts.length - 1, Number(item?.correctIndex) || 0));
        normalized.push({
          id: `ai-q-${normalized.length + 1}`,
          type: 'mcq',
          sourceTag: 'ai-exam',
          badge: String(item?.badge || (en ? 'AI Exam MCQ' : 'سؤال امتحاني من المرفقات')),
          stem,
          options: opts,
          correctIndex: cIdx,
          explanation: String(item?.explanation || ''),
        });
      }
    }
    return normalized;
  } catch {
    return [];
  }
}

async function buildSmartExamFromAttachmentsAndText({
  title = '',
  sourceText = '',
  topic = '',
  instructions = '',
  attachments = [],
  questionCount = 10,
  questionTypes = 'mixed',
  sourceMode = 'curriculum',
  language = 'ar',
} = {}) {
  const en = language === 'en';
  const count = Math.max(3, Math.min(30, Number(questionCount) || 10));
  const combinedAttachmentText = (Array.isArray(attachments) ? attachments : [])
    .map((a) => a?.textContent || '')
    .filter(Boolean)
    .join('\n\n');
  const fullSourceText = [sourceText, combinedAttachmentText].filter(Boolean).join('\n\n');

  const formatRule = questionTypes === 'mcq'
    ? 'ALL questions MUST have "type": "mcq" with 4 options.'
    : questionTypes === 'tf'
      ? 'ALL questions MUST have "type": "tf" with options ["صح", "خطأ"] (or ["True", "False"]) and correctIndex 0 or 1.'
      : questionTypes === 'comprehensive'
        ? 'Mix "mcq" (70%), "tf" (15%), and "short" (15%).'
        : 'Mix "mcq" (75%) and "tf" (25%).';

  const examPrompt = en
    ? `Carefully inspect the attached files/images and text below, then generate EXACTLY ${count} high-quality university exam questions in English.\nMode: ${sourceMode === 'online-exams' ? 'PAST ONLINE EXAMS FOCUS — extract every real question visible in the images/files first, then create twin exam questions testing the exact same concepts!' : 'Curriculum & Lecture Mastery Exam.'}\nTopic/Title: ${title || topic || 'Uploaded Material'}\nInstructions: ${instructions || 'Focus on key definitions, laws, distinctions, and exam traps.'}\nRule: ${formatRule}\nReturn ONLY a valid JSON array where each object is: {"type":"mcq"|"tf"|"short","stem":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"...","modelAnswer":"...","badge":"Exam Concept"}\n\nSource Text:\n${String(fullSourceText).slice(0, 26_000)}`
    : `افحص جميع الملفات والصور المرفقة والنص المرفق بعناية فائقة، ثم صمّم بالضبط ${count} سؤال امتحاني جامعي قوي باللغة العربية.\nالوضع: ${sourceMode === 'online-exams' ? 'التركيز على الامتحانات الأونلاين السابقة — استخرج أولًا أي أسئلة امتحانات ظاهرة في الصور أو ملفات الـ PDF المرفقة وحلّها بدقة، ثم ولّد أسئلة محاكية على نفس التريكات والأفكار!' : 'امتحان شامل ودقيق من قلب المنهج والمحاضرات المرفقة.'}\nالمادة / العنوان: ${title || topic || 'المرفقات الدراسية'}\nتعليمات إضافية: ${instructions || 'ركّز على التعريفات، الشروط، المقارنات، ومواضع أسئلة الامتحانات.'}\nنوع الأسئلة المطلوب: ${formatRule}\nأرجع النتيجة بصيغة JSON Array صالحة فقط بدون أي نص خارج المصفوفة، بحيث يكون كل عنصر بالشكل:\n{"type":"mcq","stem":"نص السؤال بوضوح","options":["الاختيار الأول","الاختيار الثاني","الاختيار الثالث","الاختيار الرابع"],"correctIndex":0,"explanation":"شرح وافٍ لسبب صحة الإجابة من الملف المرفق","badge":"من الملف المرفق"}\n\nالنص المستخرج والملاحظات:\n${String(fullSourceText).slice(0, 26_000)}`;

  try {
    const aiRes = await streamSmartAiReply({
      prompt: examPrompt,
      turns: [],
      attachments,
      language: en ? 'en' : 'ar',
      mode: 'study',
      tool: 'quiz',
    });
    const aiQuestions = parseAiExamQuestionsJson(aiRes?.answer, en);
    if (aiQuestions.length >= Math.min(3, count)) {
      let finalQuestions = aiQuestions.slice(0, count);
      if (finalQuestions.length < count) {
        const fallback = generateInteractiveExam({
          title: title || topic,
          sourceText: fullSourceText,
          topic,
          instructions,
          questionCount: count - finalQuestions.length,
          questionTypes,
          difficulty: sourceMode === 'online-exams' ? 'exam' : 'standard',
          language: en ? 'en' : 'ar',
        });
        finalQuestions = [...finalQuestions, ...fallback.questions].slice(0, count);
      }
      const resolvedTitle = String(title || topic || attachments?.[0]?.name?.replace(/\.[^.]+$/, '') || '').trim()
        || (en ? 'AI Interactive Exam' : 'الامتحان التفاعلي الذكي — PathPilot');
      return {
        id: `exam-${Date.now()}`,
        title: resolvedTitle,
        language: en ? 'en' : 'ar',
        onlineExamDetected: sourceMode === 'online-exams',
        pastExtractedCount: aiQuestions.length,
        totalQuestions: finalQuestions.length,
        questions: finalQuestions,
      };
    }
  } catch {
    // Fall back cleanly to local deterministic exam generator
  }

  return generateInteractiveExam({
    title: title || topic || attachments?.[0]?.name?.replace(/\.[^.]+$/, ''),
    sourceText: fullSourceText,
    topic,
    instructions,
    questionCount: count,
    questionTypes,
    difficulty: sourceMode === 'online-exams' ? 'exam' : 'standard',
    language: en ? 'en' : 'ar',
  });
}

export default function ExamStudio({ notify }) {
  const [uiLanguage, setUiLanguage] = useState(getDocumentLanguage);
  const en = uiLanguage === 'en';

  const [sourceMode, setSourceMode] = useState('curriculum'); // 'curriculum' | 'online-exams' | 'topic'
  const [examTitle, setExamTitle] = useState('');
  const [topicInput, setTopicInput] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [examAttachments, setExamAttachments] = useState([]);
  const [inspectingFiles, setInspectingFiles] = useState(false);
  const [buildingExam, setBuildingExam] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [questionTypes, setQuestionTypes] = useState('mixed');
  const [deliveryStyle, setDeliveryStyle] = useState('practice'); // 'practice' | 'timed-exam'
  const [durationMinutes, setDurationMinutes] = useState(20);

  const [activeExam, setActiveExam] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [revealed, setRevealed] = useState({});
  const [manualReport, setReport] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);

  useEffect(() => subscribeLanguageChanges(setUiLanguage), []);

  const report = useMemo(() => {
    if (manualReport) return manualReport;
    if (activeExam && deliveryStyle === 'timed-exam' && secondsLeft === 0) {
      return gradeExamSubmission(activeExam, answers);
    }
    return null;
  }, [activeExam, answers, deliveryStyle, manualReport, secondsLeft]);

  useEffect(() => {
    if (!activeExam || manualReport || deliveryStyle !== 'timed-exam' || secondsLeft <= 0) return undefined;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeExam, deliveryStyle, manualReport, secondsLeft]);

  const ingestExamFiles = async (fileList) => {
    if (!fileList || !fileList.length) return;
    setInspectingFiles(true);
    try {
      const added = await inspectAndParseAttachmentFiles(fileList);
      if (!added.length) {
        notify?.(en ? 'Unsupported file or exceeds 20 MB.' : 'الملف غير مدعوم أو حجمه أكبر من 20 ميجابايت.');
        return;
      }
      setExamAttachments((prev) => [...prev, ...added].slice(0, 8));
      if (!examTitle && added[0]?.name) {
        setExamTitle(added[0].name.replace(/\.[^.]+$/, ''));
      }
      notify?.(
        en
          ? `Inspected ${added.length} file(s) — ready to build your interactive exam!`
          : `تم فتح وفحص ${added.length === 1 ? `ملف «${added[0].name}»` : `${added.length} ملفات/صور`} بنجاح لبناء الامتحان منها!`,
      );
    } catch {
      notify?.(en ? 'Could not read the selected file.' : 'تعذر قراءة أو فحص الملف المرفق.');
    } finally {
      setInspectingFiles(false);
    }
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.types?.includes('Files')) {
      dragCounterRef.current += 1;
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDraggingOver(false);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);
    if (event.dataTransfer?.files?.length) {
      await ingestExamFiles(event.dataTransfer.files);
    }
  };

  const handlePasteClipboard = async (event) => {
    const items = Array.from(event.clipboardData?.items || []);
    const files = items.filter((i) => i.kind === 'file').map((i) => i.getAsFile()).filter(Boolean);
    if (files.length) {
      event.preventDefault();
      await ingestExamFiles(files);
    }
  };

  const launchExam = async (event) => {
    event?.preventDefault?.();
    if (buildingExam || inspectingFiles) return;

    const effectiveInstructions = sourceMode === 'online-exams'
      ? `دول امتحانات أونلاين سابقة كانت عندنا — ركز عليها بالكامل واستخرج أسئلتها وأفكارها. ${customNotes}`
      : customNotes;

    const hasAttachedFiles = examAttachments.length > 0;
    if (sourceMode !== 'topic' && !hasAttachedFiles && sourceText.trim().length < 20 && !topicInput.trim()) {
      notify?.(
        en
          ? 'Attach a PDF/image, paste lecture or exam text, or enter a topic first.'
          : 'ارفع ملف PDF أو صور امتحانات أو الصق نص المحاضرة أو اكتب اسم المادة أولًا.',
      );
      return;
    }
    if (sourceMode === 'topic' && !hasAttachedFiles && topicInput.trim().length < 2 && sourceText.trim().length < 15) {
      notify?.(
        en
          ? 'Enter the subject/topic name or attach study files/images first.'
          : 'اكتب اسم المادة أو ارفع ملفات/صور المادة لبناء الامتحان عليها.',
      );
      return;
    }

    setBuildingExam(true);
    try {
      const built = await buildSmartExamFromAttachmentsAndText({
        title: examTitle || topicInput,
        sourceText,
        topic: topicInput,
        instructions: effectiveInstructions,
        attachments: examAttachments,
        questionCount,
        questionTypes,
        sourceMode,
        language: en ? 'en' : 'ar',
      });

      setActiveExam(built);
      setCurrentIndex(0);
      setAnswers({});
      setFlagged({});
      setRevealed({});
      setReport(null);
      setSecondsLeft(deliveryStyle === 'timed-exam' ? durationMinutes * 60 : 0);
    } finally {
      setBuildingExam(false);
    }
  };

  const submitExamNow = () => {
    if (!activeExam) return;
    setReport(gradeExamSubmission(activeExam, answers));
  };

  const retryWrongQuestions = () => {
    if (!report || !activeExam) return;
    const wrongQs = report.details.filter((d) => !d.isCorrect).map((d) => d.question);
    if (!wrongQs.length) return;
    setActiveExam({
      ...activeExam,
      title: en ? `${activeExam.title} — Wrong Questions Review` : `${activeExam.title} — مراجعة الأسئلة الخاطئة`,
      totalQuestions: wrongQs.length,
      questions: wrongQs,
    });
    setCurrentIndex(0);
    setAnswers({});
    setFlagged({});
    setRevealed({});
    setReport(null);
    setSecondsLeft(deliveryStyle === 'timed-exam' ? Math.max(5, wrongQs.length * 2) * 60 : 0);
  };

  const resetToBuilder = () => {
    setActiveExam(null);
    setReport(null);
    setAnswers({});
    setFlagged({});
    setRevealed({});
  };

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const onlineDetectedLive = sourceMode === 'online-exams' || hasOnlineExamSignal(sourceText, customNotes);
  const currentQuestion = activeExam?.questions?.[currentIndex] || null;
  const answeredTotal = activeExam ? Object.keys(answers).filter((k) => answers[k] !== undefined && String(answers[k]).trim() !== '').length : 0;

  return (
    <main
      className="exam-studio-page page-shell"
      dir={en ? 'ltr' : 'rtl'}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPaste={handlePasteClipboard}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.pdf,.docx,.txt,.md,.csv,.json"
        style={{ display: 'none' }}
        onChange={(e) => {
          ingestExamFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {isDraggingOver && !activeExam && (
        <div
          style={{
            position: 'fixed',
            inset: 18,
            zIndex: 999,
            borderRadius: 22,
            border: '2px dashed #818cf8',
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(8px)',
            display: 'grid',
            placeItems: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ textAlign: 'center', display: 'grid', gap: 10, justifyItems: 'center' }}>
            <UploadCloud size={50} color="#818cf8" />
            <h2 style={{ margin: 0 }}>
              {en
                ? 'Drop your lecture PDFs, Word docs, or past exam screenshots here'
                : 'أفلت ملفات الـ PDF أو Word أو صور الامتحانات السابقة هنا مباشرة'}
            </h2>
            <p style={{ margin: 0, opacity: 0.85 }}>
              {en
                ? 'Exam Studio will inspect every page & image and generate your interactive exam'
                : 'سيقوم استوديو الامتحانات بفحص وقراءة كل صفحة وصورة وبناء الامتحان التفاعلي منها'}
            </p>
          </div>
        </div>
      )}

      <header className="exam-studio-hero">
        <div className="exam-hero-badge">
          <GraduationCap size={22} />
          <span>{en ? 'INTERACTIVE EXAM & ONLINE QUIZ STUDIO' : 'استوديو الامتحانات التفاعلية والامتحانات الأونلاين'}</span>
        </div>
        <h1>{en ? 'Build & Take Smart Interactive Exams' : 'اصنع وامتحن نفسك في امتحان تفاعلي كامل'}</h1>
        <p>
          {en
            ? 'Upload or drop lecture PDFs, Word files, or screenshots of past online exams to generate a live graded exam with instant explanations and printable PDF export.'
            : 'ارفع أو اسحب ملفات PDF أو Word أو صور امتحاناتك الأونلاين السابقة لبناء امتحان تفاعلي بالدرجات والشرح الفوري مع إمكانية تحميله PDF.'}
        </p>
      </header>

      {!activeExam ? (
        <section className="exam-builder-card">
          <div className="exam-source-tabs" role="tablist">
            <button
              type="button"
              className={sourceMode === 'curriculum' ? 'active' : ''}
              onClick={() => setSourceMode('curriculum')}
            >
              <BookOpenCheck size={17} />
              <span>{en ? 'From Curriculum / Files' : 'من المنهج والمحاضرات'}</span>
            </button>
            <button
              type="button"
              className={sourceMode === 'online-exams' ? 'active highlight-exam' : 'highlight-exam'}
              onClick={() => setSourceMode('online-exams')}
            >
              <Flame size={17} />
              <span>{en ? 'Past Online Exams Focus' : 'امتحانات أونلاين سابقة كانت عندنا'}</span>
            </button>
            <button
              type="button"
              className={sourceMode === 'topic' ? 'active' : ''}
              onClick={() => setSourceMode('topic')}
            >
              <Sparkles size={17} />
              <span>{en ? 'By Subject / Topic' : 'باسم المادة أو الموضوع'}</span>
            </button>
          </div>

          {onlineDetectedLive && (
            <div className="exam-online-alert">
              <Flame size={18} />
              <span>
                {en
                  ? 'Past Online Exam Mode Active: PathPilot will inspect your uploaded exam screenshots/PDFs first and generate twin questions on the exact tested concepts!'
                  : 'وضع التركيز على الامتحانات الأونلاين نشط: سيفحص الموقع صور وملفات امتحاناتك السابقة أولًا ويولّد أسئلة محاكية لنفس تريكات الدكتور!'}
              </span>
            </div>
          )}

          <form className="exam-builder-form" onSubmit={launchExam}>
            <div className="exam-form-grid-2">
              <label>
                <span>{en ? 'Exam Title (optional)' : 'عنوان الامتحان (اختياري)'}</span>
                <input
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder={en ? 'e.g. Commercial Law Midterm — Ch 1-3' : 'مثال: مراجعة القانون التجاري — الفصول ١ إلى ٣'}
                />
              </label>

              <label>
                <span>{en ? 'Subject / Topic Name' : 'اسم المادة أو الموضوع'}</span>
                <input
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder={en ? 'e.g. Commercial Law, SQL Databases, Networks...' : 'مثال: القانون التجاري، قواعد البيانات SQL، الشبكات...'}
                />
              </label>
            </div>

            <div
              style={{
                border: '1.5px dashed rgba(129, 140, 248, 0.48)',
                borderRadius: 16,
                padding: '16px 18px',
                background: 'rgba(15, 23, 42, 0.55)',
                display: 'grid',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <UploadCloud size={24} color="#818cf8" />
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.95rem' }}>
                      {sourceMode === 'online-exams'
                        ? (en ? 'Attach Past Exam Screenshots, Photos, or PDFs' : 'ارفع أو اسحب صور الامتحانات السابقة أو ملفات PDF / Word هنا')
                        : (en ? 'Attach Lecture PDFs, Word Docs, or Slide Images' : 'ارفع أو اسحب ملفات المنهج (PDF أو Word أو صور السلايدز) لبناء الامتحان منها')}
                    </strong>
                    <small style={{ opacity: 0.78 }}>
                      {en
                        ? 'Drag & drop from your PC, click the button, or press Ctrl+V to paste exam screenshots'
                        : 'اسحب الملفات من جهازك مباشرة، أو اضغط الزر، أو الصق سكرين شوت بـ Ctrl+V'}
                    </small>
                  </div>
                </div>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={inspectingFiles}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}
                >
                  {inspectingFiles ? <LoaderCircle className="spin" size={16} /> : <ImagePlus size={16} />}
                  <span>
                    {inspectingFiles
                      ? (en ? 'Inspecting files…' : 'جاري فحص الملفات…')
                      : (en ? 'Choose PDF / Images / Word' : 'اختر ملفات PDF أو صور أو Word')}
                  </span>
                </button>
              </div>

              {examAttachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {examAttachments.map((att) => (
                    <div
                      key={att.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '7px 11px',
                        borderRadius: 12,
                        background: 'rgba(30, 41, 59, 0.94)',
                        border: '1px solid rgba(52, 211, 153, 0.42)',
                        fontSize: '0.82rem',
                      }}
                    >
                      {att.previewUrl ? (
                        <img
                          src={att.previewUrl}
                          alt={att.name}
                          style={{ width: 38, height: 38, objectFit: 'cover', borderRadius: 8 }}
                        />
                      ) : (
                        <FileText size={18} color="#6ee7b7" />
                      )}
                      <div style={{ display: 'grid', gap: 2 }}>
                        <strong style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {att.name}
                        </strong>
                        <small style={{ color: '#6ee7b7', fontSize: '0.73rem' }}>
                          ✓ {en ? att.statusEn : att.statusAr}
                        </small>
                      </div>
                      {(att.textContent || att.previewUrl) && (
                        <button
                          type="button"
                          className="turn-inline-action"
                          onClick={() => setPreviewAttachment(att)}
                        >
                          <Eye size={13} />
                          <span>{en ? 'Inspect' : 'فحص'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setExamAttachments((prev) => prev.filter((x) => x.id !== att.id))}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
                        aria-label={en ? 'Remove file' : 'حذف الملف'}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {sourceMode !== 'topic' && (
              <div className="exam-source-box">
                <div className="exam-source-box-head">
                  <strong>
                    {sourceMode === 'online-exams'
                      ? (en ? 'Or Paste Past Online Exam Questions / Notes (Optional if files attached)' : 'أو الصق أسئلة الامتحانات السابقة / ملاحظاتك نصيًا (اختياري لو أرفقت ملفات أو صور)')
                      : (en ? 'Or Paste Curriculum / Lecture Text (Optional if files attached)' : 'أو الصق نص المحاضرة / الملخص (اختياري لو أرفقت ملفات PDF أو صور)')}
                  </strong>
                </div>
                <textarea
                  rows={5}
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder={
                    sourceMode === 'online-exams'
                      ? (en
                        ? 'Paste any extra past exam questions or notes here...'
                        : 'يمكنك لصق أي أسئلة إضافية هنا بجانب الصور والملفات المرفقة بالأعلى...')
                      : (en
                        ? 'Paste extra lecture notes, definitions, or rules here...'
                        : 'يمكنك لصق أي ملاحظات أو نقاط إضافية هنا بجانب ملفات الـ PDF أو الصور المرفقة...')
                  }
                />
              </div>
            )}

            <label>
              <span>{en ? 'Special Focus Instructions (optional)' : 'تعليمات خاصة للتركيز (حسب كلامك)'}</span>
              <input
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder={en ? 'e.g. Focus heavily on comparisons and online quiz traps...' : 'مثال: دول امتحانات أونلاين كانت عندنا ركز على التريكات والمقارنات...'}
              />
            </label>

            <div className="exam-form-grid-4">
              <label>
                <span>{en ? 'Question Count' : 'عدد الأسئلة'}</span>
                <select value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))}>
                  <option value={5}>{en ? '5 Questions (Quick)' : '5 أسئلة (سريع)'}</option>
                  <option value={10}>{en ? '10 Questions (Standard)' : '10 أسئلة (قياسي)'}</option>
                  <option value={15}>{en ? '15 Questions (Thorough)' : '15 سؤالًا (شامل)'}</option>
                  <option value={20}>{en ? '20 Questions (Full Exam)' : '20 سؤالًا (امتحان كامل)'}</option>
                </select>
              </label>

              <label>
                <span>{en ? 'Question Format' : 'نوع الأسئلة'}</span>
                <select value={questionTypes} onChange={(e) => setQuestionTypes(e.target.value)}>
                  <option value="mixed">{en ? 'MCQ + True/False' : 'اختيار من متعدد + صح وخطأ'}</option>
                  <option value="mcq">{en ? 'Multiple Choice Only (MCQ)' : 'اختيار من متعدد فقط (MCQ)'}</option>
                  <option value="tf">{en ? 'True / False Only' : 'صح وخطأ فقط'}</option>
                  <option value="comprehensive">{en ? 'Full (MCQ + T/F + Written)' : 'شامل (اختياري + صح وخطأ + مقالي)'}</option>
                </select>
              </label>

              <label>
                <span>{en ? 'Exam Mode' : 'نظام الامتحان'}</span>
                <select value={deliveryStyle} onChange={(e) => setDeliveryStyle(e.target.value)}>
                  <option value="practice">{en ? 'Interactive Practice (Instant Explain)' : 'تدريب تفاعلي (تصحيح وشرح فوري)'}</option>
                  <option value="timed-exam">{en ? 'Official Online Exam Simulation' : 'محاكاة امتحان أونلاين رسمي بمؤقت'}</option>
                </select>
              </label>

              <label>
                <span>{en ? 'Timer (Minutes)' : 'وقت الامتحان (بالدقائق)'}</span>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  disabled={deliveryStyle !== 'timed-exam'}
                >
                  <option value={10}>{en ? '10 Minutes' : '10 دقائق'}</option>
                  <option value={20}>{en ? '20 Minutes' : '20 دقيقة'}</option>
                  <option value={30}>{en ? '30 Minutes' : '30 دقيقة'}</option>
                  <option value={45}>{en ? '45 Minutes' : '45 دقيقة'}</option>
                </select>
              </label>
            </div>

            <div className="exam-launch-bar">
              <button type="submit" className="button button-primary exam-start-btn" disabled={buildingExam || inspectingFiles}>
                {buildingExam ? <LoaderCircle className="spin" size={18} /> : <Play size={18} />}
                <span>
                  {buildingExam
                    ? (en ? 'Inspecting files & generating smart exam…' : 'جاري فحص المرفقات والصور وتوليد أسئلة الامتحان الذكية…')
                    : (en ? 'Start Interactive Exam Now' : 'ابدأ الامتحان التفاعلي الآن')}
                </span>
              </button>
            </div>
          </form>
        </section>
      ) : report ? (
        <section className="exam-results-card">
          <div className="exam-score-banner">
            <div className="exam-score-circle">
              <strong>{report.percentage}%</strong>
              <span>{report.grade}</span>
            </div>
            <div className="exam-score-summary">
              <h2>
                <Award size={22} />
                {' '}
                {report.percentage >= 80
                  ? (en ? 'Outstanding Performance!' : 'أداء ممتاز جدًا! استيعاب قوي للمنهج')
                  : report.percentage >= 60
                    ? (en ? 'Good Job — Review Missed Points Below' : 'مستوى جيد — راجع التريكات الخاطئة بالأسفل لتقفل الدرجة')
                    : (en ? 'Needs Focused Revision on Highlighted Concepts' : 'تحتاج مراجعة مركزة للنقاط الموضحة بالأسفل ثم إعادة المحاولة')}
              </h2>
              <p>
                {en
                  ? `You answered ${report.correctCount} out of ${report.total} questions correctly.`
                  : `أجبت إجابة صحيحة على ${report.correctCount} من أصل ${report.total} سؤال.`}
              </p>
              <div className="exam-result-actions">
                {report.wrongCount > 0 && (
                  <button type="button" className="button button-primary" onClick={retryWrongQuestions}>
                    <Target size={16} />
                    <span>{en ? `Retry Wrong Questions (${report.wrongCount})` : `امتحن نفسك في الأسئلة الخاطئة فقط (${report.wrongCount})`}</span>
                  </button>
                )}
                <button type="button" className="button button-ghost" onClick={() => exportExamPaperPdf(activeExam, { includeAnswers: true })}>
                  <FileDown size={16} />
                  <span>{en ? 'Download Solved Exam PDF' : 'تحميل الامتحان محلولًا PDF للقراءة'}</span>
                </button>
                <button type="button" className="button button-ghost" onClick={resetToBuilder}>
                  <RotateCcw size={16} />
                  <span>{en ? 'Create Another Exam' : 'إنشاء امتحان جديد'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="exam-review-list">
            {report.details.map((item, idx) => {
              const q = item.question;
              return (
                <article key={q.id} className={`exam-review-item ${item.isCorrect ? 'correct' : 'wrong'}`}>
                  <div className="exam-review-head">
                    <span>
                      {item.isCorrect ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
                      {' '}
                      <strong>{en ? `Q${idx + 1}` : `س${idx + 1}`}:</strong> {q.stem}
                    </span>
                    <small className="exam-q-tag">{q.badge}</small>
                  </div>
                  {Array.isArray(q.options) ? (
                    <div className="exam-review-options">
                      {q.options.map((opt, oi) => {
                        const isRight = oi === q.correctIndex;
                        const isPicked = Number(item.userAnswer) === oi;
                        return (
                          <div
                            key={`${q.id}-opt-${oi}`}
                            className={`exam-review-opt ${isRight ? 'is-right' : isPicked ? 'is-picked-wrong' : ''}`}
                          >
                            <span>{opt}</span>
                            {isRight && <strong>{en ? '✓ Correct' : '✓ الإجابة الصحيحة'}</strong>}
                            {!isRight && isPicked && <strong>{en ? '✗ Your choice' : '✗ اختيارك'}</strong>}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="exam-short-review">
                      <div><strong>{en ? 'Your Answer:' : 'إجابتك:'}</strong> {item.userAnswer || (en ? '(No answer)' : '(لم تتم الإجابة)')}</div>
                      <div><strong>{en ? 'Model Answer:' : 'الإجابة النموذجية:'}</strong> {q.modelAnswer}</div>
                    </div>
                  )}
                  <div className="exam-explanation-box">
                    <strong>{en ? 'Explanation:' : 'الشرح والتوضيح:'}</strong> {q.explanation}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="exam-runner-shell">
          <div className="exam-runner-topbar">
            <div>
              <strong>{activeExam.title}</strong>
              <small>
                {en
                  ? `Answered ${answeredTotal} of ${activeExam.questions.length}`
                  : `تمت الإجابة على ${answeredTotal} من ${activeExam.questions.length}`}
              </small>
            </div>
            <div className="exam-runner-topbar-end">
              {deliveryStyle === 'timed-exam' && (
                <span className={`exam-timer-pill ${secondsLeft < 60 ? 'urgent' : ''}`}>
                  <Clock size={15} /> {formatTimer(secondsLeft)}
                </span>
              )}
              <button type="button" className="button button-ghost" onClick={() => exportExamPaperPdf(activeExam, { includeAnswers: false })}>
                <FileDown size={15} /> {en ? 'Blank Exam PDF' : 'ورقة أسئلة PDF'}
              </button>
              <button type="button" className="button button-ghost" onClick={resetToBuilder}>
                {en ? 'Exit' : 'إنهاء والعودة'}
              </button>
            </div>
          </div>

          <div className="exam-progress-track">
            <div
              className="exam-progress-fill"
              style={{ width: `${Math.round(((currentIndex + 1) / activeExam.questions.length) * 100)}%` }}
            />
          </div>

          <div className="exam-runner-grid">
            <aside className="exam-palette-card">
              <h4>{en ? 'Question Navigator' : 'خريطة الأسئلة'}</h4>
              <div className="exam-palette-grid">
                {activeExam.questions.map((q, idx) => {
                  const isAnswered = answers[q.id] !== undefined && String(answers[q.id]).trim() !== '';
                  const isFlagged = Boolean(flagged[q.id]);
                  return (
                    <button
                      key={q.id}
                      type="button"
                      className={`exam-palette-btn ${idx === currentIndex ? 'current' : ''} ${isAnswered ? 'answered' : ''} ${isFlagged ? 'flagged' : ''}`}
                      onClick={() => setCurrentIndex(idx)}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
              <button type="button" className="button button-primary exam-finish-btn" onClick={submitExamNow}>
                <CheckCircle2 size={16} />
                <span>{en ? 'Submit & Grade Exam' : 'تسليم الامتحان وإظهار النتيجة'}</span>
              </button>
            </aside>

            {currentQuestion && (
              <div className="exam-question-stage">
                <div className="exam-question-meta">
                  <span className="exam-q-counter">
                    {en ? `Question ${currentIndex + 1} of ${activeExam.questions.length}` : `السؤال ${currentIndex + 1} من ${activeExam.questions.length}`}
                  </span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="exam-q-tag">{currentQuestion.badge}</span>
                    <button
                      type="button"
                      className={`exam-flag-btn ${flagged[currentQuestion.id] ? 'active' : ''}`}
                      onClick={() => setFlagged((prev) => ({ ...prev, [currentQuestion.id]: !prev[currentQuestion.id] }))}
                    >
                      <Flag size={14} /> {en ? 'Flag' : 'علّم للمراجعة'}
                    </button>
                  </div>
                </div>

                <h2 className="exam-question-stem">{currentQuestion.stem}</h2>

                {Array.isArray(currentQuestion.options) ? (
                  <div className="exam-options-list">
                    {currentQuestion.options.map((opt, optIdx) => {
                      const selected = answers[currentQuestion.id] === optIdx;
                      const showFeedback = deliveryStyle === 'practice' && answers[currentQuestion.id] !== undefined;
                      const isCorrectOption = optIdx === currentQuestion.correctIndex;

                      let stateClass = selected ? 'selected' : '';
                      if (showFeedback) {
                        if (isCorrectOption) stateClass = 'correct';
                        else if (selected) stateClass = 'wrong';
                      }

                      return (
                        <button
                          key={`${currentQuestion.id}-${optIdx}`}
                          type="button"
                          className={`exam-option-btn ${stateClass}`}
                          onClick={() => {
                            setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optIdx }));
                            if (deliveryStyle === 'practice') {
                              setRevealed((prev) => ({ ...prev, [currentQuestion.id]: true }));
                            }
                          }}
                        >
                          <span className="exam-option-letter">{['A', 'B', 'C', 'D'][optIdx] || optIdx + 1}</span>
                          <span className="exam-option-text">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="exam-short-input-wrap">
                    <textarea
                      rows={4}
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                      placeholder={en ? 'Type your answer here...' : 'اكتب إجابتك هنا...'}
                    />
                    {deliveryStyle === 'practice' && (
                      <button
                        type="button"
                        className="button button-ghost"
                        onClick={() => setRevealed((prev) => ({ ...prev, [currentQuestion.id]: true }))}
                      >
                        {en ? 'Check Model Answer' : 'اعرض الإجابة النموذجية للمقارنة'}
                      </button>
                    )}
                  </div>
                )}

                {deliveryStyle === 'practice' && revealed[currentQuestion.id] && (
                  <div className="exam-instant-feedback">
                    <strong>{en ? 'Instant Tutor Explanation:' : 'الشرح الفوري للفكرة:'}</strong>
                    <p>{currentQuestion.modelAnswer || currentQuestion.explanation}</p>
                  </div>
                )}

                <div className="exam-stage-nav">
                  <button
                    type="button"
                    className="button button-ghost"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  >
                    {en ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                    <span>{en ? 'Previous' : 'السؤال السابق'}</span>
                  </button>

                  {currentIndex + 1 < activeExam.questions.length ? (
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={() => setCurrentIndex((i) => i + 1)}
                    >
                      <span>{en ? 'Next Question' : 'السؤال التالي'}</span>
                      {en ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                  ) : (
                    <button type="button" className="button button-primary" onClick={submitExamNow}>
                      <CheckCircle2 size={16} />
                      <span>{en ? 'Finish & View Score' : 'إنهاء الامتحان وعرض الدرجة'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {previewAttachment && (
        <div
          className="pdf-modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPreviewAttachment(null);
          }}
        >
          <section className="pdf-modal-card" role="dialog" aria-modal="true" style={{ maxWidth: 740 }}>
            <header className="pdf-modal-head">
              <div className="pdf-modal-title">
                <span className="pdf-modal-icon"><FileText size={20} /></span>
                <div>
                  <h3 style={{ margin: 0 }}>{previewAttachment.name}</h3>
                  <small style={{ color: '#6ee7b7' }}>
                    {en ? previewAttachment.statusEn : previewAttachment.statusAr}
                  </small>
                </div>
              </div>
              <button type="button" className="pdf-modal-close" onClick={() => setPreviewAttachment(null)}>
                <X size={18} />
              </button>
            </header>
            <div className="pdf-modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {previewAttachment.previewUrl && (
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <img
                    src={previewAttachment.previewUrl}
                    alt={previewAttachment.name}
                    style={{ maxWidth: '100%', maxHeight: 380, borderRadius: 12 }}
                  />
                </div>
              )}
              {previewAttachment.textContent ? (
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'inherit',
                    fontSize: '0.88rem',
                    lineHeight: 1.75,
                    padding: 14,
                    borderRadius: 12,
                    background: 'rgba(3, 8, 20, 0.72)',
                    border: '1px solid rgba(148, 163, 184, 0.18)',
                    margin: 0,
                  }}
                >
                  {String(previewAttachment.textContent).slice(0, 8000)}
                </pre>
              ) : null}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
