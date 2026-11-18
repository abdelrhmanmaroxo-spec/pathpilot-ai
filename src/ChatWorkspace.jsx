import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BrainCircuit,
  ChevronDown,
  Download,
  FileDown,
  Headphones,
  Globe2,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Send,
  Settings2,
  Square,
  Trash2,
  WandSparkles,
} from 'lucide-react';
import ConversationThread from './components/ConversationThread.jsx';
import CurriculumPdfModal from './components/CurriculumPdfModal.jsx';
import MaterialSynthesisStudio from './components/MaterialSynthesisStudio.jsx';
import VoiceControls from './components/VoiceControls.jsx';
import { generateRoutedAssistantResponse, streamRoutedAssistantResponse } from './lib/assistant-router.js';
import { CHAT_AGENT_OPTION_GROUPS } from './lib/chat-agent-orchestrator.js';
import { loadChatAgentSettings, toggleChatAgentGroup } from './lib/chat-agent-settings.js';
import {
  appendChatTurn,
  createChatSession,
  deleteChatSession,
  loadChatSessions,
  updateChatTurnTranslation,
  upsertChatSession,
} from './lib/chat-memory.js';
import { buildConversationPrompt, createConversationTurn } from './lib/conversation-context.js';
import {
  detectDominantLanguage,
  resolveTurnForLanguage,
  translateMarkdownAsync,
  translateMarkdownSync,
} from './lib/live-content-translator.js';
import { buildDeepThinkingTrace, buildMaterialPromptEnvelope } from './lib/material-intelligence.js';

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
        <h1>{en ? 'Chat is currently under development.' : 'قسم الشات قيد التطوير حاليًا.'}</h1>
        <p>{en ? 'This experimental area is currently available to Admin and Owner accounts only while memory, search, and deep analysis are being validated.' : 'النسخة التجريبية متاحة حاليًا للـAdmin والـOwner فقط لحد ما نكمل اختبار الذاكرة والبحث والتفكير المعمق.'}</p>
        <strong>{en ? 'Under development by Abdelrhman' : 'قيد التطوير من المطور Abdelrhman'}</strong>
      </div>
    </main>
  );
}

export default function ChatWorkspace({ preferences, notify, language }) {
  const [sessions, setSessions] = useState(initialChatState);
  const [activeId, setActiveId] = useState(() => initialChatState()[0]?.id || '');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessionFilter, setSessionFilter] = useState('');
  const [threadSearch, setThreadSearch] = useState('');
  const [prompt, setPrompt] = useState('');
  const [forceSearch, setForceSearch] = useState(false);
  const [forceDeepThink, setForceDeepThink] = useState(false);
  const [materialStudioOpen, setMaterialStudioOpen] = useState(false);
  const [pdfBuilderState, setPdfBuilderState] = useState({ open: false, text: '', title: '' });
  const [toolPanelOpen, setToolPanelOpen] = useState(false);
  const [agentSettings, setAgentSettings] = useState(loadChatAgentSettings);
  const [voiceInputUsed, setVoiceInputUsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState([]);
  const [streamingTurn, setStreamingTurn] = useState(null);
  const [liveActivity, setLiveActivity] = useState(null);
  const [pinnedToBottom, setPinnedToBottom] = useState(true);
  const [unreadBelow, setUnreadBelow] = useState(false);

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

  // Background async translation upgrade whenever language toggles so free-form chat outputs also flip AR <-> EN cleanly
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
        || (session.turns || []).some((turn) => (
          String(turn.prompt || '').toLowerCase().includes(q)
          || String(turn.answer || '').toLowerCase().includes(q)
        ))
      ));
  }, [sessionFilter, sessions, targetLang]);

  const localizedTurns = useMemo(() => {
    const rawTurns = activeSession?.turns || [];
    const combined = streamingTurn?.sessionId === activeSession?.id ? [...rawTurns, streamingTurn] : rawTurns;
    return combined.map((turn) => ({
      ...resolveTurnForLanguage(turn, targetLang),
      rawPrompt: turn.prompt,
    }));
  }, [activeSession, streamingTurn, targetLang]);

  const visibleTurns = useMemo(() => {
    const q = threadSearch.trim().toLowerCase();
    if (!q) return localizedTurns;
    return localizedTurns.filter((turn) => (
      String(turn.prompt || '').toLowerCase().includes(q)
      || String(turn.answer || '').toLowerCase().includes(q)
    ));
  }, [localizedTurns, threadSearch]);

  const lastAnswer = visibleTurns.at(-1)?.answer || '';
  const searchDisabled = agentSettings.disabledGroups.includes('search');
  const deepDisabled = agentSettings.disabledGroups.includes('deep');

  const syncScrollPinState = useCallback(() => {
    const vp = streamViewportRef.current;
    if (!vp) return;
    const distance = vp.scrollHeight - vp.scrollTop - vp.clientHeight;
    const nearBottom = distance <= 76;
    pinnedRef.current = nearBottom;
    setPinnedToBottom(nearBottom);
    if (nearBottom) setUnreadBelow(false);
  }, []);

  const handleUserWheel = useCallback((event) => {
    if (event.deltaY < 0) {
      pinnedRef.current = false;
      setPinnedToBottom(false);
    }
  }, []);

  const scrollToTop = useCallback(() => {
    const vp = streamViewportRef.current;
    if (!vp) return;
    pinnedRef.current = false;
    setPinnedToBottom(false);
    vp.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    const vp = streamViewportRef.current;
    if (!vp) return;
    pinnedRef.current = true;
    setPinnedToBottom(true);
    setUnreadBelow(false);
    vp.scrollTo({ top: vp.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const jumpToTurnIndex = useCallback((idx) => {
    const vp = streamViewportRef.current;
    if (!vp) return;
    const target = vp.querySelector(`[data-turn-index="${idx}"]`);
    if (!target) return;
    pinnedRef.current = idx >= visibleTurns.length - 1;
    setPinnedToBottom(pinnedRef.current);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [visibleTurns.length]);

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
    el.style.height = `${Math.min(168, Math.max(52, el.scrollHeight))}px`;
  }, [prompt]);

  const clearTransientResponse = () => {
    setStreamingTurn(null);
    setSources([]);
    setLoading(false);
    setLiveActivity(null);
    setUnreadBelow(false);
  };

  const selectSession = (sessionId) => {
    abortRef.current?.abort();
    runTokenRef.current += 1;
    setActiveId(sessionId);
    setPrompt('');
    setThreadSearch('');
    clearTransientResponse();
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
    setThreadSearch('');
    clearTransientResponse();
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

  const exportActiveChat = () => {
    if (!visibleTurns.length) {
      notify(en ? 'No messages in this chat to export yet.' : 'لا توجد رسائل في هذه المحادثة لتصديرها بعد.');
      return;
    }
    const title = translateMarkdownSync(activeSession?.title || 'PathPilot Chat', targetLang);
    const body = visibleTurns
      .map((turn, idx) => `## ${idx + 1}. ${en ? 'Prompt' : 'السؤال'}\n${turn.prompt}\n\n### PathPilot\n${turn.answer}`)
      .join('\n\n---\n\n');
    const blob = new Blob([`# ${title}\n\n${body}`], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pathpilot-chat-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
    notify(en ? 'Chat exported as Markdown.' : 'تم تصدير المحادثة بصيغة Markdown.');
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
          ? `Respond strictly in English. Format as a ${options.template} curriculum summary (${options.density} depth).`
          : `اكتب الملخص باللغة العربية الواضحة بأسلوب (${options.template}) ومستوى تفصيل (${options.density}).`,
      ].filter(Boolean).join(' '),
      deepThink: true,
      language: outLang,
    });
    const res = await generateRoutedAssistantResponse({
      mode: 'study',
      tool: 'summarize',
      prompt: envelope,
      preferences: { ...preferences, responseStyle: options.density || 'detailed', uiLanguage: outLang },
      routeOptions: { agentMode: 'auto', deepThink: true },
    });
    return res?.answer || '';
  };

  const toggleAgentGroup = (groupId) => {
    const next = toggleChatAgentGroup(groupId, agentSettings);
    setAgentSettings(next);
    if (groupId === 'search' && next.disabledGroups.includes('search')) setForceSearch(false);
    if (groupId === 'deep' && next.disabledGroups.includes('deep')) setForceDeepThink(false);
  };

  const appendInstantTurn = (promptLabel, instantAnswer, thinkingTrace = null) => {
    if (!activeSession || !instantAnswer) return;
    const turn = {
      ...createConversationTurn({
        prompt: promptLabel,
        answer: instantAnswer,
        source: 'local-synthesis',
        tool: 'summarize',
      }),
      thinkingTrace,
      i18n: {
        [targetLang]: { prompt: promptLabel, answer: instantAnswer },
      },
    };
    const next = appendChatTurn(sessions, activeSession.id, turn);
    setSessions(next);
    setActiveId(activeSession.id);
    setMaterialStudioOpen(false);
    pinnedRef.current = true;
    globalThis.setTimeout(() => scrollToBottom(true), 35);
  };

  const runPrompt = async (overrideText, extraMeta = {}) => {
    const text = String(overrideText ?? prompt ?? '').trim();
    if (text.length < 2 || !activeSession) return;

    const effectiveDeep = Boolean((extraMeta.deepThink ?? forceDeepThink) && !deepDisabled);
    const computedTrace = extraMeta.thinkingTrace || (effectiveDeep
      ? buildDeepThinkingTrace(text, { language: targetLang, intent: 'deep reasoning' })
      : null);

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
    setUnreadBelow(false);
    setLoading(true);
    setLiveActivity({
      steps: [{ id: 'understand', label: en ? 'Understanding message and context' : 'فهم الرسالة والسياق' }],
      activeIndex: 0,
      activeStep: { id: 'understand', label: en ? 'Understanding message and context' : 'فهم الرسالة والسياق' },
    });
    setSources([]);
    setPrompt('');

    setStreamingTurn({
      id: streamId,
      sessionId: activeSession.id,
      prompt: text,
      answer: '',
      source: 'streaming',
      tool: 'ask',
      streaming: true,
      thinkingTrace: computedTrace,
    });

    const contextualPrompt = buildConversationPrompt({
      prompt: text,
      turns: activeSession.turns,
      currentTool: 'ask',
      historyLimit: 30,
    });

    const effectivePrefs = {
      ...preferences,
      uiLanguage: targetLang,
    };

    try {
      const result = await streamRoutedAssistantResponse({
        mode: 'general',
        tool: 'ask',
        prompt: contextualPrompt,
        preferences: effectivePrefs,
        routeOptions: {
          agentMode: 'auto',
          forceResearch: forceSearch && !searchDisabled,
          deepThink: effectiveDeep,
          disabledToolIds: agentSettings.disabledToolIds,
          preferLocalModel: true,
          voiceInput: voiceInputUsed,
        },
        signal: controller.signal,
      }, {
        language: targetLang,
        onActivity: (activity) => {
          if (controller.signal.aborted || runToken !== runTokenRef.current) return;
          setLiveActivity(activity);
        },
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

      const finalAnswer = targetLang === 'en' && detectDominantLanguage(result.answer) === 'ar'
        ? await translateMarkdownAsync(result.answer, 'en', { signal: controller.signal })
        : result.answer;

      const turn = {
        ...createConversationTurn({
          prompt: text,
          answer: finalAnswer,
          source: result.source,
          tool: 'ask',
        }),
        ...(computedTrace ? { thinkingTrace: computedTrace } : {}),
        i18n: {
          [targetLang]: { prompt: text, answer: finalAnswer },
          ...(finalAnswer !== result.answer ? { ar: { prompt: text, answer: result.answer } } : {}),
        },
      };
      const next = appendChatTurn(sessions, activeSession.id, turn);
      setSessions(next);
      setActiveId(activeSession.id);
      setStreamingTurn(null);
      setVoiceInputUsed(false);
      setSources(Array.isArray(result.sources) ? result.sources : []);
    } catch {
      if (controller.signal.aborted || runToken !== runTokenRef.current) return;
      if (!streamedAnswer && extraMeta.localPreview) {
        appendInstantTurn(text, extraMeta.localPreview, computedTrace);
        setStreamingTurn(null);
        return;
      }
      if (!streamedAnswer) {
        setStreamingTurn(null);
      } else {
        const interruptedTurn = {
          ...createConversationTurn({
            prompt: text,
            answer: streamedAnswer,
            source: 'interrupted-stream',
            tool: 'ask',
          }),
          ...(computedTrace ? { thinkingTrace: computedTrace } : {}),
        };
        setSessions((current) => appendChatTurn(current, activeSession.id, interruptedTurn));
        setStreamingTurn(null);
      }
      notify(error?.message || (en ? 'Chat request failed.' : 'تعذر إكمال طلب الشات.'));
    } finally {
      if (runToken === runTokenRef.current) setLoading(false);
    }
  };

  const stopGeneration = () => {
    abortRef.current?.abort();
    runTokenRef.current += 1;
    setLoading(false);
    setLiveActivity(null);
    if (streamingTurn?.answer && streamingTurn?.sessionId) {
      const partialTurn = {
        ...createConversationTurn({
          prompt: streamingTurn.prompt,
          answer: streamingTurn.answer,
          source: 'stopped-stream',
          tool: 'ask',
        }),
        ...(streamingTurn.thinkingTrace ? { thinkingTrace: streamingTurn.thinkingTrace } : {}),
      };
      setSessions((current) => appendChatTurn(current, streamingTurn.sessionId, partialTurn));
    }
    setStreamingTurn(null);
    notify(en ? 'Generation stopped.' : 'تم إيقاف إنشاء الإجابة.');
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
                title={en ? 'Hide sidebar' : 'إخفاء القائمة الجانبية'}
                aria-label={en ? 'Hide sidebar' : 'إخفاء القائمة الجانبية'}
              >
                <PanelLeftClose size={16} />
              </button>
            </div>

            <button
              type="button"
              className="chatgpt-pdf-shortcut"
              onClick={openSessionPdfBuilder}
            >
              <FileDown size={15} /> {en ? 'Curriculum PDF Builder' : 'مصمم ملخص المنهج PDF'}
            </button>

            <button
              type="button"
              className="chatgpt-support-shortcut"
              onClick={() => window.dispatchEvent(new CustomEvent('pathpilot:open-support', { detail: { tab: 'new' } }))}
            >
              <Headphones size={15} /> {en ? 'Support & Open Ticket' : 'الدعم الفني وفتح تيكت'}
            </button>

            <label className="chat-sidebar-search">
              <Search size={14} />
              <input
                type="text"
                value={sessionFilter}
                onChange={(event) => setSessionFilter(event.target.value)}
                placeholder={en ? 'Search saved chats…' : 'ابحث في المحادثات…'}
                aria-label={en ? 'Search saved chats' : 'ابحث في المحادثات'}
              />
            </label>

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

            <p className="chat-memory-note">
              {en ? 'Scroll freely anytime — live streaming never pulls your view.' : 'اطلع وانزل بحرية تامة كأنك في شات احترافي مستقل بدون تكدس.'}
            </p>
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
                  title={en ? 'Show sidebar' : 'إظهار المحادثات'}
                  aria-label={en ? 'Show sidebar' : 'إظهار المحادثات'}
                >
                  <PanelLeftOpen size={16} />
                </button>
              )}
              <strong className="chatgpt-session-title">{activeDisplayTitle}</strong>
              <span className="chat-memory-badge"><WandSparkles size={13} /> {en ? 'Live Sync' : 'ترجمة وسياق حي'}</span>
            </div>

            <div className="chatgpt-topbar-end">
              {visibleTurns.length > 1 && (
                <select
                  className="chatgpt-turn-jumper"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value !== '') jumpToTurnIndex(Number(e.target.value));
                    e.target.value = '';
                  }}
                  aria-label={en ? 'Jump to message' : 'انتقل لرسالة محددة'}
                >
                  <option value="" disabled>{en ? `Jump (${visibleTurns.length})` : `الرسائل (${visibleTurns.length})`}</option>
                  {visibleTurns.map((turn, idx) => (
                    <option key={turn.id} value={idx}>
                      {`${idx + 1}. ${turn.prompt.split('\n')[0].slice(0, 38)}`}
                    </option>
                  ))}
                </select>
              )}

              <label className="chatgpt-mini-search">
                <Search size={13} />
                <input
                  type="text"
                  value={threadSearch}
                  onChange={(event) => setThreadSearch(event.target.value)}
                  placeholder={en ? 'Find in chat…' : 'بحث بالشات…'}
                  aria-label={en ? 'Filter messages inside this chat' : 'ابحث داخل رسائل الشات الحالي'}
                />
              </label>

              <button type="button" className="chat-utility-btn" onClick={scrollToTop} title={en ? 'Scroll to top' : 'اطلع لأول الشات'}>
                <ArrowUp size={14} /> <span>{en ? 'Top' : 'الأعلى'}</span>
              </button>
              <button type="button" className="chat-utility-btn" onClick={() => scrollToBottom(true)} title={en ? 'Scroll to latest' : 'انزل لآخر الشات'}>
                <ArrowDown size={14} /> <span>{en ? 'Bottom' : 'الأسفل'}</span>
              </button>
              <button type="button" className="chat-utility-btn highlight-pdf" onClick={openSessionPdfBuilder} title={en ? 'Build Curriculum PDF' : 'تصدير ملخص PDF للمنهج'}>
                <FileDown size={14} /> <span>PDF</span>
              </button>
              <button type="button" className="chat-utility-btn" onClick={exportActiveChat} title={en ? 'Export Markdown' : 'تنزيل المحادثة'}>
                <Download size={14} />
              </button>
            </div>
          </header>

          <div
            ref={streamViewportRef}
            onScroll={syncScrollPinState}
            onWheel={handleUserWheel}
            onTouchMove={() => { syncScrollPinState(); }}
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
                  <div className="chatgpt-welcome-orb"><Sparkles size={26} /></div>
                  <h2>{en ? 'How can PathPilot help you master your work or curriculum today?' : 'إزاي أقدر أساعدك النهارده في مذاكرتك، تلخيص منهجك، أو شغلك؟'}</h2>
                  <p>{en ? 'Chat freely with smooth independent scrolling, merge chapters into a custom PDF, think deeply, or talk live by voice.' : 'اتكلم بحرية وتصفح الرسائل فوق وتحت بسلاسة زي ChatGPT، ادمج فصول المنهج في PDF قوي، أو استخدم الحوار الصوتي الحي.'}</p>
                  <div className="chat-starter-chips">
                    <button type="button" onClick={() => setPdfBuilderState({ open: true, text: '', title: '' })}>
                      <FileDown size={14} /> {en ? 'Create Custom Curriculum PDF' : 'اعمل ملخص PDF قوي للمنهج'}
                    </button>
                    <button type="button" onClick={() => setMaterialStudioOpen(true)}>
                      <Layers3 size={14} /> {en ? 'Merge & Summarize Lectures' : 'ادمج ولخّص عدة محاضرات'}
                    </button>
                    <button type="button" onClick={() => { setForceDeepThink(true); setPrompt(en ? 'Explain and analyze this topic from first principles: ' : 'اشرح وحلّل هذا الموضوع بعمق من الجذور: '); textareaRef.current?.focus(); }}>
                      <BrainCircuit size={14} /> {en ? 'Deep Critical Thinking' : 'تفكير عميق وتحليل شامل'}
                    </button>
                  </div>
                </div>
              )}

              {loading && (
                <div className="chatgpt-live-indicator">
                  {liveActivity?.steps?.length > 0 && (
                    <div className="chat-activity-flow" aria-label={en ? 'Live response stages' : 'مراحل الرد الحي'}>
                      {liveActivity.steps.map((step, index) => (
                        <span
                          key={step.id}
                          className={index < liveActivity.activeIndex ? 'completed' : index === liveActivity.activeIndex ? 'active' : ''}
                        >
                          {step.label}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="chat-live-status" role="status" aria-live="polite">
                    <LoaderCircle className="spin" size={15} />
                    {streamingTurn?.answer
                      ? (en ? 'PathPilot is streaming live…' : 'PathPilot بيكتب الرد مباشرة…')
                      : (liveActivity?.activeStep?.label || (en ? 'PathPilot is preparing the answer…' : 'PathPilot بيجهز الإجابة…'))}
                  </div>
                </div>
              )}

              {sources.length > 0 && (
                <div className="chat-source-strip" aria-label={en ? 'Latest answer sources' : 'مصادر آخر إجابة'}>
                  <strong><Globe2 size={16} /> {en ? 'Sources' : 'المصادر'}</strong>
                  {sources.slice(0, 6).map((source) => (
                    <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                      {source.title || source.domain || source.url}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          <section className="chat-composer chatgpt-composer-dock">
            {!pinnedToBottom && (visibleTurns.length > 0 || unreadBelow) && (
              <button
                type="button"
                className={unreadBelow ? 'chatgpt-scroll-fab has-unread' : 'chatgpt-scroll-fab'}
                onClick={() => scrollToBottom(true)}
              >
                <ArrowDown size={15} />
                <span>{unreadBelow ? (en ? 'New reply below' : 'رد جديد بالأسفل') : (en ? 'Scroll to latest' : 'انزل لآخر الشات')}</span>
              </button>
            )}

            <div className="chatgpt-composer-inner">
              {materialStudioOpen && (
                <div className="chatgpt-drawer-sheet">
                  <MaterialSynthesisStudio
                    language={targetLang}
                    deepThink={forceDeepThink}
                    onToggleDeepThink={setForceDeepThink}
                    onRunPrompt={(envelope, meta) => runPrompt(envelope, meta)}
                    onGenerateCustomAiSummary={generateCustomAiCurriculumSummary}
                    onInstantAnswer={(instantAnswer, trace) => appendInstantTurn(
                      en ? 'Instant Summary & Synthesis of Attached Materials' : 'تلخيص ودمج فوري للمواد المرفقة',
                      instantAnswer,
                      trace,
                    )}
                    notify={notify}
                  />
                </div>
              )}

              {toolPanelOpen && (
                <div className="chat-tool-panel chatgpt-drawer-sheet">
                  <div>
                    <strong>{en ? 'Automatic by default' : 'تلقائية افتراضيًا'}</strong>
                    <p>{en ? 'PathPilot selects what it needs. Turn off only the optional capability groups you do not want used.' : 'PathPilot بيختار اللي محتاجه لوحده. اقفل فقط مجموعة اختيارية لو مش عايزه يستخدمها.'}</p>
                  </div>
                  <div className="chat-tool-grid">
                    {CHAT_AGENT_OPTION_GROUPS.map((group) => {
                      const disabled = agentSettings.disabledGroups.includes(group.id);
                      return (
                        <button
                          key={group.id}
                          type="button"
                          className={disabled ? 'chat-tool-toggle disabled' : 'chat-tool-toggle'}
                          aria-pressed={!disabled}
                          onClick={() => toggleAgentGroup(group.id)}
                        >
                          <span>{group.label}</span>
                          <small>{disabled ? (en ? 'Off' : 'مقفولة') : (en ? 'Auto' : 'تلقائي')}</small>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="chatgpt-input-box">
                <textarea
                  ref={textareaRef}
                  id="assistant-prompt"
                  value={prompt}
                  onChange={(event) => { setPrompt(event.target.value); setVoiceInputUsed(false); }}
                  placeholder={en ? 'Message PathPilot, paste curriculum chapters, or speak live…' : 'اسأل PathPilot، الصق فصول المنهج للتلخيص والدمج، أو اتكلم بالصوت…'}
                  maxLength={12000}
                  rows={2}
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
                  <button className="chatgpt-send-btn" type="button" disabled={prompt.trim().length < 2} onClick={() => runPrompt()} title={en ? 'Send' : 'إرسال'} aria-label={en ? 'Send' : 'إرسال'}>
                    <Send size={17} />
                  </button>
                )}
              </div>

              <div className="chatgpt-controls-bar" aria-label={en ? 'Chat controls' : 'تحكم الشات'}>
                <div className="chat-mode-row">
                  <button
                    type="button"
                    className={materialStudioOpen ? 'chat-mode active' : 'chat-mode'}
                    aria-expanded={materialStudioOpen}
                    onClick={() => setMaterialStudioOpen((value) => !value)}
                  >
                    <Layers3 size={15} /> {en ? 'Merge & Summarize' : 'دمج وتلخيص المواد'}
                  </button>
                  <button
                    type="button"
                    className="chat-mode pdf-chip"
                    onClick={openSessionPdfBuilder}
                  >
                    <FileDown size={15} /> {en ? 'Curriculum PDF' : 'ملخص PDF للمنهج'}
                  </button>
                  <button
                    type="button"
                    className={forceDeepThink ? 'chat-mode active' : 'chat-mode'}
                    aria-pressed={forceDeepThink}
                    disabled={deepDisabled}
                    onClick={() => setForceDeepThink((value) => !value)}
                  >
                    <BrainCircuit size={15} /> {en ? 'Deep Think' : 'التفكير العميق'}
                  </button>
                  <button
                    type="button"
                    className={forceSearch ? 'chat-mode active' : 'chat-mode'}
                    aria-pressed={forceSearch}
                    disabled={searchDisabled}
                    onClick={() => setForceSearch((value) => !value)}
                  >
                    <Search size={15} /> {en ? 'Web Search' : 'بحث ويب'}
                  </button>
                  <button
                    type="button"
                    className={toolPanelOpen ? 'chat-mode active' : 'chat-mode'}
                    aria-expanded={toolPanelOpen}
                    onClick={() => setToolPanelOpen((value) => !value)}
                  >
                    <Settings2 size={15} /> {en ? 'Tools' : 'الأدوات'} <ChevronDown size={13} />
                  </button>
                </div>

                <VoiceControls
                  value={prompt}
                  onChange={(value) => { setPrompt(value); setVoiceInputUsed(true); }}
                  answer={lastAnswer}
                  notify={notify}
                  compact
                  onAutoSubmit={(spokenText) => {
                    setVoiceInputUsed(true);
                    runPrompt(spokenText);
                  }}
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