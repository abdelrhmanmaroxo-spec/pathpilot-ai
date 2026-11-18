import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  BookOpenCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileDown,
  Flag,
  Flame,
  GraduationCap,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Upload,
  XCircle,
} from 'lucide-react';
import {
  exportExamPaperPdf,
  generateInteractiveExam,
  gradeExamSubmission,
  hasOnlineExamSignal,
} from './lib/exam-generator.js';
import { getDocumentLanguage, subscribeLanguageChanges } from './lib/language-state.js';

export default function ExamStudio({ notify }) {
  const [uiLanguage, setUiLanguage] = useState(getDocumentLanguage);
  const en = uiLanguage === 'en';

  const [sourceMode, setSourceMode] = useState('curriculum'); // 'curriculum' | 'online-exams' | 'topic'
  const [examTitle, setExamTitle] = useState('');
  const [topicInput, setTopicInput] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [customNotes, setCustomNotes] = useState('');
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

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      setSourceText((prev) => (prev ? `${prev}\n\n${content}` : content));
      if (!examTitle) setExamTitle(file.name.replace(/\.[^.]+$/, ''));
      notify?.(en ? `Loaded "${file.name}" into Exam Studio.` : `تم استيراد ملف «${file.name}» بنجاح.`);
    } catch {
      notify?.(en ? 'Could not read text file.' : 'تعذر قراءة الملف النصي.');
    } finally {
      event.target.value = '';
    }
  };

  const launchExam = (event) => {
    event?.preventDefault?.();
    const effectiveInstructions = sourceMode === 'online-exams'
      ? `دول امتحانات أونلاين سابقة كانت عندنا — ركز عليها بالكامل. ${customNotes}`
      : customNotes;

    if (sourceMode !== 'topic' && sourceText.trim().length < 20 && !topicInput.trim()) {
      notify?.(en ? 'Paste your lecture notes, past online exam questions, or enter a topic first.' : 'الصق نص المحاضرة أو أسئلة الامتحانات الأونلاين أو اكتب اسم الموضوع أولًا.');
      return;
    }
    if (sourceMode === 'topic' && topicInput.trim().length < 2 && sourceText.trim().length < 15) {
      notify?.(en ? 'Enter the subject or topic you want an exam on.' : 'اكتب اسم المادة أو الموضوع المطلوب عمل امتحان عليه.');
      return;
    }

    const built = generateInteractiveExam({
      title: examTitle || topicInput,
      sourceText,
      topic: topicInput,
      instructions: effectiveInstructions,
      questionCount,
      questionTypes,
      difficulty: sourceMode === 'online-exams' ? 'exam' : 'standard',
      language: en ? 'en' : 'ar',
    });

    setActiveExam(built);
    setCurrentIndex(0);
    setAnswers({});
    setFlagged({});
    setRevealed({});
    setReport(null);
    setSecondsLeft(deliveryStyle === 'timed-exam' ? durationMinutes * 60 : 0);
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
    <main className="exam-studio-page page-shell" dir={en ? 'ltr' : 'rtl'}>
      <header className="exam-studio-hero">
        <div className="exam-hero-badge">
          <GraduationCap size={22} />
          <span>{en ? 'INTERACTIVE EXAM & ONLINE QUIZ STUDIO' : 'استوديو الامتحانات التفاعلية والامتحانات الأونلاين'}</span>
        </div>
        <h1>{en ? 'Build & Take Smart Interactive Exams' : 'اصنع وامتحن نفسك في امتحان تفاعلي كامل'}</h1>
        <p>
          {en
            ? 'Turn your lectures, past online exams, or any study topic into a live graded exam with instant explanations, countdown timer, and printable PDF export.'
            : 'حوّل محاضراتك، أو امتحاناتك الأونلاين السابقة، أو أي موضوع في منهجك إلى امتحان تفاعلي بالدرجات والشرح الفوري مع إمكانية تحميله PDF للقراءة والمراجعة.'}
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
              <span>{en ? 'From Curriculum / Notes' : 'من المنهج والمحاضرات'}</span>
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
                  ? 'Past Online Exam Mode Active: PathPilot will extract your real exam questions first and generate twin exam questions on the same tested concepts!'
                  : 'وضع التركيز على الامتحانات الأونلاين نشط: سيتم استخراج أسئلتك الحقيقية أولًا وتوليد أسئلة محاكية لنفس الأفكار اللي بيسأل فيها الدكتور!'}
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
                  placeholder={en ? 'e.g. Midterm Revision — Chapter 1 to 3' : 'مثال: مراجعة الميدتيرم — الفصول ١ إلى ٣'}
                />
              </label>

              <label>
                <span>{en ? 'Subject / Topic Name' : 'اسم المادة أو الموضوع'}</span>
                <input
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder={en ? 'e.g. SQL Databases, Networks, OOP, Economics...' : 'مثال: قواعد البيانات SQL، الشبكات، البرمجة الكائنية...'}
                />
              </label>
            </div>

            {sourceMode !== 'topic' && (
              <div className="exam-source-box">
                <div className="exam-source-box-head">
                  <strong>
                    {sourceMode === 'online-exams'
                      ? (en ? 'Paste Past Online Exam Questions & Notes' : 'الصق أسئلة الامتحانات الأونلاين السابقة أو ملاحظاتك عليها')
                      : (en ? 'Paste Curriculum / Lecture Text' : 'الصق نص المنهج أو المحاضرة أو الملخص')}
                  </strong>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.md,.csv,.json"
                      hidden
                      onChange={handleFileUpload}
                    />
                    <button type="button" className="button button-ghost" onClick={() => fileInputRef.current?.click()}>
                      <Upload size={15} /> {en ? 'Upload File (.txt / .md)' : 'رفع ملف نصي (.txt / .md)'}
                    </button>
                  </div>
                </div>
                <textarea
                  rows={7}
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder={
                    sourceMode === 'online-exams'
                      ? (en
                        ? 'Paste your past online exam questions here (e.g. 1. Question... A) ... B) ... C) ... D) ... or True/False questions)...'
                        : 'الصق هنا أسئلة الامتحانات الأونلاين اللي كانت عندكم (مثلاً: ١. سؤال... أ) ... ب) ... ج) ... د) ... أو أسئلة صح وغلط ومقالي)...')
                      : (en
                        ? 'Paste lecture notes, definitions, rules, or chapters to build your interactive exam...'
                        : 'الصق شرح المحاضرة أو التعريفات والقوانين والنقاط المهمة لبناء الامتحان منها...')
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
              <button type="submit" className="button button-primary exam-start-btn">
                <Play size={18} />
                <span>{en ? 'Start Interactive Exam Now' : 'ابدأ الامتحان التفاعلي الآن'}</span>
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
    </main>
  );
}
