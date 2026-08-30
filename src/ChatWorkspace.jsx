import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BrainCircuit,
  ChevronDown,
  Globe2,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  Plus,
  Search,
  Send,
  Settings2,
  Square,
  Trash2,
  WandSparkles,
} from 'lucide-react';
import ConversationThread from './components/ConversationThread.jsx';
import VoiceControls from './components/VoiceControls.jsx';
import { streamRoutedAssistantResponse } from './lib/assistant-router.js';
import { CHAT_AGENT_OPTION_GROUPS } from './lib/chat-agent-orchestrator.js';
import { loadChatAgentSettings, toggleChatAgentGroup } from './lib/chat-agent-settings.js';
import {
  appendChatTurn,
  createChatSession,
  deleteChatSession,
  loadChatSessions,
  upsertChatSession,
} from './lib/chat-memory.js';
import { buildConversationPrompt, createConversationTurn } from './lib/conversation-context.js';

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
  const [prompt, setPrompt] = useState('');
  const [forceSearch, setForceSearch] = useState(false);
  const [forceDeepThink, setForceDeepThink] = useState(false);
  const [toolPanelOpen, setToolPanelOpen] = useState(false);
  const [agentSettings, setAgentSettings] = useState(loadChatAgentSettings);
  const [voiceInputUsed, setVoiceInputUsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState([]);
  const [streamingTurn, setStreamingTurn] = useState(null);
  const [liveActivity, setLiveActivity] = useState(null);
  const abortRef = useRef(null);
  const runTokenRef = useRef(0);
  const threadEndRef = useRef(null);
  const en = language === 'en';

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeId) || sessions[0] || null,
    [activeId, sessions],
  );
  const visibleTurns = useMemo(() => {
    const turns = activeSession?.turns || [];
    if (streamingTurn?.sessionId !== activeSession?.id) return turns;
    return [...turns, streamingTurn];
  }, [activeSession, streamingTurn]);
  const lastAnswer = streamingTurn?.sessionId === activeSession?.id && streamingTurn.answer
    ? streamingTurn.answer
    : activeSession?.turns?.at(-1)?.answer || '';
  const searchDisabled = agentSettings.disabledGroups.includes('search');
  const deepDisabled = agentSettings.disabledGroups.includes('deep');

  useEffect(() => {
    if (!loading && !streamingTurn?.answer) return;
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [loading, streamingTurn?.answer, visibleTurns.length]);

  const clearTransientResponse = () => {
    setStreamingTurn(null);
    setSources([]);
    setLoading(false);
    setLiveActivity(null);
  };

  const selectSession = (sessionId) => {
    abortRef.current?.abort();
    runTokenRef.current += 1;
    setActiveId(sessionId);
    setPrompt('');
    clearTransientResponse();
  };

  const createNewChat = () => {
    abortRef.current?.abort();
    runTokenRef.current += 1;
    const session = createChatSession();
    const next = upsertChatSession(sessions, session);
    setSessions(next);
    setActiveId(session.id);
    setPrompt('');
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
    const replacement = createChatSession();
    const restored = upsertChatSession([], replacement);
    setSessions(restored);
    setActiveId(replacement.id);
  };

  const toggleAgentGroup = (groupId) => {
    const next = toggleChatAgentGroup(groupId, agentSettings);
    setAgentSettings(next);
    if (groupId === 'search' && next.disabledGroups.includes('search')) setForceSearch(false);
    if (groupId === 'deep' && next.disabledGroups.includes('deep')) setForceDeepThink(false);
  };

  const runPrompt = async () => {
    const text = String(prompt || '').trim();
    if (text.length < 2 || !activeSession) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const runToken = runTokenRef.current + 1;
    const streamId = `stream-${runToken}-${Date.now()}`;
    let streamedAnswer = '';
    runTokenRef.current = runToken;
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
    });

    const contextualPrompt = buildConversationPrompt({
      prompt: text,
      turns: activeSession.turns,
      currentTool: 'ask',
      historyLimit: 30,
    });

    try {
      const result = await streamRoutedAssistantResponse({
        mode: 'general',
        tool: 'ask',
        prompt: contextualPrompt,
        preferences,
        routeOptions: {
          agentMode: 'auto',
          forceResearch: forceSearch && !searchDisabled,
          deepThink: forceDeepThink && !deepDisabled,
          disabledToolIds: agentSettings.disabledToolIds,
          preferLocalModel: true,
          voiceInput: voiceInputUsed,
        },
        signal: controller.signal,
      }, {
        language: en ? 'en' : 'ar',
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

      const turn = createConversationTurn({
        prompt: text,
        answer: result.answer,
        source: result.source,
        tool: 'ask',
      });
      const next = appendChatTurn(sessions, activeSession.id, turn);
      setSessions(next);
      setActiveId(activeSession.id);
      setStreamingTurn(null);
      setVoiceInputUsed(false);
      setSources(Array.isArray(result.sources) ? result.sources : []);
    } catch (error) {
      if (controller.signal.aborted || runToken !== runTokenRef.current) return;
      if (!streamedAnswer) {
        setStreamingTurn(null);
      } else {
        const interruptedTurn = createConversationTurn({
          prompt: text,
          answer: streamedAnswer,
          source: 'interrupted-stream',
          tool: 'ask',
        });
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
      const partialTurn = createConversationTurn({
        prompt: streamingTurn.prompt,
        answer: streamingTurn.answer,
        source: 'stopped-stream',
        tool: 'ask',
      });
      setSessions((current) => appendChatTurn(current, streamingTurn.sessionId, partialTurn));
    }
    setStreamingTurn(null);
    notify(en ? 'Generation stopped.' : 'تم إيقاف إنشاء الإجابة.');
  };

  return (
    <main className="chat-page">
      <div className="page-shell chat-shell">
        <aside className="chat-sidebar" aria-label={en ? 'Saved chats' : 'المحادثات المحفوظة'}>
          <button className="chat-new-button" type="button" onClick={createNewChat}>
            <Plus size={17} /> {en ? 'New chat' : 'محادثة جديدة'}
          </button>
          <div className="chat-session-list">
            {sessions.map((session) => (
              <div className={session.id === activeSession?.id ? 'chat-session active' : 'chat-session'} key={session.id}>
                <button type="button" onClick={() => selectSession(session.id)}>
                  <MessageSquareText size={16} />
                  <span>{session.title}</span>
                </button>
                <button type="button" className="chat-delete" onClick={() => removeChat(session.id)} aria-label={en ? 'Delete chat' : 'حذف المحادثة'}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <p className="chat-memory-note">
            {en ? 'Chat memory is saved on this device and relevant older turns can be recalled automatically.' : 'ذاكرة الشات محفوظة على الجهاز، وPathPilot يقدر يرجع للكلام القديم المرتبط تلقائيًا.'}
          </p>
        </aside>

        <section className="chat-main">
          <header className="chat-heading">
            <div>
              <span>PATHPILOT CHAT</span>
              <h1>{en ? 'A live chat that remembers.' : 'شات حي بيفهمك وبيفتكر.'}</h1>
              <p>{en ? 'Talk naturally. PathPilot keeps the useful context, responds live, and brings in search or deeper analysis only when the request needs it.' : 'اتكلم طبيعي. PathPilot بيربط الكلام بالسياق، بيرد بشكل حي، ويدخل البحث أو التحليل الأعمق بس لما السؤال يحتاجهم.'}</p>
            </div>
            <div className="chat-memory-badge"><WandSparkles size={17} /> {en ? 'Live context on' : 'السياق الحي مفعّل'}</div>
          </header>

          <div className="chat-thread-panel">
            {visibleTurns.length ? (
              <ConversationThread
                turns={visibleTurns}
                maxTurns={20}
                onReuse={(value) => setPrompt(value)}
              />
            ) : (
              <div className="chat-empty-state">
                <MessageSquareText size={32} />
                <strong>{en ? 'Just talk to PathPilot' : 'اتكلم مع PathPilot عادي'}</strong>
                <span>{en ? 'It will keep relevant context and choose the right help automatically.' : 'هيحافظ على السياق المفيد ويختار طريقة المساعدة المناسبة تلقائيًا.'}</span>
              </div>
            )}

            {loading && (
              <>
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
                    ? (en ? 'PathPilot is responding live…' : 'PathPilot بيرد قدامك مباشرة…')
                    : (liveActivity?.activeStep?.label || (en ? 'PathPilot is preparing the answer…' : 'PathPilot بيجهز الإجابة…'))}
                </div>
              </>
            )}

            <div ref={threadEndRef} aria-hidden="true" />

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

          <section className="chat-composer">
            <div className="chat-mode-row" aria-label={en ? 'Chat controls' : 'تحكم الشات'}>
              <button
                type="button"
                className={forceSearch ? 'chat-mode active' : 'chat-mode'}
                aria-pressed={forceSearch}
                disabled={searchDisabled}
                onClick={() => setForceSearch((value) => !value)}
              >
                <Search size={16} /> {en ? 'Force Search' : 'اجبر البحث'}
              </button>
              <button
                type="button"
                className={forceDeepThink ? 'chat-mode active' : 'chat-mode'}
                aria-pressed={forceDeepThink}
                disabled={deepDisabled}
                onClick={() => setForceDeepThink((value) => !value)}
              >
                <BrainCircuit size={16} /> {en ? 'Force Deep Think' : 'اجبر التفكير المعمق'}
              </button>
              <button
                type="button"
                className="chat-mode"
                aria-expanded={toolPanelOpen}
                onClick={() => setToolPanelOpen((value) => !value)}
              >
                <Settings2 size={16} /> {en ? 'Auto tools' : 'الأدوات التلقائية'} <ChevronDown size={14} />
              </button>
            </div>

            {toolPanelOpen && (
              <div className="chat-tool-panel">
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
                <small className="chat-tool-safety-note">{en ? 'Context, safety, model routing, confidence checks and the final quality gate cannot be disabled.' : 'السياق والأمان وتوجيه الموديل وفحص الثقة وبوابة الجودة النهائية لا يمكن تعطيلهم.'}</small>
              </div>
            )}

            <textarea
              value={prompt}
              onChange={(event) => { setPrompt(event.target.value); setVoiceInputUsed(false); }}
              placeholder={en ? 'Message PathPilot…' : 'اكتب رسالتك لـ PathPilot…'}
              maxLength={12000}
              rows={5}
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

            <VoiceControls
              value={prompt}
              onChange={(value) => { setPrompt(value); setVoiceInputUsed(true); }}
              answer={lastAnswer}
              notify={notify}
            />

            <div className="chat-composer-footer">
              <span>{prompt.length.toLocaleString(en ? 'en-US' : 'ar-EG')} / 12,000</span>
              {loading ? (
                <button className="button button-secondary" type="button" onClick={stopGeneration}>
                  <Square size={16} /> {en ? 'Stop' : 'إيقاف'}
                </button>
              ) : (
                <button className="button button-primary" type="button" disabled={prompt.trim().length < 2} onClick={runPrompt}>
                  <Send size={17} /> {en ? 'Send' : 'إرسال'}
                </button>
              )}
              {loading && <span className="chat-loading"><LoaderCircle className="spin" size={16} /> {en ? 'Live response in progress…' : 'الرد الحي شغال…'}</span>}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}