import { useMemo, useRef, useState } from 'react';
import {
  BrainCircuit,
  Globe2,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  Plus,
  Search,
  Send,
  Square,
  Trash2,
} from 'lucide-react';
import ConversationThread from './components/ConversationThread.jsx';
import { generateRoutedAssistantResponse } from './lib/assistant-router.js';
import {
  appendChatTurn,
  createChatSession,
  deleteChatSession,
  loadChatSessions,
  upsertChatSession,
} from './lib/chat-memory.js';
import { buildConversationPrompt, createConversationTurn } from './lib/conversation-context.js';

function isEnglish() {
  return document.body?.dataset?.language === 'en';
}

function initialChatState() {
  const stored = loadChatSessions();
  if (stored.length) return stored;
  const first = createChatSession();
  return upsertChatSession([], first);
}

export function ChatDevelopmentNotice() {
  const en = isEnglish();
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

export default function ChatWorkspace({ preferences, notify }) {
  const [sessions, setSessions] = useState(initialChatState);
  const [activeId, setActiveId] = useState(() => initialChatState()[0]?.id || '');
  const [prompt, setPrompt] = useState('');
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [deepThinkEnabled, setDeepThinkEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState([]);
  const abortRef = useRef(null);
  const runTokenRef = useRef(0);
  const en = isEnglish();

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeId) || sessions[0] || null,
    [activeId, sessions],
  );

  const selectSession = (sessionId) => {
    abortRef.current?.abort();
    runTokenRef.current += 1;
    setActiveId(sessionId);
    setPrompt('');
    setSources([]);
    setLoading(false);
  };

  const createNewChat = () => {
    const session = createChatSession();
    const next = upsertChatSession(sessions, session);
    setSessions(next);
    setActiveId(session.id);
    setPrompt('');
    setSources([]);
    setLoading(false);
  };

  const removeChat = (sessionId) => {
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

  const runPrompt = async () => {
    const text = String(prompt || '').trim();
    if (text.length < 2 || !activeSession) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const runToken = runTokenRef.current + 1;
    runTokenRef.current = runToken;
    setLoading(true);
    setSources([]);

    const contextualPrompt = buildConversationPrompt({
      prompt: text,
      turns: activeSession.turns,
      currentTool: 'ask',
      historyLimit: 30,
    });

    try {
      const result = await generateRoutedAssistantResponse({
        mode: 'general',
        tool: 'ask',
        prompt: contextualPrompt,
        preferences,
        routeOptions: {
          forceResearch: searchEnabled,
          deepThink: deepThinkEnabled,
        },
        signal: controller.signal,
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
      setPrompt('');
      setSources(Array.isArray(result.sources) ? result.sources : []);
    } catch (error) {
      if (controller.signal.aborted || runToken !== runTokenRef.current) return;
      notify(error?.message || (en ? 'Chat request failed.' : 'تعذر إكمال طلب الشات.'));
    } finally {
      if (runToken === runTokenRef.current) setLoading(false);
    }
  };

  const stopGeneration = () => {
    abortRef.current?.abort();
    runTokenRef.current += 1;
    setLoading(false);
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
            {en ? 'Chat memory is saved on this device.' : 'ذاكرة الشات محفوظة على هذا الجهاز.'}
          </p>
        </aside>

        <section className="chat-main">
          <header className="chat-heading">
            <div>
              <span>PATHPILOT CHAT</span>
              <h1>{en ? 'Chat with context that remembers.' : 'شات فاهم السياق وبيفتكر.'}</h1>
              <p>{en ? 'Keep a conversation going, search the web when needed, or switch on deeper analysis.' : 'كمّل نفس المحادثة، فعّل البحث وقت ما تحتاج، أو شغّل التحليل المعمق للأسئلة الصعبة.'}</p>
            </div>
            <div className="chat-memory-badge"><BrainCircuit size={17} /> {en ? 'Context memory on' : 'ذاكرة السياق مفعّلة'}</div>
          </header>

          <div className="chat-thread-panel">
            {activeSession?.turns.length ? (
              <ConversationThread
                turns={activeSession.turns}
                maxTurns={20}
                onReuse={(value) => setPrompt(value)}
              />
            ) : (
              <div className="chat-empty-state">
                <MessageSquareText size={32} />
                <strong>{en ? 'Start a new conversation' : 'ابدأ محادثة جديدة'}</strong>
                <span>{en ? 'PathPilot will keep the useful context as the chat develops.' : 'PathPilot هيحتفظ بالسياق المفيد مع تطور المحادثة.'}</span>
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

          <section className="chat-composer">
            <div className="chat-mode-row" aria-label={en ? 'Chat modes' : 'أوضاع الشات'}>
              <button
                type="button"
                className={searchEnabled ? 'chat-mode active' : 'chat-mode'}
                aria-pressed={searchEnabled}
                onClick={() => setSearchEnabled((value) => !value)}
              >
                <Search size={16} /> {en ? 'Search' : 'بحث'}
              </button>
              <button
                type="button"
                className={deepThinkEnabled ? 'chat-mode active' : 'chat-mode'}
                aria-pressed={deepThinkEnabled}
                onClick={() => setDeepThinkEnabled((value) => !value)}
              >
                <BrainCircuit size={16} /> {en ? 'Deep Think' : 'تفكير معمق'}
              </button>
            </div>

            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={en ? 'Message PathPilot…' : 'اكتب رسالتك لـ PathPilot…'}
              maxLength={12000}
              rows={5}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !loading) {
                  event.preventDefault();
                  runPrompt();
                }
                if (event.key === 'Escape' && loading) {
                  event.preventDefault();
                  stopGeneration();
                }
              }}
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
              {loading && <span className="chat-loading"><LoaderCircle className="spin" size={16} /> {deepThinkEnabled ? (en ? 'Analyzing deeply…' : 'بيحلل بعمق…') : (en ? 'Thinking…' : 'بيفكر…')}</span>}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
