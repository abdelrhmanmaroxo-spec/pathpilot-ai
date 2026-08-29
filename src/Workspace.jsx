import { useEffect, useState } from 'react';
import {
  BriefcaseBusiness,
  CircleHelp,
  GraduationCap,
  LoaderCircle,
  RotateCcw,
  Send,
  Sparkles,
} from 'lucide-react';
import {
  generateAssistantResponse,
  getModeLabel,
  hasLiveAI,
  TOOL_LIBRARY,
} from './lib/assistant.js';
import { supportsBrowserLLM } from './lib/local-llm.js';
import { createHistoryItem } from './lib/storage.js';
import { hasPlatformBackend, reportClientError, sendFeedback, trackUsage } from './lib/platform.js';
import { HistoryPanel, PreferencesPanel, ResultCard, TOOL_ICONS, ToolRail } from './components/WorkspacePanels.jsx';

const MODE_CONTENT = {
  study: { eyebrow: 'STUDY WORKSPACE', title: 'ذاكر بفهم، مش بحفظ.', description: 'حوّل المحاضرات والأهداف إلى شرح واضح، مراجعة نشطة، وخطة واقعية.', icon: GraduationCap },
  work: { eyebrow: 'WORK WORKSPACE', title: 'اشتغل بوضوح وسرعة.', description: 'حوّل الأفكار والاجتماعات والخبرات إلى مخرجات مهنية جاهزة للتنفيذ.', icon: BriefcaseBusiness },
  general: { eyebrow: 'UNIVERSAL WORKSPACE', title: 'اكتب أي حاجة. وابدأ من هنا.', description: 'أسئلة، مشاكل، نصوص، أفكار، قرارات، وتنظيم يومك في مساحة واحدة مرنة.', icon: Sparkles },
};

export default function Workspace({ mode, history, preferences, onPreferencesChange, onNewHistory, onClearHistory, notify }) {
  const tools = TOOL_LIBRARY[mode];
  const [selectedTool, setSelectedTool] = useState(tools[0].id);
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [source, setSource] = useState('demo');
  const [loading, setLoading] = useState(false);
  const content = MODE_CONTENT[mode];
  const tool = tools.find((item) => item.id === selectedTool) || tools[0];
  const ModeIcon = content.icon;
  const localLlmSupported = supportsBrowserLLM();

  const handleToolSelect = (toolId) => {
    setSelectedTool(toolId);
    setAnswer('');
    trackUsage({ eventType: 'tool_selected', workspace: mode, tool: toolId });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (prompt.trim().length < 4) {
      notify('اكتب تفاصيل أكثر قبل الإرسال.');
      return;
    }
    setLoading(true);
    try {
      const result = await generateAssistantResponse({ mode, tool: selectedTool, prompt, preferences });
      setAnswer(result.answer);
      setSource(result.source);
      onNewHistory(createHistoryItem({ mode, tool: selectedTool, prompt: prompt.trim(), answer: result.answer, source: result.source }));
      trackUsage({ eventType: 'tool_request', workspace: mode, tool: selectedTool, metadata: { source: result.source } });
    } catch (error) {
      notify(error.message || 'حدث خطأ غير متوقع.');
      reportClientError(error, `${mode}:${selectedTool}`);
    } finally {
      setLoading(false);
    }
  };

  const copyAnswer = async () => {
    await navigator.clipboard.writeText(answer);
    notify('تم نسخ النتيجة.');
  };

  const downloadAnswer = () => {
    const blob = new Blob([`# ${tool.label}\n\n${answer}`], { type: 'text/markdown;charset=utf-8' });
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
    setSelectedTool(item.tool);
    setPrompt(item.prompt);
    setAnswer(item.answer);
    setSource(item.source);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handler = (event) => {
      const item = event.detail;
      if (item?.mode !== mode) return;
      setSelectedTool(item.tool);
      setPrompt(item.prompt);
      setAnswer(item.answer);
      setSource(item.source);
    };
    window.addEventListener('pathpilot:history', handler);
    return () => window.removeEventListener('pathpilot:history', handler);
  }, [mode]);

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
          <section className="composer-card">
            <div className="composer-head">
              <div className="selected-tool-icon">{(() => { const Icon = TOOL_ICONS[tool.id]; return <Icon />; })()}</div>
              <div><span>{getModeLabel(mode)}</span><h2>{tool.label}</h2><p>{tool.description}</p></div>
            </div>
            <form onSubmit={handleSubmit}>
              <PreferencesPanel preferences={preferences} onChange={onPreferencesChange} />
              <label htmlFor="assistant-prompt">اكتب طلبك بالتفصيل</label>
              <textarea id="assistant-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={tool.placeholder} maxLength={12000} rows={7} />
              <div className="starter-row">{tool.starters.map((starter) => <button type="button" key={starter} onClick={() => setPrompt(starter)}>{starter}</button>)}</div>
              <div className="composer-footer">
                <span>{prompt.length.toLocaleString('ar-EG')} / ١٢٬٠٠٠</span>
                <div>
                  {(prompt || answer) && <button className="reset-button" type="button" onClick={() => { setPrompt(''); setAnswer(''); }}><RotateCcw size={16} /> جديد</button>}
                  <button className="button button-primary submit-button" type="submit" disabled={loading}>
                    {loading ? <><LoaderCircle className="spin" size={18} /> جاري التجهيز</> : <><Send size={18} /> أنشئ النتيجة</>}
                  </button>
                </div>
              </div>
            </form>
          </section>
          <ResultCard answer={answer} source={source} onCopy={copyAnswer} onDownload={downloadAnswer} onShare={shareAnswer} onRate={rateAnswer} feedbackEnabled={hasPlatformBackend} />
        </div>
        <HistoryPanel items={history} onOpen={openHistory} onClear={onClearHistory} />
      </div>
    </main>
  );
}
