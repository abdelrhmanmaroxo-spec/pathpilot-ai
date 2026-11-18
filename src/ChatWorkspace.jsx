import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  FileDown,
  Folder,
  FolderPlus,
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
} from 'lucide-react';
import ConversationThread from './components/ConversationThread.jsx';
import CurriculumPdfModal from './components/CurriculumPdfModal.jsx';
import MaterialSynthesisStudio from './components/MaterialSynthesisStudio.jsx';
import VoiceControls from './components/VoiceControls.jsx';
import { streamSmartAiReply } from './lib/assistant.js';
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

const CHAT_FOLDERS_STORAGE_KEY = 'pathpilot.chat_folders.v6';

function loadFolderState() {
  try {
    const raw = JSON.parse(globalThis.localStorage?.getItem?.(CHAT_FOLDERS_STORAGE_KEY) || '{}');
    return {
      folders: Array.isArray(raw?.folders) ? raw.folders.filter(Boolean).slice(0, 40) : [],
      assignments: raw?.assignments && typeof raw.assignments === 'object' ? raw.assignments : {},
    };
  } catch {
    return { folders: [], assignments: {} };
  }
}

function saveFolderState(next) {
  try {
    globalThis.localStorage?.setItem?.(CHAT_FOLDERS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors
  }
  return next;
}

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
  const [folderState, setFolderState] = useState(loadFolderState);
  const [selectedFolder, setSelectedFolder] = useState('__all__');
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth > 1120 : false));
  const [sessionFilter, setSessionFilter] = useState('');
  const [prompt, setPrompt] = useState('');
  const [materialStudioOpen, setMaterialStudioOpen] = useState(false);
  const [pdfBuilderState, setPdfBuilderState] = useState({ open: false, text: '', title: '' });
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

  const activeSessionFolder = activeSession ? (folderState.assignments[activeSession.id] || '') : '';

  const createOrAssignFolder = useCallback((rawName, sessionIdToAssign = '') => {
    const cleanName = String(rawName || '').trim().slice(0, 40);
    if (!cleanName) return;
    setFolderState((prev) => {
      const exists = prev.folders.some((f) => f.toLowerCase() === cleanName.toLowerCase());
      const canonical = exists
        ? prev.folders.find((f) => f.toLowerCase() === cleanName.toLowerCase())
        : cleanName;
      const nextFolders = exists ? prev.folders : [...prev.folders, canonical];
      const nextAssignments = sessionIdToAssign
        ? { ...prev.assignments, [sessionIdToAssign]: canonical }
        : prev.assignments;
      return saveFolderState({ folders: nextFolders, assignments: nextAssignments });
    });
  }, []);

  const assignSessionToFolder = (sessionId, folderName) => {
    setFolderState((prev) => {
      const nextAssignments = { ...prev.assignments };
      if (!folderName) delete nextAssignments[sessionId];
      else nextAssignments[sessionId] = folderName;
      return saveFolderState({ ...prev, assignments: nextAssignments });
    });
  };

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
        folder: folderState.assignments[session.id] || '',
        displayTitle: translateMarkdownSync(session.title, targetLang),
      }))
      .filter((session) => {
        if (selectedFolder !== '__all__' && session.folder !== selectedFolder) return false;
        return (
          !q
          || session.displayTitle.toLowerCase().includes(q)
          || String(session.title || '').toLowerCase().includes(q)
        );
      });
  }, [folderState.assignments, selectedFolder, sessionFilter, sessions, targetLang]);

  const visibleTurns = useMemo(() => {
    const rawTurns = activeSession?.turns || [];
    const combined = streamingTurn?.sessionId === activeSession?.id ? [...rawTurns, streamingTurn] : rawTurns;
    return combined.map((turn) => ({
      ...resolveTurnForLanguage(turn, targetLang),
      rawPrompt: turn.prompt,
    }));
  }, [activeSession, streamingTurn, targetLang]);

  const lastAnswer = visibleTurns.at(-1)?.answer || '';

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
    if (selectedFolder !== '__all__') {
      assignSessionToFolder(session.id, selectedFolder);
    }
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

  const handleAddFolderForm = (event) => {
    event.preventDefault();
    if (!newFolderName.trim()) return;
    const targetName = newFolderName.trim().slice(0, 40);
    createOrAssignFolder(targetName, activeSession?.id || '');
    setSelectedFolder(targetName);
    setNewFolderName('');
    setNewFolderOpen(false);
    notify(en ? `Folder "${targetName}" created.` : `تم إنشاء مجلد «${targetName}» وتنظيم المحادثة بداخله.`);
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
        onDelta: (_delta, fullAnswer, liveTrace) => {
          if (controller.signal.aborted || runToken !== runTokenRef.current) return;
          streamedAnswer = fullAnswer;
          setStreamingTurn((turn) => (
            turn?.id === streamId
              ? {
                ...turn,
                answer: fullAnswer,
                streaming: true,
                ...(liveTrace ? { thinkingTrace: liveTrace } : {}),
              }
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
        ...(result.thinkingTrace ? { thinkingTrace: result.thinkingTrace } : {}),
        i18n: {
          [targetLang]: { prompt: text, answer: result.answer },
        },
      };
      setSessions((current) => appendChatTurn(current, activeSession.id, turn));
      setStreamingTurn(null);

      if (result.actions?.createFolder) {
        const folderName = result.actions.createFolder;
        createOrAssignFolder(folderName, activeSession.id);
        setSelectedFolder(folderName);
        setSidebarOpen(true);
        notify(
          en
            ? `Created folder "${folderName}" and organized this chat.`
            : `تم إنشاء مجلد «${folderName}» ونقل المحادثة إليه تلقائيًا.`,
        );
      }

      if (result.actions?.openPdfTitle) {
        setPdfBuilderState({
          open: true,
          text: result.answer,
          title: result.actions.openPdfTitle,
        });
      }
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
                onClick={() => setNewFolderOpen((v) => !v)}
                title={en ? 'New folder' : 'إنشاء مجلد جديد'}
                aria-label={en ? 'New folder' : 'إنشاء مجلد جديد'}
              >
                <FolderPlus size={16} />
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

            {newFolderOpen && (
              <form onSubmit={handleAddFolderForm} style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder={en ? 'Folder name…' : 'اسم المجلد…'}
                  style={{ flex: 1, minWidth: 0, padding: '6px 10px', borderRadius: 8 }}
                />
                <button type="submit" className="chat-utility-btn">
                  {en ? 'Add' : 'حفظ'}
                </button>
              </form>
            )}

            {folderState.folders.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                <button
                  type="button"
                  className={selectedFolder === '__all__' ? 'chat-mode active' : 'chat-mode'}
                  onClick={() => setSelectedFolder('__all__')}
                  style={{ fontSize: '0.78rem', padding: '4px 9px' }}
                >
                  {en ? 'All' : 'الكل'}
                </button>
                {folderState.folders.map((folderName) => (
                  <button
                    key={folderName}
                    type="button"
                    className={selectedFolder === folderName ? 'chat-mode active' : 'chat-mode'}
                    onClick={() => setSelectedFolder(folderName)}
                    style={{ fontSize: '0.78rem', padding: '4px 9px' }}
                  >
                    <Folder size={12} /> {folderName}
                  </button>
                ))}
              </div>
            )}

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
                  title={en ? 'Chats & Folders' : 'المحادثات والمجلدات'}
                  aria-label={en ? 'Chats & Folders' : 'المحادثات والمجلدات'}
                >
                  <PanelLeftOpen size={16} />
                </button>
              )}
              <strong className="chatgpt-session-title">{activeDisplayTitle}</strong>
              {activeSessionFolder && (
                <span className="chat-memory-badge">
                  <Folder size={12} /> {activeSessionFolder}
                </span>
              )}
            </div>

            <div className="chatgpt-topbar-end">
              {folderState.folders.length > 0 && activeSession && (
                <select
                  className="chatgpt-turn-jumper"
                  value={activeSessionFolder}
                  onChange={(e) => assignSessionToFolder(activeSession.id, e.target.value)}
                  aria-label={en ? 'Assign folder' : 'نقل إلى مجلد'}
                >
                  <option value="">{en ? 'No folder' : 'بدون مجلد'}</option>
                  {folderState.folders.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              )}
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
                  <h2>{en ? 'What would you like to learn, organize, or build?' : 'تحب نفكر في إيه، نلخّص إيه، أو ننظم إيه النهارده؟'}</h2>
                  <div className="chat-starter-chips">
                    <button type="button" onClick={() => { setPrompt(en ? 'Create a folder for this subject and summarize: ' : 'اعمل مجلد لهذه المادة ولخّصلي الفصل ده باحترافية: '); textareaRef.current?.focus(); }}>
                      <FolderPlus size={14} /> {en ? 'Organize in Folder & Summarize' : 'أنشئ مجلد للمادة ولخّص'}
                    </button>
                    <button type="button" onClick={() => { setPrompt(en ? 'Solve and explain these past online exam questions: ' : 'دول امتحانات أونلاين كانت عندنا، حلّهم واشرح الأفكار المهمة: '); textareaRef.current?.focus(); }}>
                      {en ? 'Solve Past Online Exams' : 'حلّ امتحانات أونلاين سابقة'}
                    </button>
                    <button type="button" onClick={() => setPdfBuilderState({ open: true, text: '', title: '' })}>
                      <FileDown size={14} /> {en ? 'Generate Reading PDF' : 'توليد ملف PDF للقراءة'}
                    </button>
                  </div>
                </div>
              )}

              {loading && !streamingTurn?.answer && (
                <div className="chatgpt-live-indicator">
                  <div className="chat-live-status" role="status" aria-live="polite">
                    <LoaderCircle className="spin" size={15} />
                    <span>{en ? 'Thinking…' : 'جاري التفكير وإعداد الإجابة…'}</span>
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
                  placeholder={en ? 'Ask anything, ask to create a folder, or build a PDF…' : 'اسأل أي سؤال، أو اطلب إنشاء مجلد أو توليد ملف PDF…'}
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
