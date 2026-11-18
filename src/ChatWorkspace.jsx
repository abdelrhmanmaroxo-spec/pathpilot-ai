import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  CheckCircle2,
  Eye,
  FileDown,
  FileText,
  Folder,
  FolderPlus,
  ImagePlus,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Plus,
  Search,
  Send,
  Sparkles,
  Square,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import ConversationThread from './components/ConversationThread.jsx';
import CurriculumPdfModal from './components/CurriculumPdfModal.jsx';
import MaterialSynthesisStudio from './components/MaterialSynthesisStudio.jsx';
import VoiceControls from './components/VoiceControls.jsx';
import { inspectAndParseAttachmentFiles, streamSmartAiReply } from './lib/assistant.js';
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
const TURN_ATTACHMENTS_STORAGE_KEY = 'pathpilot.chat_turn_attachments.v6';

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

function loadTurnAttachmentsMap() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem?.(TURN_ATTACHMENTS_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function persistTurnAttachmentsMap(nextMap) {
  try {
    const keys = Object.keys(nextMap || {}).slice(-80);
    const trimmed = {};
    for (const k of keys) trimmed[k] = nextMap[k];
    globalThis.localStorage?.setItem?.(TURN_ATTACHMENTS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage quota errors
  }
  return nextMap;
}

function toCompactAttachmentSummary(att) {
  return {
    id: att.id,
    name: att.name,
    kind: att.kind,
    sizeKb: att.sizeKb,
    pageCount: att.pageCount || 1,
    wordCount: att.wordCount || 0,
    thumbUrl: att.thumbUrl || '',
    excerpt: String(att.excerpt || att.textContent || '').slice(0, 1200),
    statusAr: att.statusAr || '',
    statusEn: att.statusEn || '',
  };
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
  const [turnAttachmentsMap, setTurnAttachmentsMap] = useState(loadTurnAttachmentsMap);
  const [selectedFolder, setSelectedFolder] = useState('__all__');
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth > 1120 : false));
  const [sessionFilter, setSessionFilter] = useState('');
  const [prompt, setPrompt] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [inspectingFiles, setInspectingFiles] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [materialStudioOpen, setMaterialStudioOpen] = useState(false);
  const [pdfBuilderState, setPdfBuilderState] = useState({ open: false, text: '', title: '' });
  const [loading, setLoading] = useState(false);
  const [streamingTurn, setStreamingTurn] = useState(null);
  const [pinnedToBottom, setPinnedToBottom] = useState(true);

  const abortRef = useRef(null);
  const runTokenRef = useRef(0);
  const streamViewportRef = useRef(null);
  const textareaRef = useRef(null);
  const filePickerRef = useRef(null);
  const dragCounterRef = useRef(0);
  const pinnedRef = useRef(true);
  const en = language === 'en';
  const targetLang = en ? 'en' : 'ar';

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeId) || sessions[0] || null,
    [activeId, sessions],
  );

  const folderAssignments = folderState.assignments;
  const activeSessionId = activeSession?.id || '';
  const activeSessionTurns = activeSession?.turns;
  const activeSessionFolder = activeSessionId ? (folderAssignments[activeSessionId] || '') : '';

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

  const ingestFiles = async (fileList) => {
    if (!fileList || !fileList.length) return;
    setInspectingFiles(true);
    try {
      const added = await inspectAndParseAttachmentFiles(fileList);
      if (!added.length) {
        notify(en ? 'Unsupported file or exceeds 20 MB.' : 'الملف غير مدعوم أو حجمه أكبر من 20 ميجابايت.');
        return;
      }
      setAttachments((prev) => [...prev, ...added].slice(0, 8));
      textareaRef.current?.focus();
    } catch {
      notify(en ? 'Could not inspect the attached file.' : 'تعذر فتح وفحص الملف المرفق.');
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
      await ingestFiles(event.dataTransfer.files);
    }
  };

  const handlePasteClipboard = async (event) => {
    const items = Array.from(event.clipboardData?.items || []);
    const fileItems = items.filter((item) => item.kind === 'file').map((item) => item.getAsFile()).filter(Boolean);
    if (fileItems.length) {
      event.preventDefault();
      await ingestFiles(fileItems);
    }
  };

  useEffect(() => {
    if (!activeSessionId || !activeSessionTurns?.length) return undefined;
    const controller = new AbortController();
    let cancelled = false;

    const translatePendingTurns = async () => {
      for (const turn of activeSessionTurns) {
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
          setSessions((current) => updateChatTurnTranslation(current, activeSessionId, turn.id, targetLang, {
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
  }, [activeSessionId, activeSessionTurns, targetLang]);

  const filteredSessions = useMemo(() => {
    const q = sessionFilter.trim().toLowerCase();
    return sessions
      .map((session) => ({
        ...session,
        folder: folderAssignments[session.id] || '',
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
  }, [folderAssignments, selectedFolder, sessionFilter, sessions, targetLang]);

  const visibleTurns = useMemo(() => {
    const rawTurns = activeSession?.turns || [];
    const combined = streamingTurn?.sessionId === activeSession?.id ? [...rawTurns, streamingTurn] : rawTurns;
    return combined.map((turn) => ({
      ...resolveTurnForLanguage(turn, targetLang),
      rawPrompt: turn.prompt,
      attachments: turn.attachments || turnAttachmentsMap[turn.id] || [],
    }));
  }, [activeSession, streamingTurn, targetLang, turnAttachmentsMap]);

  const lastAnswer = visibleTurns.at(-1)?.answer || '';
  const streamingAnswer = streamingTurn?.answer || '';

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
    if (!loading && !streamingAnswer) return;
    if (pinnedRef.current) {
      const vp = streamViewportRef.current;
      if (vp) vp.scrollTop = vp.scrollHeight;
    }
  }, [loading, streamingAnswer, visibleTurns.length]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(168, Math.max(44, el.scrollHeight))}px`;
  }, [prompt]);

  const selectSession = (sessionId) => {
    abortRef.current?.abort();
    runTokenRef.current += 1;
    setActiveId(sessionId);
    setPrompt('');
    setAttachments([]);
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
    setAttachments([]);
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
    createOrAssignFolder(targetName, activeSessionId);
    setSelectedFolder(targetName);
    setNewFolderName('');
    setNewFolderOpen(false);
    notify(en ? `Folder "${targetName}" created.` : `تم إنشاء مجلد «${targetName}» وتنظيم المحادثة بداخله.`);
  };

  const runPrompt = async (overrideText, extraMeta = {}) => {
    const currentAttachments = overrideText ? [] : attachments;
    const rawText = String(overrideText ?? prompt ?? '').trim();
    if ((!rawText && !currentAttachments.length) || !activeSession) return;

    const compactSummaries = currentAttachments.map(toCompactAttachmentSummary);
    const displayPrompt = rawText || (
      en
        ? `Inspect and explain attached file(s): ${currentAttachments.map((a) => a.name).join(', ')}`
        : `افحص الملفات المرفقة واشرح محتواها بالتفصيل (${currentAttachments.map((a) => a.name).join(', ')})`
    );

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
    setAttachments([]);

    setStreamingTurn({
      id: streamId,
      sessionId: activeSession.id,
      prompt: displayPrompt,
      answer: '',
      source: 'streaming',
      tool: 'ask',
      streaming: true,
      attachments: compactSummaries,
    });

    try {
      const result = await streamSmartAiReply({
        prompt: rawText,
        turns: activeSession.turns || [],
        attachments: currentAttachments,
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

      const createdTurn = createConversationTurn({
        prompt: displayPrompt,
        answer: result.answer,
        source: result.source,
        tool: 'ask',
      });

      if (compactSummaries.length) {
        setTurnAttachmentsMap((prev) => persistTurnAttachmentsMap({
          ...prev,
          [createdTurn.id]: compactSummaries,
        }));
      }

      const turn = {
        ...createdTurn,
        ...(result.thinkingTrace ? { thinkingTrace: result.thinkingTrace } : {}),
        i18n: {
          [targetLang]: { prompt: displayPrompt, answer: result.answer },
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
          prompt: displayPrompt,
          answer: streamedAnswer,
          source: 'interrupted-stream',
          tool: 'ask',
        });
        if (compactSummaries.length) {
          setTurnAttachmentsMap((prev) => persistTurnAttachmentsMap({
            ...prev,
            [partial.id]: compactSummaries,
          }));
        }
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
      if (streamingTurn.attachments?.length) {
        setTurnAttachmentsMap((prev) => persistTurnAttachmentsMap({
          ...prev,
          [partialTurn.id]: streamingTurn.attachments,
        }));
      }
      setSessions((current) => appendChatTurn(current, streamingTurn.sessionId, partialTurn));
    }
    setStreamingTurn(null);
  };

  const activeDisplayTitle = translateMarkdownSync(activeSession?.title || (en ? 'New chat' : 'محادثة جديدة'), targetLang);
  const canSend = !inspectingFiles && (prompt.trim().length >= 1 || attachments.length > 0);

  return (
    <main
      className="chat-page chatgpt-app-shell"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{ position: 'relative' }}
    >
      <input
        ref={filePickerRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.pdf,.docx,.txt,.md,.csv,.json,.js,.jsx,.ts,.tsx,.py,.html,.css,.sql,.xml,.yml,.yaml,audio/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          ingestFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {isDraggingOver && (
        <div
          style={{
            position: 'fixed',
            inset: 16,
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
            <UploadCloud size={48} color="#818cf8" />
            <h2 style={{ margin: 0 }}>
              {en ? 'Drop PDFs, Word docs, images, or files here' : 'أفلت ملفات الـ PDF أو Word أو الصور هنا مباشرة'}
            </h2>
            <p style={{ margin: 0, opacity: 0.85 }}>
              {en ? 'PathPilot AI will open, inspect every page, and read them right now' : 'سيقوم PathPilot AI بفتح الملف وفحص صفحاته وقراءة كل ما بداخله فورًا'}
            </p>
          </div>
        </div>
      )}

      <div className={sidebarOpen ? 'chatgpt-layout has-sidebar' : 'chatgpt-layout sidebar-collapsed'}>
        {sidebarOpen && (
          <aside className="chat-sidebar chatgpt-sidebar" aria-label={en ? 'Saved chats' : 'المحادثات المحفوظة'}>
            <div className="chatgpt-sidebar-top" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <button className="chat-new-button" type="button" onClick={createNewChat} style={{ flex: 1, minWidth: 0 }}>
                <Plus size={16} /> {en ? 'New chat' : 'محادثة جديدة'}
              </button>
              <button
                type="button"
                className="chat-utility-btn icon-only"
                onClick={() => setNewFolderOpen((v) => !v)}
                title={en ? 'New folder' : 'إنشاء مجلد جديد'}
                aria-label={en ? 'New folder' : 'إنشاء مجلد جديد'}
                style={{ flexShrink: 0 }}
              >
                <FolderPlus size={16} />
              </button>
              <button
                type="button"
                className="chat-utility-btn icon-only"
                onClick={() => setSidebarOpen(false)}
                title={en ? 'Hide sidebar' : 'إخفاء القائمة'}
                aria-label={en ? 'Hide sidebar' : 'إخفاء القائمة'}
                style={{ flexShrink: 0 }}
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
                  onInspectAttachment={(att) => setPreviewAttachment(att)}
                  onExportTurnPdf={(turn) => setPdfBuilderState({
                    open: true,
                    text: turn.answer,
                    title: turn.prompt.split('\n')[0].slice(0, 60),
                  })}
                />
              ) : (
                <div className="chat-empty-state chatgpt-welcome">
                  <div className="chatgpt-welcome-orb"><Sparkles size={24} /></div>
                  <h2>{en ? 'Ask anything, or drop PDFs, Word docs & images right here' : 'اسأل في أي حاجة، أو اسحب ملفات PDF وWord وصور هنا مباشرة'}</h2>
                  <div className="chat-starter-chips">
                    <button type="button" onClick={() => filePickerRef.current?.click()}>
                      <ImagePlus size={14} /> {en ? 'Upload PDF, Word, or Image' : 'ارفع ملف PDF أو Word أو صورة امتحان'}
                    </button>
                    <button type="button" onClick={() => { setPrompt(en ? 'Create a folder for this subject and summarize: ' : 'اعمل مجلد لهذه المادة ولخّصلي الفصل ده باحترافية: '); textareaRef.current?.focus(); }}>
                      <FolderPlus size={14} /> {en ? 'Organize in Folder & Summarize' : 'أنشئ مجلد للمادة ولخّص'}
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
                    <span>{en ? 'Inspecting & preparing response…' : 'جاري قراءة المحتوى وإعداد الإجابة…'}</span>
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

              {inspectingFiles && (
                <div className="chat-live-status" style={{ marginBottom: 6 }}>
                  <LoaderCircle className="spin" size={14} />
                  <span>
                    {en ? 'Opening and reading pages inside your attached file…' : 'جاري الدخول للملف المرفق وفحص وقراءة صفحاته بالكامل…'}
                  </span>
                </div>
              )}

              {attachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 9,
                        padding: '7px 11px',
                        borderRadius: 12,
                        background: 'rgba(30, 41, 59, 0.92)',
                        border: '1px solid rgba(52, 211, 153, 0.42)',
                        fontSize: '0.82rem',
                        maxWidth: '100%',
                      }}
                    >
                      {att.previewUrl ? (
                        <img
                          src={att.previewUrl}
                          alt={att.name}
                          style={{ width: 38, height: 38, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: 'rgba(16, 185, 129, 0.16)',
                            color: '#6ee7b7',
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <FileText size={18} />
                        </div>
                      )}
                      <div style={{ minWidth: 0, display: 'grid', gap: 2 }}>
                        <strong style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#f1f5f9' }}>
                          {att.name}
                        </strong>
                        <small style={{ color: '#6ee7b7', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.74rem' }}>
                          <CheckCircle2 size={12} />
                          <span>{en ? (att.statusEn || `${att.sizeKb}KB`) : (att.statusAr || `${att.sizeKb}KB`)}</span>
                        </small>
                      </div>
                      {(att.textContent || att.previewUrl) && (
                        <button
                          type="button"
                          className="turn-inline-action"
                          onClick={() => setPreviewAttachment(att)}
                          title={en ? 'Inspect extracted content' : 'معاينة ما تم قراءته من داخل الملف'}
                        >
                          <Eye size={13} />
                          <span>{en ? 'Inspect' : 'فحص'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== att.id))}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
                        aria-label={en ? 'Remove attachment' : 'إزالة المرفق'}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div
                className="chatgpt-input-box"
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 10,
                  width: '100%',
                }}
              >
                <button
                  type="button"
                  className="chat-utility-btn icon-only"
                  onClick={() => filePickerRef.current?.click()}
                  title={en ? 'Attach PDFs, Word docs, images, or files' : 'إرفاق ملف PDF أو Word أو صور أو مستندات'}
                  aria-label={en ? 'Attach files' : 'إرفاق ملفات'}
                  style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 12 }}
                >
                  <Paperclip size={17} />
                </button>
                <textarea
                  ref={textareaRef}
                  id="assistant-prompt"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  onPaste={handlePasteClipboard}
                  placeholder={en ? 'Ask anything, or drop / paste PDFs & images…' : 'اكتب سؤالك هنا، أو اسحب والصق الصور وملفات الـ PDF…'}
                  maxLength={12000}
                  rows={1}
                  style={{
                    flex: '1 1 auto',
                    minWidth: 0,
                    width: '100%',
                  }}
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
                  <button
                    className="chatgpt-send-btn stop"
                    type="button"
                    onClick={stopGeneration}
                    title={en ? 'Stop' : 'إيقاف'}
                    aria-label={en ? 'Stop' : 'إيقاف'}
                    style={{ flexShrink: 0 }}
                  >
                    <Square size={16} />
                  </button>
                ) : (
                  <button
                    className="chatgpt-send-btn"
                    type="button"
                    disabled={!canSend}
                    onClick={() => runPrompt()}
                    title={en ? 'Send' : 'إرسال'}
                    aria-label={en ? 'Send' : 'إرسال'}
                    style={{ flexShrink: 0 }}
                  >
                    <Send size={17} />
                  </button>
                )}
              </div>

              <div className="chatgpt-controls-bar">
                <div className="chat-mode-row">
                  <button type="button" className="chat-mode" onClick={() => filePickerRef.current?.click()}>
                    <ImagePlus size={14} /> {en ? 'Attach PDF / Images' : 'ارفع PDF أو صور'}
                  </button>
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
                    {(en ? previewAttachment.statusEn : previewAttachment.statusAr) || (en ? 'Inspected file' : 'تم فحص الملف')}
                  </small>
                </div>
              </div>
              <button type="button" className="pdf-modal-close" onClick={() => setPreviewAttachment(null)}>
                <X size={18} />
              </button>
            </header>
            <div className="pdf-modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {(previewAttachment.previewUrl || previewAttachment.thumbUrl) && (
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <img
                    src={previewAttachment.previewUrl || previewAttachment.thumbUrl}
                    alt={previewAttachment.name}
                    style={{ maxWidth: '100%', maxHeight: 380, borderRadius: 12 }}
                  />
                </div>
              )}
              {(previewAttachment.textContent || previewAttachment.excerpt) ? (
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
                  {String(previewAttachment.textContent || previewAttachment.excerpt).slice(0, 8000)}
                </pre>
              ) : !previewAttachment.previewUrl && !previewAttachment.thumbUrl ? (
                <p style={{ margin: 0, opacity: 0.85 }}>
                  {en ? 'This file is inspected visually via multimodal AI Vision.' : 'يتم فحص هذا الملف بصريًا عبر محرك الرؤية الذكي (AI Vision).'}
                </p>
              ) : null}
            </div>
          </section>
        </div>
      )}

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
