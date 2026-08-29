import { useEffect, useRef, useState } from 'react';
import {
  BriefcaseBusiness,
  CircleHelp,
  GraduationCap,
  LoaderCircle,
  RotateCcw,
  Send,
  Sparkles,
  Square,
} from 'lucide-react';
import { getModeLabel, hasLiveAI, TOOL_LIBRARY } from './lib/assistant.js';
import { generateRoutedAssistantResponse } from './lib/assistant-router.js';
import { supportsBrowserLLM } from './lib/local-llm.js';
import { createHistoryItem } from './lib/storage.js';
import { hasPlatformBackend, reportClientError, sendFeedback, trackUsage } from './lib/platform.js';
import { TOOL_ICONS } from './lib/tool-icons.js';
import { buildConversationPrompt, createConversationTurn } from './lib/conversation-context.js';
import ConversationThread from './components/ConversationThread.jsx';
import VoiceControls from './components/VoiceControls.jsx';
import { HistoryPanel, PreferencesPanel, ResultCard, ToolRail } from './components/WorkspacePanels.jsx';

const MODE_CONTENT = {
  study: { eyebrow: 'STUDY WORKSPACE', title: 'ذاكر بفهم، مش بحفظ.', description: 'حوّل المحاضرات والأهداف إلى شرح واضح، مراجعة نشطة، وخطة واقعية.', icon: GraduationCap },
  work: { eyebrow: 'WORK WORKSPACE', title: 'اشتغل بوضوح وسرعة.', description: 'حوّل الأفكار والاجتماعات والخبرات إلى مخرجات مهنية جاهزة للتنفيذ.', icon: BriefcaseBusiness },
  general: { eyebrow: 'UNIVERSAL WORKSPACE', title: 'اكتب أي حاجة. وابدأ من هنا.', description: 'أسئلة، مشاكل، نصوص، أفكار، قرارات، وتنظيم يومك في مساحة واحدة مرنة.', icon: Sparkles },
};

function isEnglish() {
  return document.body?.dataset?.language === 'en';
}

function formatSeconds(value) {
  return `${Number(value || 0).toFixed(1)}s`;
}

export default function Workspace({ mode, history, preferences, onPreferencesChange, onNewHistory, onClearHistory, notify }) {
  const tools = TOOL_LIBRARY[mode];
  const [selectedTool, setSelectedTool] = useState(tools[0].id);
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [source, setSource] = useState('demo');
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [turns, setTurns] = useState([]);
  const [processingSeconds, setProcessingSeconds] = useState(0);
  const [lastProcessingSeconds, setLastProcessingSeconds] = useState(null);
  const abortRef = useRef(null);
  const runTokenRef = useRef(0);
  const processingStartedRef = useRef(0);
  const content = MODE_CONTENT[mode];
  const tool = tools.find((item) => item.id === selectedTool) || tools[0];
  const ModeIcon = content.icon;
  const localLlmSupported = supportsBrowserLLM();
  const en = isEnglish();

  const handleToolSelect = (toolId) => {
    abortRef.current?.abort();
    runTokenRef.current += 1;
    setSelectedTool(toolId);
    setPrompt('');
    setAnswer('');
    setSources([]);
    setTurns([]);
    setLoading(false);
    setProcessingSeconds(0);
    setLastProcessingSeconds(null);
    trackUsage({ eventType: 'tool_selected', workspace: mode, tool: toolId });
  };

  const runPrompt = async (userPrompt, { replaceLast = false } = {}) => {
    const trimmed = String(userPrompt || '').trim();
    if (trimmed.length < 4) {
      notify('اكتب تفاصيل أكثر قبل الإرسال.');
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const runToken = runTokenRef.current + 1;
    runTokenRef.current = runToken;
    const previousTurns = replaceLast ? turns.slice(0, -1) : turns;
    const contextualPrompt = buildConversationPrompt({ prompt: trimmed, turns: previousTurns });

    processingStartedRef.current = performance.now();
    setProcessingSeconds(0);
    setLastProcessingSeconds(null);
    setLoading(true);
    setAnswer('');
    setSources([]);
    try {
      const result = await generateRoutedAssistantResponse({
        mode,
        tool: selectedTool,
        prompt: contextualPrompt,
        preferences,
        signal: controller.signal,
      });
      if (controller.signal.aborted || runToken !== runTokenRef.current) return;

      const durationSeconds = Math.max(0, (performance.now() - processingStartedRef.current) / 1000);
      const nextTurn = createConversationTurn({
        prompt: trimmed,
        answer: result.answer,
        source: result.source,
        tool: selectedTool,
      });
      setAnswer(result.answer);
      setSource(result.source);
      setSources(Array.isArray(result.sources) ? result.sources : []);
      setLastProcessingSeconds(durationSeconds);
      setProcessingSeconds(durationSeconds);
      setTurns((current) => (
        replaceLast
          ? [...current.slice(0, -1), nextTurn]
          : [...current, nextTurn].slice(-6)
      ));
      setPrompt('');
      onNewHistory(createHistoryItem({ mode, tool: selectedTool, prompt: trimmed, answer: result.answer, source: result.source }));
      trackUsage({
        eventType: replaceLast ? 'answer_regenerated' : 'tool_request',
        workspace: mode,
        tool: selectedTool,
        metadata: { source: result.source, route: result.route, contextTurns: previousTurns.length, processingMs: Math.round(durationSeconds * 1000) },
      });
    } catch (error) {
      if (controller.signal.aborted || runToken !== runTokenRef.current) return;
      const durationSeconds = Math.max(0, (performance.now() - processingStartedRef.current) / 1000);
      setLastProcessingSeconds(durationSeconds);
      notify(error.message || 'حدث خطأ غير متوقع.');
      reportClientError(error, `${mode}:${selectedTool}`);
    } finally {
      if (runToken === runTokenRef.current) setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await runPrompt(prompt);
  };

  const stopGeneration = () => {
    const durationSeconds = processingStartedRef.current
      ? Math.max(0, (performance.now() - processingStartedRef.current) / 1000)
      : processingSeconds;
    abortRef.current?.abort();
    runTokenRef.current += 1;
    setProcessingSeconds(durationSeconds);
    setLastProcessingSeconds(durationSeconds);
    setLoading(false);
    notify(en ? 'Generation stopped.' : 'تم إيقاف إنشاء الإجابة.');
    trackUsage({ eventType: 'generation_stopped', workspace: mode, tool: selectedTool, metadata: { processingMs: Math.round(durationSeconds * 1000) } });
  };

  const regenerateAnswer = async () => {
    const latest = turns.at(-1);
    if (!latest) return;
    await runPrompt(latest.prompt, { replaceLast: true });
  };

  const reusePrompt = (value) => {
    setPrompt(value);
    window.setTimeout(() => document.querySelector('#assistant-prompt')?.focus(), 0);
  };

  const newConversation = () => {
    abortRef.current?.abort();
    runTokenRef.current += 1;
    setPrompt('');
    setAnswer('');
    setSources([]);
    setTurns([]);
    setLoading(false);
    setProcessingSeconds(0);
    setLastProcessingSeconds(null);
    notify(en ? 'New conversation started.' : 'بدأت محادثة جديدة.');
  };

  const copyAnswer = async () => {
    await navigator.clipboard.writeText(answer);
    notify('تم نسخ النتيجة.');
  };

  const downloadAnswer = () => {
    const sourceAppendix = sources.length
      ? `\n\n## ${en ? 'Sources' : 'المصادر'}\n${sources.map((item, index) => `${index + 1}. ${item.title || item.domain || item.url}\n${item.url}`).join('\n\n')}`
      : '';
    const blob = new Blob([`# ${tool.label}\n\n${answer}${sourceAppendix}`], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pathpilot-${selectedTool}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const shareAnswer = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `PathPilot — ${tool.label}`, text: answer });
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }
    await navigator.clipboard.writeText(answer);
    notify('المشاركة غير متاحة هنا؛ تم نسخ النتيجة بدلًا منها.');
  };

  const rateAnswer = async (rating) => {
    try {
      await sendFeedback({ rating, workspace: mode, tool: selectedTool, message: '' });
      notify('شكرًا، تم تسجيل تقييمك.');
    } catch (error) {
      notify('تعذر تسجيل التقييم حاليًا.');
      reportClientError(error, 'feedback');
    }
  };

  const openHistory = (item) => {
    if (item.mode !== mode) {
      window.location.hash = `/${item.mode}`;
      window.setTimeout(() => window.dispatchEvent(new CustomEvent('pathpilot:history', { detail: item })), 50);
      return;
    }
    const restored = createConversationTurn({
      prompt: item.prompt,
      answer: item.answer,
      source: item.source,
      tool: item.tool,
      createdAt: new Date(item.createdAt || Date.now()).getTime(),
    });
    setSelectedTool(item.tool);
    setPrompt('');
    setAnswer(item.answer);
    setSource(item.source);
    setSources([]);
    setLastProcessingSeconds(null);
    setTurns([restored]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handler = (event) => {
      const item = event.detail;
      if (item?.mode !== mode) return;
      const restored = createConversationTurn({
        prompt: item.prompt,
        answer: item.answer,
        source: item.source,
        tool: item.tool,
        createdAt: new Date(item.createdAt || Date.now()).getTime(),
      });
      setSelectedTool(item.tool);
      setPrompt('');
      setAnswer(item.answer);
      setSource(item.source);
      setSources([]);
      setLastProcessingSeconds(null);
      setTurns([restored]);
    };
    window.addEventListener('pathpilot:history', handler);
    return () => window.removeEventListener('pathpilot:history', handler);
  }, [mode]);

  useEffect(() => {
    if (!loading) return undefined;
    const update = () => {
      if (!processingStartedRef.current) return;
      setProcessingSeconds(Math.max(0, (performance.now() - processingStartedRef.current) / 1000));
    };
    update();
    const timer = window.setInterval(update, 100);
    return () => window.clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    const handler = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.querySelector('#assistant-prompt')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => () => {
    abortRef.current?.abort();
    runTokenRef.current += 1;
  }, []);

  const previousTurns = answer ? turns.slice(0, -1) : turns;

  return (
    <main className={`workspace-page ${mode}`}>
      <div className="page-shell workspace-heading">
        <div className="mode-icon"><ModeIcon /></div>
        <div><span>{content.eyebrow}</span><h1>{content.title}</h1><p>{content.description}</p></div>
        <div className={hasLiveAI ? 'ai-status live' : 'ai-status demo'}><i /> {hasLiveAI ? 'Live AI متصل' : preferences.localLlmEnabled && localLlmSupported ? 'Local LLM مفعّل' : 'Local Intelligence'}</div>
      </div>

      {!hasLiveAI && (
        <div className="page-shell local-disclaimer" role="note">
          <CircleHelp size={19} />
          <div><strong>وضع محلي</strong><span>{preferences.localLlmEnabled && localLlmSupported ? 'سيحاول PathPilot تشغيل نموذج لغوي محلي على جهازك، ثم يعود إلى الموسوعة ومحرك الاستدلال إذا تعذر.' : 'يستخدم PathPilot الموسوعة المحلية ومحرك الاستدلال. يمكنك تفعيل Local LLM من إعدادات النتيجة على الأجهزة الداعمة.'}</span></div>
        </div>
      )}

      <div className="page-shell workspace-layout">
        <ToolRail mode={mode} selectedTool={selectedTool} onSelect={handleToolSelect} />
        <div className="assistant-column">
          <ConversationThread turns={previousTurns} onReuse={reusePrompt} />
          <section className="composer-card">
            <div className="composer-head">
              <div className="selected-tool-icon">{(() => { const Icon = TOOL_ICONS[tool.id]; return <Icon />; })()}</div>
              <div><span>{getModeLabel(mode)}</span><h2>{tool.label}</h2><p>{tool.description}</p></div>
            </div>
            <form onSubmit={handleSubmit}>
              <PreferencesPanel preferences={preferences} onChange={onPreferencesChange} />
              <label htmlFor="assistant-prompt">اكتب طلبك بالتفصيل</label>
              <textarea
                id="assistant-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                    event.preventDefault();
                    if (!loading) runPrompt(prompt);
                  } else if (event.key === 'Escape' && loading) {
                    event.preventDefault();
                    stopGeneration();
                  }
                }}
                placeholder={turns.length ? (en ? 'Continue the conversation…' : 'كمّل المحادثة…') : tool.placeholder}
                maxLength={12000}
                rows={7}
              />
              <VoiceControls value={prompt} onChange={setPrompt} answer={answer} notify={notify} />
              {!turns.length && <div className="starter-row">{tool.starters.map((starter) => <button type="button" key={starter} onClick={() => setPrompt(starter)}>{starter}</button>)}</div>}
              <div className="composer-footer">
                <span>{prompt.length.toLocaleString('ar-EG')} / ١٢٬٠٠٠{turns.length ? ` · ${en ? 'context' : 'سياق'} ${turns.length}/6` : ''}</span>
                <div>
                  {(prompt || answer || turns.length > 0) && <button className="reset-button" type="button" onClick={newConversation}><RotateCcw size={16} /> {en ? 'New chat' : 'محادثة جديدة'}</button>}
                  {loading ? (
                    <button className="button button-secondary submit-button" type="button" onClick={stopGeneration}><Square size={16} /> {en ? 'Stop' : 'إيقاف'}</button>
                  ) : (
                    <button className="button button-primary submit-button" type="submit">
                      <Send size={18} /> {turns.length ? (en ? 'Send' : 'إرسال') : 'أنشئ النتيجة'}
                    </button>
                  )}
                  {loading && <span className="processing-timer"><LoaderCircle className="spin" size={16} /><strong>{en ? 'Processing' : 'جاري المعالجة'}</strong><b>{formatSeconds(processingSeconds)}</b></span>}
                </div>
              </div>
            </form>
          </section>
          <ResultCard answer={answer} source={source} sources={sources} processingSeconds={lastProcessingSeconds} onCopy={copyAnswer} onDownload={downloadAnswer} onShare={shareAnswer} onRate={rateAnswer} onRegenerate={regenerateAnswer} loading={loading} feedbackEnabled={hasPlatformBackend} />
        </div>
        <HistoryPanel items={history} onOpen={openHistory} onClear={onClearHistory} />
      </div>
    </main>
  );
}
