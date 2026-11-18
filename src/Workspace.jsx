import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BrainCircuit,
  BriefcaseBusiness,
  CircleHelp,
  FileDown,
  GraduationCap,
  LoaderCircle,
  MessageSquareText,
  RotateCcw,
  Send,
  Sparkles,
  Square,
} from 'lucide-react';
import { getModeLabel, hasLiveAI, TOOL_LIBRARY } from './lib/assistant.js';
import { generateRoutedAssistantResponse } from './lib/assistant-router.js';
import { getDocumentLanguage, subscribeLanguageChanges } from './lib/language-state.js';
import {
  detectDominantLanguage,
  resolveTurnForLanguage,
  translateMarkdownAsync,
  translateMarkdownSync,
} from './lib/live-content-translator.js';
import { supportsBrowserLLM } from './lib/local-llm.js';
import { createHistoryItem } from './lib/storage.js';
import { hasPlatformBackend, reportClientError, sendFeedback, trackUsage } from './lib/platform.js';
import { TOOL_ICONS } from './lib/tool-icons.js';
import { buildConversationPrompt, createConversationTurn } from './lib/conversation-context.js';
import { buildDeepThinkingTrace, buildMaterialPromptEnvelope } from './lib/material-intelligence.js';
import ConversationThread from './components/ConversationThread.jsx';
import CurriculumPdfModal from './components/CurriculumPdfModal.jsx';
import MaterialSynthesisStudio from './components/MaterialSynthesisStudio.jsx';
import VoiceControls from './components/VoiceControls.jsx';
import { HistoryPanel, PreferencesPanel, ResultCard, ToolRail } from './components/WorkspacePanels.jsx';

const MODE_CONTENT = {
  study: { eyebrow: 'STUDY WORKSPACE', title: 'ذاكر بفهم، مش بحفظ.', description: 'حوّل المحاضرات والأهداف إلى شرح واضح، مراجعة نشطة، وخطة واقعية.', icon: GraduationCap },
  work: { eyebrow: 'WORK WORKSPACE', title: 'اشتغل بوضوح وسرعة.', description: 'حوّل الأفكار والاجتماعات والخبرات إلى مخرجات مهنية جاهزة للتنفيذ.', icon: BriefcaseBusiness },
  general: { eyebrow: 'UNIVERSAL WORKSPACE', title: 'اكتب أي حاجة. وابدأ من هنا.', description: 'أسئلة، مشاكل، نصوص، أفكار، قرارات، وتنظيم يومك في مساحة واحدة مرنة.', icon: Sparkles },
};

function formatSeconds(value) {
  return `${Number(value || 0).toFixed(1)}s`;
}

export default function Workspace({ mode, language: propLanguage, history, preferences, onPreferencesChange, onNewHistory, onClearHistory, notify }) {
  const tools = TOOL_LIBRARY[mode];
  const [docLang, setDocLang] = useState(getDocumentLanguage);
  useEffect(() => subscribeLanguageChanges(setDocLang), []);
  const language = propLanguage || docLang;
  const en = language === 'en';
  const targetLang = en ? 'en' : 'ar';

  const [selectedTool, setSelectedTool] = useState(tools[0].id);
  const [prompt, setPrompt] = useState('');
  const [rawAnswer, setRawAnswer] = useState('');
  const [answerCacheByLang, setAnswerCacheByLang] = useState({});
  const [source, setSource] = useState('demo');
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deepThink, setDeepThink] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
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

  // Translate active answer dynamically when switching page between AR <-> EN
  const answer = useMemo(() => {
    if (!rawAnswer) return '';
    if (answerCacheByLang[targetLang]) return answerCacheByLang[targetLang];
    return translateMarkdownSync(rawAnswer, targetLang);
  }, [answerCacheByLang, rawAnswer, targetLang]);

  useEffect(() => {
    if (!rawAnswer || answerCacheByLang[targetLang]) return undefined;
    const dom = detectDominantLanguage(rawAnswer);
    if (dom === 'neutral' || dom === targetLang) return undefined;
    const controller = new AbortController();
    let cancelled = false;
    translateMarkdownAsync(rawAnswer, targetLang, { signal: controller.signal }).then((translated) => {
      if (!cancelled && translated) {
        setAnswerCacheByLang((prev) => ({ ...prev, [targetLang]: translated }));
      }
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [answerCacheByLang, rawAnswer, targetLang]);

  const localizedTurns = useMemo(
    () => turns.map((t) => resolveTurnForLanguage(t, targetLang)),
    [targetLang, turns],
  );

  const handleToolSelect = (toolId) => {
    abortRef.current?.abort();
    runTokenRef.current += 1;
    setSelectedTool(toolId);
    setPrompt('');
    setRawAnswer('');
    setAnswerCacheByLang({});
    setSources([]);
    setTurns([]);
    setLoading(false);
    setProcessingSeconds(0);
    setLastProcessingSeconds(null);
    trackUsage({ eventType: 'tool_selected', workspace: mode, tool: toolId });
  };

  const applyInstantSynthesis = (instantOutput, thinkingTrace = null) => {
    if (!instantOutput) return;
    const label = en ? 'Summary & Synthesis of Attached Materials' : 'تلخيص ودمج المواد المرفقة';
    const nextTurn = {
      ...createConversationTurn({
        prompt: label,
        answer: instantOutput,
        source: 'local-fallback',
        tool: selectedTool,
      }),
      ...(thinkingTrace ? { thinkingTrace } : {}),
      i18n: { [targetLang]: { prompt: label, answer: instantOutput } },
    };
    setRawAnswer(instantOutput);
    setAnswerCacheByLang({ [targetLang]: instantOutput });
    setSource('local-fallback');
    setSources([]);
    setLastProcessingSeconds(0.2);
    setTurns((current) => [...current, nextTurn].slice(-12));
    onNewHistory(createHistoryItem({ mode, tool: selectedTool, prompt: label, answer: instantOutput, source: 'local-fallback' }));
  };

  const generateCustomAiCurriculumSummary = async ({ materials: mats, rawText, options }) => {
    const outLang = options.language === 'en' ? 'en' : 'ar';
    const envelope = buildMaterialPromptEnvelope({
      action: mats?.length >= 2 ? 'merge' : 'summarize',
      materials: mats?.length ? mats : [{ id: 'ws-pdf', title: options.courseTitle || tool.label, content: rawText }],
      userPrompt: options.customInstructions || '',
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

  const runPrompt = async (userPrompt, { replaceLast = false, deepThinkOverride, thinkingTrace } = {}) => {
    const trimmed = String(userPrompt || '').trim();
    if (trimmed.length < 4) {
      notify(en ? 'Add more details before submitting.' : 'اكتب تفاصيل أكثر قبل الإرسال.');
      return;
    }

    const useDeep = deepThinkOverride ?? deepThink;
    const activeTrace = thinkingTrace || (useDeep
      ? buildDeepThinkingTrace(trimmed, { language: targetLang, intent: selectedTool })
      : null);

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
    setRawAnswer('');
    setAnswerCacheByLang({});
    setSources([]);
    try {
      const result = await generateRoutedAssistantResponse({
        mode,
        tool: selectedTool,
        prompt: contextualPrompt,
        preferences: { ...preferences, uiLanguage: targetLang },
        routeOptions: {
          agentMode: 'auto',
          deepThink: useDeep,
        },
        signal: controller.signal,
      });
      if (controller.signal.aborted || runToken !== runTokenRef.current) return;

      const finalAns = targetLang === 'en' && detectDominantLanguage(result.answer) === 'ar'
        ? await translateMarkdownAsync(result.answer, 'en', { signal: controller.signal })
        : result.answer;

      const durationSeconds = Math.max(0, (performance.now() - processingStartedRef.current) / 1000);
      const nextTurn = {
        ...createConversationTurn({
          prompt: trimmed,
          answer: finalAns,
          source: result.source,
          tool: selectedTool,
        }),
        ...(activeTrace ? { thinkingTrace: activeTrace } : {}),
        i18n: {
          [targetLang]: { prompt: trimmed, answer: finalAns },
          ...(finalAns !== result.answer ? { ar: { prompt: trimmed, answer: result.answer } } : {}),
        },
      };
      setRawAnswer(finalAns);
      setAnswerCacheByLang({
        [targetLang]: finalAns,
        ...(finalAns !== result.answer ? { ar: result.answer } : {}),
      });
      setSource(result.source);
      setSources(Array.isArray(result.sources) ? result.sources : []);
      setLastProcessingSeconds(durationSeconds);
      setProcessingSeconds(durationSeconds);
      setTurns((current) => (
        replaceLast
          ? [...current.slice(0, -1), nextTurn]
          : [...current, nextTurn].slice(-12)
      ));
      setPrompt('');
      onNewHistory(createHistoryItem({ mode, tool: selectedTool, prompt: trimmed, answer: finalAns, source: result.source }));
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
      notify(error.message || (en ? 'An unexpected error occurred.' : 'حدث خطأ غير متوقع.'));
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
    setRawAnswer('');
    setAnswerCacheByLang({});
    setSources([]);
    setTurns([]);
    setLoading(false);
    setProcessingSeconds(0);
    setLastProcessingSeconds(null);
    notify(en ? 'New conversation started.' : 'بدأت محادثة جديدة.');
  };

  const copyAnswer = async () => {
    await navigator.clipboard.writeText(answer);
    notify(en ? 'Result copied.' : 'تم نسخ النتيجة.');
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
    notify(en ? 'Sharing is unavailable here, so the result was copied instead.' : 'المشاركة غير متاحة هنا؛ تم نسخ النتيجة بدلًا منها.');
  };

  const rateAnswer = async (rating) => {
    try {
      await sendFeedback({ rating, workspace: mode, tool: selectedTool, message: '' });
      notify(en ? 'Thanks, your rating was recorded.' : 'شكرًا، تم تسجيل تقييمك.');
    } catch (error) {
      notify(en ? 'Could not record the rating right now.' : 'تعذر تسجيل التقييم حاليًا.');
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
    setRawAnswer(item.answer);
    setAnswerCacheByLang({});
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
      setRawAnswer(item.answer);
      setAnswerCacheByLang({});
      setSource(item.source);
      setSources([]);
      setLastProcessingSeconds(null);
      setTurns([restored]);
    };
    window.addEventListener('pathpilot:history', handler);
    return () => window.removeEventListener('pathpilot:history', handler);
  }, [mode]);

  useEffect(() => {
    const selectTool = (event) => {
      const toolId = String(event.detail?.toolId || '');
      if (!tools.some((item) => item.id === toolId)) return;
      abortRef.current?.abort();
      runTokenRef.current += 1;
      setSelectedTool(toolId);
      setPrompt('');
      setRawAnswer('');
      setAnswerCacheByLang({});
      setSources([]);
      setTurns([]);
      setLoading(false);
      setProcessingSeconds(0);
      setLastProcessingSeconds(null);
      trackUsage({ eventType: 'tool_selected', workspace: mode, tool: toolId, metadata: { source: 'global-search' } });
      window.setTimeout(() => document.querySelector('#assistant-prompt')?.focus(), 0);
    };
    const reuseFromSearch = (event) => {
      const value = String(event.detail?.prompt || '').trim();
      if (!value) return;
      setPrompt(value.slice(0, 12000));
      window.setTimeout(() => document.querySelector('#assistant-prompt')?.focus(), 0);
    };
    window.addEventListener('pathpilot:select-tool', selectTool);
    window.addEventListener('pathpilot:reuse-prompt', reuseFromSearch);
    return () => {
      window.removeEventListener('pathpilot:select-tool', selectTool);
      window.removeEventListener('pathpilot:reuse-prompt', reuseFromSearch);
    };
  }, [mode, tools]);

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

  useEffect(() => () => {
    abortRef.current?.abort();
    runTokenRef.current += 1;
  }, []);

  const previousTurns = answer ? localizedTurns.slice(0, -1) : localizedTurns;

  return (
    <main className={`workspace-page ${mode}`}>
      <div className="page-shell workspace-heading">
        <div className="mode-icon"><ModeIcon /></div>
        <div><span>{content.eyebrow}</span><h1>{content.title}</h1><p>{content.description}</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className="workspace-open-chat-btn"
            onClick={() => setPdfModalOpen(true)}
          >
            <FileDown size={15} /> {en ? 'Curriculum PDF' : 'ملخص PDF للمنهج'}
          </button>
          <button
            type="button"
            className="workspace-open-chat-btn"
            onClick={() => { window.location.hash = '/chat'; }}
          >
            <MessageSquareText size={15} /> {en ? 'Open Live Chat' : 'افتح الشات الحي'}
          </button>
          <div className={hasLiveAI ? 'ai-status live' : 'ai-status demo'}><i /> {hasLiveAI ? 'Live AI متصل' : preferences.localLlmEnabled && localLlmSupported ? 'Local LLM مفعّل' : 'Local Intelligence'}</div>
        </div>
      </div>

      {!hasLiveAI && (
        <div className="page-shell local-disclaimer" role="note">
          <CircleHelp size={19} />
          <div><strong>{en ? 'Local Mode' : 'وضع محلي'}</strong><span>{preferences.localLlmEnabled && localLlmSupported ? 'سيحاول PathPilot تشغيل نموذج لغوي محلي على جهازك، ثم يعود إلى الموسوعة ومحرك الاستدلال إذا تعذر.' : 'يستخدم PathPilot الموسوعة المحلية ومحرك الاستدلال. يمكنك تفعيل Local LLM من إعدادات النتيجة على الأجهزة الداعمة.'}</span></div>
        </div>
      )}

      <div className="page-shell workspace-layout">
        <ToolRail mode={mode} selectedTool={selectedTool} onSelect={handleToolSelect} />
        <div className="assistant-column">
          <ConversationThread
            turns={previousTurns}
            maxTurns={20}
            onReuse={reusePrompt}
            onExportTurnPdf={(turn) => {
              setRawAnswer(turn.answer);
              setPdfModalOpen(true);
            }}
          />

          <MaterialSynthesisStudio
            key={`${mode}-${selectedTool}`}
            language={targetLang}
            compact={!(mode === 'study' && selectedTool === 'summarize')}
            deepThink={deepThink}
            onToggleDeepThink={setDeepThink}
            onRunPrompt={(envelope, meta) => runPrompt(envelope, { deepThinkOverride: meta.deepThink, thinkingTrace: meta.thinkingTrace })}
            onGenerateCustomAiSummary={generateCustomAiCurriculumSummary}
            onInstantAnswer={applyInstantSynthesis}
            notify={notify}
          />

          <section className="composer-card">
            <div className="composer-head">
              <div className="selected-tool-icon">{(() => { const Icon = TOOL_ICONS[tool.id]; return <Icon />; })()}</div>
              <div style={{ flex: 1 }}><span>{getModeLabel(mode)}</span><h2>{tool.label}</h2><p>{tool.description}</p></div>
              <button
                type="button"
                className={deepThink ? 'workspace-deep-toggle active' : 'workspace-deep-toggle'}
                aria-pressed={deepThink}
                onClick={() => setDeepThink((val) => !val)}
              >
                <BrainCircuit size={15} /> {en ? 'Deep Think' : 'تفكير عميق'}
              </button>
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
                rows={6}
              />
              <VoiceControls
                value={prompt}
                onChange={setPrompt}
                answer={answer}
                notify={notify}
                onAutoSubmit={(spokenText) => runPrompt(spokenText)}
              />
              {!turns.length && <div className="starter-row">{tool.starters.map((starter) => <button type="button" key={starter} onClick={() => setPrompt(starter)}>{starter}</button>)}</div>}
              <div className="composer-footer">
                <span>{prompt.length.toLocaleString(en ? 'en-US' : 'ar-EG')} / {en ? '12,000' : '١٢٬٠٠٠'}{turns.length ? ` · ${en ? 'context' : 'سياق'} ${turns.length}/12` : ''}</span>
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
          <ResultCard
            answer={answer}
            source={source}
            sources={sources}
            processingSeconds={lastProcessingSeconds}
            onCopy={copyAnswer}
            onDownload={downloadAnswer}
            onExportPdf={() => setPdfModalOpen(true)}
            onShare={shareAnswer}
            onRate={rateAnswer}
            onRegenerate={regenerateAnswer}
            loading={loading}
            feedbackEnabled={hasPlatformBackend}
          />
        </div>
        <HistoryPanel items={history} onOpen={openHistory} onClear={onClearHistory} />
      </div>

      <CurriculumPdfModal
        open={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        language={targetLang}
        rawText={answer || prompt}
        defaultTitle={translateMarkdownSync(tool.label, targetLang)}
        onGenerateCustomAiSummary={generateCustomAiCurriculumSummary}
        notify={notify}
      />
    </main>
  );
}
