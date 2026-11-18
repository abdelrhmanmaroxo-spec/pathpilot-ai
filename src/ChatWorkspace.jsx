import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  Check,
  FileDown,
  KeyRound,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Send,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import ConversationThread from './components/ConversationThread.jsx';
import CurriculumPdfModal from './components/CurriculumPdfModal.jsx';
import MaterialSynthesisStudio from './components/MaterialSynthesisStudio.jsx';
import VoiceControls from './components/VoiceControls.jsx';
import {
  loadAiProviderVault,
  saveAiProviderVault,
  streamSmartAiReply,
} from './lib/assistant.js';
import {
  appendChatTurn,
  createChatSession,
  deleteChatSession,
  loadChatSessions,
  updateChatTurnTranslation,
  upsertChatSession,
} from './lib/chat-memory.js';
import { createConversationTurn } from './lib/conversation-context.js';
import {
  detectDominantLanguage,
  resolveTurnForLanguage,
  translateMarkdownAsync,
  translateMarkdownSync,
} from './lib/live-content-translator.js';
import { buildMaterialPromptEnvelope } from './lib/material-intelligence.js';

function initialChatState() {
  const stored = loadChatSessions();
  if (stored.length) return stored;
  const first = createChatSession();
  return upsertChatSession([], first);
}

export function ChatDevelopmentNotice({ language }) {
  const en = language === 'en';
  return (
    <main className="chat-page">
      <div className="page-shell chat-development-notice">
        <LockKeyhole size={34} />
        <span>PATHPILOT CHAT</span>
        <h1>{en ? 'Chat is ready.' : 'المحادثة الذكية جاهزة.'}</h1>
      </div>
    </main>
  );
}

export default function ChatWorkspace({ preferences, notify, language }) {
  const [sessions, setSessions] = useState(initialChatState);
  const [activeId, setActiveId] = useState(() => initialChatState()[0]?.id || '');
  const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth > 1120 : false));
  const [sessionFilter, setSessionFilter] = useState('');
  const [prompt, setPrompt] = useState('');
  const [materialStudioOpen, setMaterialStudioOpen] = useState(false);
  const [pdfBuilderState, setPdfBuilderState] = useState({ open: false, text: '', title: '' });
  const [aiSetupOpen, setAiSetupOpen] = useState(false);
  const [aiKeys, setAiKeys] = useState(loadAiProviderVault);
  const [loading, setLoading] = useState(false);
  const [streamingTurn, setStreamingTurn] = useState(null);
  const [pinnedToBottom, setPinnedToBottom] = useState(true);

  const abortRef = useRef(null);
  const runTokenRef = useRef(0);
  const streamViewportRef = useRef(null);
  const textareaRef = useRef(null);
  const pinnedRef = useRef(true);
  const en = language === 'en';
  const targetLang = en ? 'en' : 'ar';

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeId) || sessions[0] || null,
    [activeId, sessions],
  );

  useEffect(() => {
    if (!activeSession?.turns?.length) return undefined;
    const controller = new AbortController();
    let cancelled = false;

    const translatePendingTurns = async () => {
      for (const turn of activeSession.turns) {
        if (cancelled) break;
        const cached = turn.i18n?.[targetLang];
        const answerDom = detectDominantLanguage(turn.answer);
        const promptDom = detectDominantLanguage(turn.prompt);
        const needsAnswer = !cached?.answer && answerDom !== 'neutral' && answerDom !== targetLang;
        const needsPrompt = !cached?.prompt && promptDom !== 'neutral' && promptDom !== targetLang;
        if (!needsAnswer && !needsPrompt) continue;

        const [nextPrompt, nextAnswer] = await Promise.all([
          needsPrompt ? translateMarkdownAsync(turn.prompt, targetLang, { signal: controller.signal }) : Promise.resolve(cached?.prompt || turn.prompt),
          needsAnswer ? translateMarkdownAsync(turn.answer, targetLang, { signal: controller.signal }) : Promise.resolve(cached?.answer || turn.answer),
        ]);

        if (!cancelled && (nextPrompt || nextAnswer)) {
          setSessions((current) => updateChatTurnTranslation(current, activeSession.id, turn.id, targetLang, {
            prompt: nextPrompt,
            answer: nextAnswer,
          }));
        }
      }
    };

    translatePendingTurns();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activeSession?.id, activeSession?.turns, targetLang]);

  const filteredSessions = useMemo(() => {
    const q = sessionFilter.trim().toLowerCase();
    return sessions
      .map((session) => ({
        ...session,
        displayTitle: translateMarkdownSync(session.title, targetLang),
      }))
      .filter((session) => (
        !q
        || session.displayTitle.toLowerCase().includes(q)
        || String(session.title || '').toLowerCase().includes(q)
      ));
  }, [sessionFilter, sessions, targetLang]);

  const visibleTurns = useMemo(() => {
    const rawTurns = activeSession?.turns || [];
    const combined = streamingTurn?.sessionId === activeSession?.id ? [...rawTurns, streamingTurn] : rawTurns;
    return combined.map((turn) => ({
      ...resolveTurnForLanguage(turn, targetLang),
      rawPrompt: turn.prompt,
    }));
  }, [activeSession, streamingTurn, targetLang]);

  const lastAnswer = visibleTurns.at(-1)?.answer || '';
  const hasCustomKey = Boolean(aiKeys.geminiKey || aiKeys.groqKey);

  const syncScrollPinState = useCallback(() => {
    const vp = streamViewportRef.current;
    if (!vp) return;
    const distance = vp.scrollHeight - vp.scrollTop - vp.clientHeight;
    const nearBottom = distance <= 76;
    pinnedRef.current = nearBottom;
    setPinnedToBottom(nearBottom);
  }, []);

  const handleUserWheel = useCallback((event) => {
    if (event.deltaY < 0) {
      pinnedRef.current = false;
      setPinnedToBottom(false);
    }
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    const vp = streamViewportRef.current;
    if (!vp) return;
    pinnedRef.current = true;
    setPinnedToBottom(true);
    vp.scrollTo({ top: vp.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    if (!loading && !streamingTurn?.answer) return;
    if (pinnedRef.current) {
      const vp = streamViewportRef.current;
      if (vp) vp.scrollTop = vp.scrollHeight;
    }
  }, [loading, streamingTurn?.answer, visibleTurns.length]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(168, Math.max(50, el.scrollHeight))}px`;
  }, [prompt]);

  const selectSession = (sessionId) => {
    abortRef.current?.abort();
    runTokenRef.current += 1;
    setActiveId(sessionId);
    setPrompt('');
    setStreamingTurn(null);
    setLoading(false);
    globalThis.setTimeout(() => scrollToBottom(false), 25);
  };

  const createNewChat = () => {
    abortRef.current?.abort();
    runTokenRef.current += 1;
    const session = createChatSession({ title: en ? 'New chat' : 'محادثة جديدة' });
    const next = upsertChatSession(sessions, session);
    setSessions(next);
    setActiveId(session.id);
    setPrompt('');
    setStreamingTurn(null);
    setLoading(false);
  };

  const removeChat = (sessionId) => {
    abortRef.current?.abort();
    runTokenRef.current += 1;
    setStreamingTurn(null);
    const next = deleteChatSession(sessions, sessionId);
    if (next.length) {
      setSessions(next);
      if (activeId === sessionId) setActiveId(next[0].id);
      return;
    }
    const replacement = createChatSession({ title: en ? 'New chat' : 'محادثة جديدة' });
    const restored = upsertChatSession([], replacement);
    setSessions(restored);
    setActiveId(replacement.id);
  };

  const openSessionPdfBuilder = () => {
    const compiled = visibleTurns
      .map((turn) => `### ${turn.prompt.split('\n')[0]}\n${turn.answer}`)
      .join('\n\n');
    setPdfBuilderState({
      open: true,
      text: compiled,
      title: translateMarkdownSync(activeSession?.title || '', targetLang),
    });
  };

  const generateCustomAiCurriculumSummary = async ({ materials: mats, rawText, options }) => {
    const outLang = options.language === 'en' ? 'en' : 'ar';
    const envelope = buildMaterialPromptEnvelope({
      action: mats?.length >= 2 ? 'merge' : 'summarize',
      materials: mats?.length ? mats : [{ id: 'pdf-raw', title: options.courseTitle || 'Curriculum', content: rawText }],
      userPrompt: [
        options.customInstructions,
        outLang === 'en'
          ? `Respond strictly in English. Format as a clean ${options.template} curriculum summary (${options.density} depth).`
          : `اكتب الملخص باللغة العربية السلسة بأسلوب (${options.template}) ومستوى تفصيل (${options.density}).`,
      ].filter(Boolean).join(' '),
      deepThink: true,
      language: outLang,
    });
    const res = await streamSmartAiReply({
      prompt: envelope,
      turns: [],
      language: outLang,
      mode: 'study',
      tool: 'summarize',
      preferences,
    });
    return res?.answer || '';
  };

  const appendInstantTurn = (promptLabel, instantAnswer) => {
    if (!activeSession || !instantAnswer) return;
    const turn = {
      ...createConversationTurn({
        prompt: promptLabel,
        answer: instantAnswer,
        source: 'local-synthesis',
        tool: 'summarize',
      }),
      i18n: {
        [targetLang]: { prompt: promptLabel, answer: instantAnswer },
      },
    };
    setSessions((current) => appendChatTurn(current, activeSession.id, turn));
    setMaterialStudioOpen(false);
    pinnedRef.current = true;
    globalThis.setTimeout(() => scrollToBottom(true), 35);
  };

  const runPrompt = async (overrideText, extraMeta = {}) => {
    const text = String(overrideText ?? prompt ?? '').trim();
    if (text.length < 1 || !activeSession) return;

    if (extraMeta.action) setMaterialStudioOpen(false);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const runToken = runTokenRef.current + 1;
    const streamId = `stream-${runToken}-${Date.now()}`;
    let streamedAnswer = '';
    runTokenRef.current = runToken;
    pinnedRef.current = true;
    setPinnedToBottom(true);
    setLoading(true);
    setPrompt('');

    setStreamingTurn({
      id: streamId,
      sessionId: activeSession.id,
      prompt: text,
      answer: '',
      source: 'streaming',
      tool: 'ask',
      streaming: true,
    });

    try {
      const result = await streamSmartAiReply({
        prompt: text,
        turns: activeSession.turns || [],
        language: targetLang,
        mode: 'general',
        tool: 'ask',
        preferences: { ...preferences, uiLanguage: targetLang },
        signal: controller.signal,
        onDelta: (_delta, fullAnswer) => {
          if (controller.signal.aborted || runToken !== runTokenRef.current) return;
          streamedAnswer = fullAnswer;
          setStreamingTurn((turn) => (
            turn?.id === streamId
              ? { ...turn, answer: fullAnswer, streaming: true }
              : turn
          ));
        },
      });
      if (controller.signal.aborted || runToken !== runTokenRef.current) return;

      const turn = {
        ...createConversationTurn({
          prompt: text,
          answer: result.answer,
          source: result.source,
          tool: 'ask',
        }),
        i18n: {
          [targetLang]: { prompt: text, answer: result.answer },
        },
      };
      setSessions((current) => appendChatTurn(current, activeSession.id, turn));
      setStreamingTurn(null);
    } catch (error) {
      if (controller.signal.aborted || runToken !== runTokenRef.current) return;
      if (streamedAnswer) {
        const partial = createConversationTurn({
          prompt: text,
          answer: streamedAnswer,
          source: 'interrupted-stream',
          tool: 'ask',
        });
        setSessions((current) => appendChatTurn(current, activeSession.id, partial));
      }
      setStreamingTurn(null);
      notify(error?.message || (en ? 'Could not complete request.' : 'تعذر إكمال الطلب الآن.'));
    } finally {
      if (runToken === runTokenRef.current) setLoading(false);
    }
  };

  const stopGeneration = () => {
    abortRef.current?.abort();
    runTokenRef.current += 1;
    setLoading(false);
    if (streamingTurn?.answer && streamingTurn?.sessionId) {
      const partialTurn = createConversationTurn({
        prompt: streamingTurn.prompt,
        answer: streamingTurn.answer,
        source: 'stopped-stream',
        tool: 'ask',
      });
      setSessions((current) => appendChatTurn(current, streamingTurn.sessionId, partialTurn));
    }
    setStreamingTurn(null);
  };

  const saveAiKeysForm = (event) => {
    event.preventDefault();
    const saved = saveAiProviderVault(aiKeys);
    setAiKeys(saved);
    setAiSetupOpen(false);
    notify(en ? 'AI engine settings encrypted and saved.' : 'تم تشفير وحفظ إعدادات محرك الـ AI بنجاح.');
  };

  const activeDisplayTitle = translateMarkdownSync(activeSession?.title || (en ? 'New chat' : 'محادثة جديدة'), targetLang);

  return (
    <main className="chat-page chatgpt-app-shell">
      <div className={sidebarOpen ? 'chatgpt-layout has-sidebar' : 'chatgpt-layout sidebar-collapsed'}>
        {sidebarOpen && (
          <aside className="chat-sidebar chatgpt-sidebar" aria-label={en ? 'Saved chats' : 'المحادثات المحفوظة'}>
            <div className="chatgpt-sidebar-top">
              <button className="chat-new-button" type="button" onClick={createNewChat}>
                <Plus size={16} /> {en ? 'New chat' : 'محادثة جديدة'}
              </button>
              <button
                type="button"
                className="chat-utility-btn icon-only"
                onClick={() => setSidebarOpen(false)}
                title={en ? 'Hide sidebar' : 'إخفاء القائمة'}
                aria-label={en ? 'Hide sidebar' : 'إخفاء القائمة'}
              >
                <PanelLeftClose size={16} />
              </button>
            </div>

            {sessions.length > 3 && (
              <label className="chat-sidebar-search">
                <Search size={14} />
                <input
                  type="text"
                  value={sessionFilter}
                  onChange={(event) => setSessionFilter(event.target.value)}
                  placeholder={en ? 'Search chats…' : 'بحث في المحادثات…'}
                />
              </label>
            )}

            <div className="chat-session-list chatgpt-session-scroll">
              {filteredSessions.map((session) => (
                <div className={session.id === activeSession?.id ? 'chat-session active' : 'chat-session'} key={session.id}>
                  <button type="button" onClick={() => selectSession(session.id)}>
                    <MessageSquareText size={15} />
                    <span>{session.displayTitle}</span>
                  </button>
                  <button type="button" className="chat-delete" onClick={() => removeChat(session.id)} aria-label={en ? 'Delete chat' : 'حذف المحادثة'}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </aside>
        )}

        <section className="chat-main chatgpt-main-pane">
          <header className="chatgpt-topbar">
            <div className="chatgpt-topbar-start">
              {!sidebarOpen && (
                <button
                  type="button"
                  className="chat-utility-btn icon-only"
                  onClick={() => setSidebarOpen(true)}
                  title={en ? 'Chats' : 'المحادثات'}
                  aria-label={en ? 'Chats' : 'المحادثات'}
                >
                  <PanelLeftOpen size={16} />
                </button>
              )}
              <strong className="chatgpt-session-title">{activeDisplayTitle}</strong>
            </div>

            <div className="chatgpt-topbar-end">
              <button
                type="button"
                className="chat-utility-btn"
                onClick={() => setAiSetupOpen((v) => !v)}
                title={en ? 'Live AI Engine' : 'محرك الذكاء الاصطناعي'}
              >
                <KeyRound size={14} />
                <span>{hasCustomKey ? (en ? 'Pro AI Active' : 'AI فائق نشط') : (en ? 'Live AI On' : 'AI ذكي متصل')}</span>
              </button>
              {visibleTurns.length > 0 && (
                <button type="button" className="chat-utility-btn highlight-pdf" onClick={openSessionPdfBuilder}>
                  <FileDown size={14} /> <span>PDF</span>
                </button>
              )}
              <button
                type="button"
                className="chat-utility-btn icon-only"
                onClick={createNewChat}
                title={en ? 'New chat' : 'محادثة جديدة'}
                aria-label={en ? 'New chat' : 'محادثة جديدة'}
              >
                <Plus size={16} />
              </button>
            </div>
          </header>

          {aiSetupOpen && (
            <form
              onSubmit={saveAiKeysForm}
              style={{
                margin: '10px auto 0',
                maxWidth: 680,
                width: 'calc(100% - 28px)',
                padding: '14px 16px',
                borderRadius: 14,
                background: 'rgba(17, 24, 39, 0.92)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                display: 'grid',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.92rem' }}>
                  {en ? 'Live AI Engine (Works Free Automatically — Optional Speed Key)' : 'محرك الذكاء الاصطناعي الحي (يعمل مجانًا تلقائيًا — أو أضف مفتاح مجاني للسرعة القصوى)'}
                </strong>
                <button type="button" className="chat-utility-btn icon-only" onClick={() => setAiSetupOpen(false)}>
                  <X size={15} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                <input
                  type="password"
                  value={aiKeys.geminiKey}
                  onChange={(e) => setAiKeys((prev) => ({ ...prev, geminiKey: e.target.value }))}
                  placeholder={en ? 'Optional Free Gemini Key (AIza...)' : 'مفتاح Gemini مجاني اختياري (AIza...)'}
                />
                <input
                  type="password"
                  value={aiKeys.groqKey}
                  onChange={(e) => setAiKeys((prev) => ({ ...prev, groqKey: e.target.value }))}
                  placeholder={en ? 'Optional Free Groq Key (gsk_...)' : 'مفتاح Groq مجاني اختياري (gsk_...)'}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="button button-primary" style={{ padding: '7px 16px' }}>
                  <Check size={15} /> <span>{en ? 'Save Encrypted' : 'تشفير وحفظ'}</span>
                </button>
              </div>
            </form>
          )}

          <div
            ref={streamViewportRef}
            onScroll={syncScrollPinState}
            onWheel={handleUserWheel}
            onTouchMove={syncScrollPinState}
            className="chat-thread-panel chatgpt-scroll-stream"
          >
            <div className="chatgpt-reading-column">
              {visibleTurns.length ? (
                <ConversationThread
                  turns={visibleTurns}
                  maxTurns={200}
                  onReuse={(value) => {
                    setPrompt(value);
                    textareaRef.current?.focus();
                  }}
                  onExportTurnPdf={(turn) => setPdfBuilderState({
                    open: true,
                    text: turn.answer,
                    title: turn.prompt.split('\n')[0].slice(0, 60),
                  })}
                />
              ) : (
                <div className="chat-empty-state chatgpt-welcome">
                  <div className="chatgpt-welcome-orb"><Sparkles size={24} /></div>
                  <h2>{en ? 'What would you like to build, learn, or summarize?' : 'تحب نذاكر إيه، نلخّص إيه، أو ننشئ إيه النهارده؟'}</h2>
                  <div className="chat-starter-chips">
                    <button type="button" onClick={() => { setPrompt(en ? 'Summarize these lecture notes clearly: ' : 'لخّصلي المحاضرة دي بشكل مرتب وسهل للمذاكرة: '); textareaRef.current?.focus(); }}>
                      {en ? 'Summarize a lecture' : 'لخّصلي محاضرة بذكاء'}
                    </button>
                    <button type="button" onClick={() => { setPrompt(en ? 'Solve and explain these past online exam questions: ' : 'دول أسئلة امتحان أونلاين سابقة، حلّهم واشرحلي كل فكرة: '); textareaRef.current?.focus(); }}>
                      {en ? 'Solve past online exam' : 'حلّ أسئلة امتحان أونلاين'}
                    </button>
                    <button type="button" onClick={() => setPdfBuilderState({ open: true, text: '', title: '' })}>
                      <FileDown size={14} /> {en ? 'Generate Reading PDF' : 'إنشاء ملخص PDF للقراءة'}
                    </button>
                  </div>
                </div>
              )}

              {loading && !streamingTurn?.answer && (
                <div className="chatgpt-live-indicator">
                  <div className="chat-live-status" role="status" aria-live="polite">
                    <LoaderCircle className="spin" size={15} />
                    <span>{en ? 'PathPilot AI is thinking…' : 'PathPilot AI بيفكر ويكتب…'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <section className="chat-composer chatgpt-composer-dock">
            {!pinnedToBottom && visibleTurns.length > 0 && (
              <button type="button" className="chatgpt-scroll-fab" onClick={() => scrollToBottom(true)}>
                <ArrowDown size={15} />
                <span>{en ? 'Latest' : 'الأسفل'}</span>
              </button>
            )}

            <div className="chatgpt-composer-inner">
              {materialStudioOpen && (
                <div className="chatgpt-drawer-sheet">
                  <MaterialSynthesisStudio
                    language={targetLang}
                    deepThink
                    onToggleDeepThink={() => {}}
                    onRunPrompt={(envelope, meta) => runPrompt(envelope, meta)}
                    onGenerateCustomAiSummary={generateCustomAiCurriculumSummary}
                    onInstantAnswer={(instantAnswer) => appendInstantTurn(
                      en ? 'Merged Curriculum Summary' : 'ملخص مدمج للمحاضرات',
                      instantAnswer,
                    )}
                    notify={notify}
                  />
                </div>
              )}

              <div className="chatgpt-input-box">
                <textarea
                  ref={textareaRef}
                  id="assistant-prompt"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder={en ? 'Ask anything, create content, or paste lectures…' : 'اسأل في أي حاجة، اطلب إنشاء أو تلخيص، أو اتكلم براحتك…'}
                  maxLength={12000}
                  rows={1}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey && !loading) {
                      event.preventDefault();
                      runPrompt();
                    }
                    if (event.key === 'Escape' && loading) {
                      event.preventDefault();
                      stopGeneration();
                    }
                  }}
                />
                {loading ? (
                  <button className="chatgpt-send-btn stop" type="button" onClick={stopGeneration} title={en ? 'Stop' : 'إيقاف'} aria-label={en ? 'Stop' : 'إيقاف'}>
                    <Square size={16} />
                  </button>
                ) : (
                  <button className="chatgpt-send-btn" type="button" disabled={prompt.trim().length < 1} onClick={() => runPrompt()} title={en ? 'Send' : 'إرسال'} aria-label={en ? 'Send' : 'إرسال'}>
                    <Send size={17} />
                  </button>
                )}
              </div>

              <div className="chatgpt-controls-bar">
                <div className="chat-mode-row">
                  <button
                    type="button"
                    className={materialStudioOpen ? 'chat-mode active' : 'chat-mode'}
                    onClick={() => setMaterialStudioOpen((value) => !value)}
                  >
                    <Layers3 size={14} /> {en ? 'Merge Lectures' : 'دمج محاضرات'}
                  </button>
                  <button type="button" className="chat-mode pdf-chip" onClick={openSessionPdfBuilder}>
                    <FileDown size={14} /> {en ? 'Export PDF' : 'ملف PDF'}
                  </button>
                </div>

                <VoiceControls
                  value={prompt}
                  onChange={(value) => setPrompt(value)}
                  answer={lastAnswer}
                  notify={notify}
                  compact
                  onAutoSubmit={(spokenText) => runPrompt(spokenText)}
                />
              </div>
            </div>
          </section>
        </section>
      </div>

      <CurriculumPdfModal
        open={pdfBuilderState.open}
        onClose={() => setPdfBuilderState((prev) => ({ ...prev, open: false }))}
        language={targetLang}
        rawText={pdfBuilderState.text || lastAnswer}
        defaultTitle={pdfBuilderState.title || activeDisplayTitle}
        onGenerateCustomAiSummary={generateCustomAiCurriculumSummary}
        notify={notify}
      />
    </main>
  );
}
