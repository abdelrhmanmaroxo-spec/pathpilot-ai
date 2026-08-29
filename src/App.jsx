import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarRange,
  Check,
  ChevronLeft,
  CircleHelp,
  ClipboardList,
  Clock3,
  Code2,
  Copy,
  Download,
  FileCheck2,
  GraduationCap,
  History,
  Home,
  Link,
  ListChecks,
  LoaderCircle,
  Mail,
  Menu,
  RotateCcw,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import {
  generateAssistantResponse,
  getModeLabel,
  hasLiveAI,
  TOOL_LIBRARY,
} from './lib/assistant.js';
import { clearHistory, createHistoryItem, loadHistory, saveHistory } from './lib/storage.js';

const TOOL_ICONS = {
  explain: BrainCircuit,
  summarize: BookOpen,
  plan: CalendarRange,
  quiz: CircleHelp,
  email: Mail,
  tasks: ListChecks,
  meeting: ClipboardList,
  cv: FileCheck2,
};

const MODE_CONTENT = {
  study: {
    eyebrow: 'STUDY WORKSPACE',
    title: 'ذاكر بفهم، مش بحفظ.',
    description: 'حوّل المحاضرات والأهداف إلى شرح واضح، مراجعة نشطة، وخطة واقعية.',
    icon: GraduationCap,
  },
  work: {
    eyebrow: 'WORK WORKSPACE',
    title: 'اشتغل بوضوح وسرعة.',
    description: 'حوّل الأفكار والاجتماعات والخبرات إلى مخرجات مهنية جاهزة للتنفيذ.',
    icon: BriefcaseBusiness,
  },
};

function routeFromHash() {
  const route = window.location.hash.replace('#/', '').replace('#', '');
  return route === 'study' || route === 'work' ? route : null;
}

function Brand({ compact = false }) {
  return (
    <button className="brand" type="button" onClick={() => { window.location.hash = ''; }} aria-label="العودة للرئيسية">
      <span className="brand-mark" aria-hidden="true">P</span>
      <span>
        <strong>PathPilot</strong>
        {!compact && <small>AI STUDY & WORK</small>}
      </span>
    </button>
  );
}

function Header({ mode, onInstall, canInstall, installed, online }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = (nextMode) => {
    window.location.hash = nextMode ? `/${nextMode}` : '';
    setMenuOpen(false);
  };

  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand compact />
        <nav className={menuOpen ? 'main-nav is-open' : 'main-nav'} aria-label="التنقل الرئيسي">
          <button className={!mode ? 'active' : ''} type="button" onClick={() => navigate(null)}><Home size={16} /> الرئيسية</button>
          <button className={mode === 'study' ? 'active' : ''} type="button" onClick={() => navigate('study')}><GraduationCap size={16} /> الدراسة</button>
          <button className={mode === 'work' ? 'active' : ''} type="button" onClick={() => navigate('work')}><BriefcaseBusiness size={16} /> العمل</button>
        </nav>
        <div className="header-actions">
          <span className={online ? 'status-dot online' : 'status-dot offline'} title={online ? 'متصل' : 'يعمل Offline'}>
            {online ? <Wifi size={15} /> : <WifiOff size={15} />}
          </span>
          {!installed && (
            <button className="button button-ghost install-button" type="button" onClick={onInstall} disabled={!canInstall} title={!canInstall ? 'افتح قائمة المتصفح واختر تثبيت التطبيق' : ''}>
              <Smartphone size={17} /> تثبيت
            </button>
          )}
          {installed && <span className="installed-label"><Check size={15} /> مُثبّت</span>}
          <button className="menu-button" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="فتح القائمة" aria-expanded={menuOpen}>
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}

function Landing({ onSelect, onInstall, canInstall }) {
  return (
    <main>
      <section className="hero page-shell">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={15} /> SMARTER STUDY. BETTER WORK.</div>
          <h1>مساعدك الذكي<br /><span>من الجامعة إلى سوق العمل.</span></h1>
          <p className="hero-lead">مساحتان في تطبيق واحد: أدوات تساعدك تفهم وتذاكر، وأدوات تحوّل شغلك إلى نتائج مهنية واضحة.</p>
          <div className="hero-actions">
            <button className="button button-primary" type="button" onClick={() => onSelect('study')}>
              ابدأ مساحة الدراسة <ArrowLeft size={18} />
            </button>
            <button className="button button-secondary" type="button" onClick={() => onSelect('work')}>
              افتح مساحة العمل
            </button>
          </div>
          <div className="trust-row">
            <span><ShieldCheck size={17} /> بياناتك محليًا</span>
            <span><Smartphone size={17} /> موقع + تطبيق</span>
            <span><WifiOff size={17} /> يعمل Offline</span>
          </div>
        </div>

        <div className="hero-visual" aria-label="معاينة PathPilot AI">
          <div className="glow glow-one" />
          <div className="glow glow-two" />
          <div className="preview-window">
            <div className="preview-topbar"><i /><i /><i /><span>pathpilot.ai</span></div>
            <div className="preview-body">
              <div className="preview-side">
                <span className="preview-logo">P</span>
                <i className="selected" /><i /><i /><i />
              </div>
              <div className="preview-main">
                <div className="preview-kicker">STUDY WORKSPACE</div>
                <h3>جاهز نبدأ؟</h3>
                <div className="preview-prompt"><Sparkles size={17} /> اشرح التعلّم العميق ببساطة</div>
                <div className="preview-answer">
                  <span><BrainCircuit size={21} /></span>
                  <div><b>شرح مبسّط</b><i /><i /><i className="short" /></div>
                </div>
              </div>
            </div>
          </div>
          <div className="floating-card floating-study"><GraduationCap /> <span><b>Study</b><small>4 smart tools</small></span></div>
          <div className="floating-card floating-work"><BriefcaseBusiness /> <span><b>Work</b><small>4 pro tools</small></span></div>
        </div>
      </section>

      <section className="proof-strip">
        <div className="page-shell proof-grid">
          <div><strong>02</strong><span>مساحات متخصصة</span></div>
          <div><strong>08</strong><span>أدوات عملية</span></div>
          <div><strong>PWA</strong><span>قابل للتثبيت</span></div>
          <div><strong>RTL</strong><span>تجربة عربية أصلية</span></div>
        </div>
      </section>

      <section className="section page-shell" id="workspaces">
        <div className="section-heading">
          <div className="eyebrow"><Target size={15} /> ONE JOURNEY. TWO WORKSPACES.</div>
          <h2>اختار المساحة المناسبة للحظة الحالية.</h2>
          <p>من غير قوائم مزدحمة أو أدوات بلا هدف. كل مساحة مصممة لمخرجات محددة.</p>
        </div>
        <div className="workspace-cards">
          <article className="workspace-card study-card">
            <div className="workspace-icon"><GraduationCap /></div>
            <span className="card-number">01</span>
            <h3>Study Workspace</h3>
            <p>لفهم المحاضرات، ضغط وقت المراجعة، وتحويل الهدف إلى خطة يومية.</p>
            <ul>
              <li><Check /> شرح متدرج مع أمثلة</li>
              <li><Check /> تلخيص وكلمات أساسية</li>
              <li><Check /> خطة مذاكرة قابلة للتنفيذ</li>
              <li><Check /> اختبار مراجعة نشط</li>
            </ul>
            <button type="button" onClick={() => onSelect('study')}>ابدأ الدراسة <ChevronLeft /></button>
          </article>
          <article className="workspace-card work-card">
            <div className="workspace-icon"><BriefcaseBusiness /></div>
            <span className="card-number">02</span>
            <h3>Work Workspace</h3>
            <p>للكتابة المهنية، تخطيط التنفيذ، توثيق الاجتماعات وعرض الخبرة.</p>
            <ul>
              <li><Check /> بريد احترافي واضح</li>
              <li><Check /> مهام وأولويات ومخرجات</li>
              <li><Check /> قرارات وخطوات من الاجتماعات</li>
              <li><Check /> CV bullets بلا ادعاءات</li>
            </ul>
            <button type="button" onClick={() => onSelect('work')}>ابدأ العمل <ChevronLeft /></button>
          </article>
        </div>
      </section>

      <section className="install-cta page-shell">
        <div>
          <span className="eyebrow"><Smartphone size={15} /> INSTALLABLE PWA</span>
          <h2>نفس التجربة. موقع وتطبيق.</h2>
          <p>ثبّت PathPilot على الموبايل أو الكمبيوتر وافتحه بسرعة حتى مع اتصال ضعيف.</p>
        </div>
        <button className="button button-light" type="button" onClick={onInstall} disabled={!canInstall}>
          <Download size={18} /> تثبيت PathPilot
        </button>
      </section>
    </main>
  );
}

function ToolRail({ mode, selectedTool, onSelect }) {
  return (
    <aside className="tool-rail">
      <p className="rail-label">الأدوات</p>
      {TOOL_LIBRARY[mode].map((tool) => {
        const Icon = TOOL_ICONS[tool.id];
        return (
          <button className={selectedTool === tool.id ? 'tool-button active' : 'tool-button'} type="button" key={tool.id} onClick={() => onSelect(tool.id)}>
            <span><Icon size={20} /></span>
            <span><strong>{tool.label}</strong><small>{tool.description}</small></span>
            <ChevronLeft size={17} />
          </button>
        );
      })}
    </aside>
  );
}

function ResultCard({ answer, source, onCopy, onDownload }) {
  if (!answer) {
    return (
      <div className="empty-result">
        <span><Sparkles /></span>
        <h3>النتيجة ستظهر هنا</h3>
        <p>اكتب تفاصيل حقيقية؛ كلما كان السياق أوضح كانت النتيجة أكثر فائدة.</p>
      </div>
    );
  }

  return (
    <section className="result-card" aria-live="polite">
      <div className="result-head">
        <div><span className="assistant-avatar"><Sparkles size={18} /></span><div><strong>PathPilot Assistant</strong><small>{source === 'live' ? 'Live AI response' : 'Smart local demo'}</small></div></div>
        <div className="result-actions">
          <button type="button" onClick={onCopy} title="نسخ النتيجة"><Copy size={17} /></button>
          <button type="button" onClick={onDownload} title="تنزيل النتيجة"><Download size={17} /></button>
        </div>
      </div>
      <pre>{answer}</pre>
    </section>
  );
}

function HistoryPanel({ items, onOpen, onClear }) {
  return (
    <section className="history-panel">
      <div className="history-head">
        <div><History size={19} /><strong>آخر النتائج</strong></div>
        {items.length > 0 && <button type="button" onClick={onClear}><Trash2 size={15} /> مسح</button>}
      </div>
      {items.length === 0 ? (
        <p className="history-empty">لسه مفيش نتائج محفوظة على الجهاز.</p>
      ) : (
        <div className="history-list">
          {items.slice(0, 6).map((item) => (
            <button type="button" key={item.id} onClick={() => onOpen(item)}>
              <span className={`history-mode ${item.mode}`}>{item.mode === 'study' ? <GraduationCap size={16} /> : <BriefcaseBusiness size={16} />}</span>
              <span><strong>{item.prompt}</strong><small><Clock3 size={12} /> {new Date(item.createdAt).toLocaleDateString('ar-EG')}</small></span>
              <ChevronLeft size={16} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function Workspace({ mode, history, onNewHistory, onClearHistory, notify }) {
  const tools = TOOL_LIBRARY[mode];
  const [selectedTool, setSelectedTool] = useState(tools[0].id);
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [source, setSource] = useState('demo');
  const [loading, setLoading] = useState(false);
  const content = MODE_CONTENT[mode];
  const tool = tools.find((item) => item.id === selectedTool) || tools[0];
  const ModeIcon = content.icon;

  const handleToolSelect = (toolId) => {
    setSelectedTool(toolId);
    setAnswer('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (prompt.trim().length < 4) {
      notify('اكتب تفاصيل أكثر قبل الإرسال.');
      return;
    }
    setLoading(true);
    try {
      const result = await generateAssistantResponse({ mode, tool: selectedTool, prompt });
      setAnswer(result.answer);
      setSource(result.source);
      onNewHistory(createHistoryItem({ mode, tool: selectedTool, prompt: prompt.trim(), answer: result.answer, source: result.source }));
    } catch (error) {
      notify(error.message || 'حدث خطأ غير متوقع.');
    } finally {
      setLoading(false);
    }
  };

  const copyAnswer = async () => {
    await navigator.clipboard.writeText(answer);
    notify('تم نسخ النتيجة.');
  };

  const downloadAnswer = () => {
    const blob = new Blob([answer], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pathpilot-${selectedTool}.txt`;
    link.click();
    URL.revokeObjectURL(url);
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
        <div className={hasLiveAI ? 'ai-status live' : 'ai-status demo'}><i /> {hasLiveAI ? 'Live AI متصل' : 'Smart Demo'}</div>
      </div>

      <div className="page-shell workspace-layout">
        <ToolRail mode={mode} selectedTool={selectedTool} onSelect={handleToolSelect} />
        <div className="assistant-column">
          <section className="composer-card">
            <div className="composer-head">
              <div className="selected-tool-icon">{(() => { const Icon = TOOL_ICONS[tool.id]; return <Icon />; })()}</div>
              <div><span>{getModeLabel(mode)}</span><h2>{tool.label}</h2><p>{tool.description}</p></div>
            </div>
            <form onSubmit={handleSubmit}>
              <label htmlFor="assistant-prompt">اكتب طلبك بالتفصيل</label>
              <textarea id="assistant-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={tool.placeholder} maxLength={4000} rows={7} />
              <div className="starter-row">
                {tool.starters.map((starter) => <button type="button" key={starter} onClick={() => setPrompt(starter)}>{starter}</button>)}
              </div>
              <div className="composer-footer">
                <span>{prompt.length.toLocaleString('ar-EG')} / ٤٠٠٠</span>
                <div>
                  {(prompt || answer) && <button className="reset-button" type="button" onClick={() => { setPrompt(''); setAnswer(''); }}><RotateCcw size={16} /> جديد</button>}
                  <button className="button button-primary submit-button" type="submit" disabled={loading}>
                    {loading ? <><LoaderCircle className="spin" size={18} /> جاري التجهيز</> : <><Send size={18} /> أنشئ النتيجة</>}
                  </button>
                </div>
              </div>
            </form>
          </section>

          <ResultCard answer={answer} source={source} onCopy={copyAnswer} onDownload={downloadAnswer} />
        </div>
        <HistoryPanel items={history} onOpen={openHistory} onClear={onClearHistory} />
      </div>
    </main>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="page-shell footer-inner">
        <div><Brand /><p>واجهة عربية ذكية للدراسة والعمل، صُممت كتجربة Web وPWA متكاملة.</p></div>
        <div className="footer-meta">
          <span>Built by Abdelrhman Essam</span>
          <a href="https://github.com/abdelrhmanmaroxo-spec" target="_blank" rel="noreferrer"><Code2 size={18} /> GitHub</a>
          <a href="https://www.linkedin.com/in/abdelrhman-essam-vib/" target="_blank" rel="noreferrer"><Link size={18} /> LinkedIn</a>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  const [mode, setMode] = useState(routeFromHash);
  const [historyItems, setHistoryItems] = useState(loadHistory);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches);
  const [online, setOnline] = useState(navigator.onLine);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const updateRoute = () => setMode(routeFromHash());
    const updateOnline = () => setOnline(navigator.onLine);
    const captureInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const markInstalled = () => { setInstalled(true); setInstallPrompt(null); };
    window.addEventListener('hashchange', updateRoute);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    window.addEventListener('beforeinstallprompt', captureInstall);
    window.addEventListener('appinstalled', markInstalled);
    return () => {
      window.removeEventListener('hashchange', updateRoute);
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
      window.removeEventListener('beforeinstallprompt', captureInstall);
      window.removeEventListener('appinstalled', markInstalled);
    };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectMode = (nextMode) => { window.location.hash = `/${nextMode}`; };

  const handleInstall = async () => {
    if (!installPrompt) {
      setToast('من قائمة المتصفح اختر «تثبيت التطبيق» أو Add to Home Screen.');
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setInstallPrompt(null);
  };

  const addHistory = (item) => {
    setHistoryItems((items) => {
      const next = saveHistory([item, ...items]);
      return next;
    });
  };

  const handleClearHistory = () => {
    if (!window.confirm('مسح سجل النتائج المحفوظ على هذا الجهاز؟')) return;
    clearHistory();
    setHistoryItems([]);
    setToast('تم مسح السجل.');
  };

  return (
    <div className="app">
      <Header mode={mode} onInstall={handleInstall} canInstall={Boolean(installPrompt)} installed={installed} online={online} />
      {!mode ? (
        <Landing onSelect={selectMode} onInstall={handleInstall} canInstall={Boolean(installPrompt)} />
      ) : (
        <Workspace
          mode={mode}
          history={historyItems}
          onNewHistory={addHistory}
          onClearHistory={handleClearHistory}
          notify={setToast}
          key={mode}
        />
      )}
      <Footer />
      {toast && <div className="toast" role="status"><BadgeCheck size={18} /> {toast}</div>}
    </div>
  );
}
