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
  Layers3,
  LoaderCircle,
  LogIn,
  LogOut,
  Mail,
  Menu,
  MonitorSmartphone,
  RotateCcw,
  ScrollText,
  Send,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Star,
  Target,
  Trash2,
  UserRound,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import AdminDashboard from './AdminDashboard.jsx';
import AuthDialog from './AuthDialog.jsx';
import {
  generateAssistantResponse,
  getModeLabel,
  hasLiveAI,
  TOOL_LIBRARY,
} from './lib/assistant.js';
import {
  clearHistory,
  createHistoryItem,
  loadHistory,
  loadPreferences,
  saveHistory,
  savePreferences,
} from './lib/storage.js';
import {
  getCurrentUser,
  hasPlatformBackend,
  logoutAccount,
  reportClientError,
  sendFeedback,
  trackUsage,
} from './lib/platform.js';

const TOOL_ICONS = {
  explain: BrainCircuit,
  summarize: BookOpen,
  plan: CalendarRange,
  quiz: CircleHelp,
  flashcards: Layers3,
  research: Target,
  email: Mail,
  tasks: ListChecks,
  meeting: ClipboardList,
  cv: FileCheck2,
  cover: ScrollText,
  qa: ClipboardList,
  ask: Sparkles,
  rewrite: FileCheck2,
  brainstorm: BrainCircuit,
  decide: ListChecks,
  organize: CalendarRange,
  content: BookOpen,
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
  general: {
    eyebrow: 'UNIVERSAL WORKSPACE',
    title: 'اكتب أي حاجة. وابدأ من هنا.',
    description: 'أسئلة، مشاكل، نصوص، أفكار، قرارات، وتنظيم يومك في مساحة واحدة مرنة.',
    icon: Sparkles,
  },
};

function routeFromHash() {
  const route = window.location.hash.replace('#/', '').replace('#', '');
  return ['study', 'work', 'general', 'admin'].includes(route) ? route : null;
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

function Header({ mode, onInstall, installed, online, user, onAccount, onLogout }) {
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
          <button className={mode === 'general' ? 'active' : ''} type="button" onClick={() => navigate('general')}><Sparkles size={16} /> المساعد العام</button>
          <button className={mode === 'study' ? 'active' : ''} type="button" onClick={() => navigate('study')}><GraduationCap size={16} /> الدراسة</button>
          <button className={mode === 'work' ? 'active' : ''} type="button" onClick={() => navigate('work')}><BriefcaseBusiness size={16} /> العمل</button>
          {user?.role === 'admin' && <button className={mode === 'admin' ? 'active' : ''} type="button" onClick={() => navigate('admin')}><ShieldCheck size={16} /> الإدارة</button>}
        </nav>
        <div className="header-actions">
          <span className={online ? 'status-dot online' : 'status-dot offline'} title={online ? 'متصل' : 'يعمل Offline'}>
            {online ? <Wifi size={15} /> : <WifiOff size={15} />}
          </span>
          {!installed && (
            <button className="button button-ghost install-button" type="button" onClick={onInstall}>
              <Smartphone size={17} /> تثبيت
            </button>
          )}
          {installed && <span className="installed-label"><Check size={15} /> مُثبّت</span>}
          {hasPlatformBackend && !user && <button className="account-button" type="button" onClick={onAccount}><LogIn size={16} /> دخول</button>}
          {hasPlatformBackend && user && <button className="account-button signed" type="button" onClick={onLogout} title="تسجيل الخروج"><UserRound size={16} /><span>{user.name.split(' ')[0]}</span><LogOut size={14} /></button>}
          <button className="menu-button" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="فتح القائمة" aria-expanded={menuOpen}>
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}

function detectPlatform() {
  const agent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(agent)) return 'ios';
  if (/android/.test(agent)) return 'android';
  return 'desktop';
}

function InstallDialog({ open, onClose, onInstall, canInstall, installed }) {
  if (!open) return null;
  const platform = detectPlatform();
  const instructions = {
    ios: ['افتح الرابط في Safari.', 'اضغط زر المشاركة.', 'اختر «إضافة إلى الشاشة الرئيسية».'],
    android: ['افتح الرابط في Chrome.', 'اضغط قائمة ⋮.', 'اختر «تثبيت التطبيق» أو «إضافة للشاشة الرئيسية».'],
    desktop: ['افتح الرابط في Chrome أو Edge.', 'اضغط علامة التثبيت بجوار شريط العنوان.', 'أكد التثبيت ليفتح PathPilot كتطبيق مستقل.'],
  }[platform];

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="install-dialog" role="dialog" aria-modal="true" aria-labelledby="install-title">
        <button className="dialog-close" type="button" onClick={onClose} aria-label="إغلاق"><X size={20} /></button>
        <div className="dialog-icon"><MonitorSmartphone /></div>
        <span className="eyebrow">INSTALL PATHPILOT</span>
        <h2 id="install-title">خليه تطبيق على جهازك.</h2>
        <p>يعمل على Windows وAndroid وiPhone/iPad، ولا يحتاج حسابًا. بيانات كل مستخدم تبقى محفوظة على جهازه.</p>
        {installed ? (
          <div className="install-success"><BadgeCheck /> PathPilot مثبت بالفعل على هذا الجهاز.</div>
        ) : canInstall ? (
          <button className="button button-primary dialog-install" type="button" onClick={onInstall}><Download size={18} /> تثبيت الآن</button>
        ) : (
          <ol className="install-steps">
            {instructions.map((step) => <li key={step}>{step}</li>)}
          </ol>
        )}
        <div className="platform-row" aria-label="الأنظمة المدعومة">
          <span>Windows</span><span>Android</span><span>iPhone & iPad</span>
        </div>
      </section>
    </div>
  );
}

function Landing({ onSelect, onInstall }) {
  return (
    <main>
      <section className="hero page-shell">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={15} /> ASK. LEARN. BUILD. DECIDE.</div>
          <h1>مساعد واحد<br /><span>لأي سؤال أو مهمة.</span></h1>
          <p className="hero-lead">ثلاث مساحات و18 أداة لتنظيم أي طلب: مساعد عام مرن، أدوات دراسة، وأدوات عمل احترافية.</p>
          <div className="hero-actions">
            <button className="button button-primary" type="button" onClick={() => onSelect('general')}>
              اسأل أي حاجة <ArrowLeft size={18} />
            </button>
            <button className="button button-secondary" type="button" onClick={() => onSelect('study')}>الدراسة</button>
            <button className="button button-secondary" type="button" onClick={() => onSelect('work')}>العمل</button>
          </div>
          <div className="trust-row">
            <span><ShieldCheck size={17} /> بدون حساب</span>
            <span><Smartphone size={17} /> موقع + تطبيق</span>
            <span><WifiOff size={17} /> يعمل Offline</span>
          </div>
          <p className="local-ai-note"><CircleHelp size={16} /> الردود الحالية محلية وليست مدعومة بنموذج AI حقيقي حتى الآن.</p>
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
          <div className="floating-card floating-study"><GraduationCap /> <span><b>Study</b><small>6 smart tools</small></span></div>
          <div className="floating-card floating-work"><BriefcaseBusiness /> <span><b>Work</b><small>6 pro tools</small></span></div>
        </div>
      </section>

      <section className="proof-strip">
        <div className="page-shell proof-grid">
          <div><strong>03</strong><span>مساحات متخصصة</span></div>
          <div><strong>18</strong><span>أداة عملية</span></div>
          <div><strong>PWA</strong><span>قابل للتثبيت</span></div>
          <div><strong>RTL</strong><span>تجربة عربية أصلية</span></div>
        </div>
      </section>

      <section className="section page-shell" id="workspaces">
        <div className="section-heading">
          <div className="eyebrow"><Target size={15} /> ONE APP. THREE WORKSPACES.</div>
          <h2>أي طلب له مساحة مناسبة.</h2>
          <p>ابدأ بالمساعد العام لأي موضوع، أو استخدم أدوات الدراسة والعمل للمخرجات المتخصصة.</p>
        </div>
        <div className="workspace-cards">
          <article className="workspace-card general-card">
            <div className="workspace-icon"><Sparkles /></div>
            <span className="card-number">01</span>
            <h3>Universal Workspace</h3>
            <p>لأي سؤال أو مشكلة أو نص أو فكرة أو قرار من أي مستخدم.</p>
            <ul>
              <li><Check /> فهم تلقائي لنوع الطلب</li>
              <li><Check /> تحسين وتنظيم أي نص</li>
              <li><Check /> توليد أفكار ومقارنة خيارات</li>
              <li><Check /> تنظيم اليوم وصناعة المحتوى</li>
            </ul>
            <button type="button" onClick={() => onSelect('general')}>افتح المساعد العام <ChevronLeft /></button>
          </article>
          <article className="workspace-card study-card">
            <div className="workspace-icon"><GraduationCap /></div>
            <span className="card-number">02</span>
            <h3>Study Workspace</h3>
            <p>لفهم المحاضرات، ضغط وقت المراجعة، وتحويل الهدف إلى خطة يومية.</p>
            <ul>
              <li><Check /> شرح متدرج مع أمثلة</li>
              <li><Check /> تلخيص وكلمات أساسية</li>
              <li><Check /> خطة مذاكرة قابلة للتنفيذ</li>
              <li><Check /> اختبار مراجعة نشط</li>
              <li><Check /> بطاقات سؤال وجواب</li>
              <li><Check /> خريطة بحث منظمة</li>
            </ul>
            <button type="button" onClick={() => onSelect('study')}>ابدأ الدراسة <ChevronLeft /></button>
          </article>
          <article className="workspace-card work-card">
            <div className="workspace-icon"><BriefcaseBusiness /></div>
            <span className="card-number">03</span>
            <h3>Work Workspace</h3>
            <p>للكتابة المهنية، تخطيط التنفيذ، توثيق الاجتماعات وعرض الخبرة.</p>
            <ul>
              <li><Check /> بريد احترافي واضح</li>
              <li><Check /> مهام وأولويات ومخرجات</li>
              <li><Check /> قرارات وخطوات من الاجتماعات</li>
              <li><Check /> CV bullets بلا ادعاءات</li>
              <li><Check /> خطاب تقديم مخصص</li>
              <li><Check /> تقارير جودة وBug Reports</li>
            </ul>
            <button type="button" onClick={() => onSelect('work')}>ابدأ العمل <ChevronLeft /></button>
          </article>
        </div>
      </section>

      <section className="install-cta page-shell">
        <div>
          <span className="eyebrow"><Smartphone size={15} /> INSTALLABLE PWA</span>
          <h2>نفس التجربة. موقع وتطبيق.</h2>
          <p>ثبّت PathPilot على Windows أو Android أو iPhone/iPad وافتحه بسرعة حتى مع اتصال ضعيف.</p>
          <div className="install-platforms"><span>Windows</span><span>Android</span><span>iOS</span><span>بدون حساب</span></div>
        </div>
        <button className="button button-light" type="button" onClick={onInstall}>
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

function ResultCard({ answer, source, onCopy, onDownload, onShare, onRate, feedbackEnabled }) {
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
          <button type="button" onClick={onShare} title="مشاركة النتيجة"><Share2 size={17} /></button>
          <button type="button" onClick={onDownload} title="تنزيل النتيجة"><Download size={17} /></button>
        </div>
      </div>
      <pre>{answer}</pre>
      {feedbackEnabled && (
        <div className="result-feedback">
          <span>قيّم النتيجة</span>
          <div>{[1, 2, 3, 4, 5].map((rating) => <button type="button" key={rating} onClick={() => onRate(rating)} title={`${rating} من 5`} aria-label={`تقييم ${rating} من 5`}><Star size={16} /></button>)}</div>
        </div>
      )}
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
              <span className={`history-mode ${item.mode}`}>
                {item.mode === 'study' ? <GraduationCap size={16} /> : item.mode === 'work' ? <BriefcaseBusiness size={16} /> : <Sparkles size={16} />}
              </span>
              <span><strong>{item.prompt}</strong><small><Clock3 size={12} /> {new Date(item.createdAt).toLocaleDateString('ar-EG')}</small></span>
              <ChevronLeft size={16} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function PreferencesPanel({ preferences, onChange }) {
  const update = (key, value) => onChange({ ...preferences, [key]: value });
  return (
    <section className="preferences-panel" aria-label="تخصيص النتيجة">
      <div className="preference-heading"><SlidersHorizontal size={17} /><span><strong>خصّص النتيجة</strong><small>تُحفظ الإعدادات على جهازك فقط</small></span></div>
      <label>
        <span><UserRound size={14} /> اسمك <small>اختياري</small></span>
        <input value={preferences.displayName} onChange={(event) => update('displayName', event.target.value)} placeholder="يظهر في الرسائل فقط" maxLength={60} />
      </label>
      <label>
        <span>النتيجة موجهة إلى</span>
        <select value={preferences.audience} onChange={(event) => update('audience', event.target.value)}>
          <option value="self">استخدام شخصي</option>
          <option value="teacher">مدرس أو مشرف</option>
          <option value="recruiter">مسؤول توظيف</option>
          <option value="team">فريق عمل</option>
        </select>
      </label>
      <label>
        <span>مستوى التفاصيل</span>
        <select value={preferences.responseStyle} onChange={(event) => update('responseStyle', event.target.value)}>
          <option value="concise">مختصر</option>
          <option value="balanced">متوازن</option>
          <option value="detailed">مفصل</option>
        </select>
      </label>
    </section>
  );
}

function Workspace({ mode, history, preferences, onPreferencesChange, onNewHistory, onClearHistory, notify }) {
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
        <div className={hasLiveAI ? 'ai-status live' : 'ai-status demo'}><i /> {hasLiveAI ? 'Live AI متصل' : 'Smart Demo'}</div>
      </div>

      {!hasLiveAI && (
        <div className="page-shell local-disclaimer" role="note">
          <CircleHelp size={19} />
          <div><strong>ملاحظة مهمة</strong><span>الردود الحالية تُنشأ محليًا وليست مدعومة بنموذج AI حقيقي حتى الآن. لا تعتمد عليها وحدها في قرارات طبية أو قانونية أو مالية.</span></div>
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
              <div className="starter-row">
                {tool.starters.map((starter) => <button type="button" key={starter} onClick={() => setPrompt(starter)}>{starter}</button>)}
              </div>
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

function Footer() {
  return (
    <footer className="site-footer">
      <div className="page-shell footer-inner">
        <div><Brand /><p>مساعد عربي عام للدراسة والعمل والحياة اليومية، صُمم كتجربة Web وPWA متكاملة.</p></div>
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
  const [preferences, setPreferences] = useState(loadPreferences);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installOpen, setInstallOpen] = useState(false);
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches);
  const [online, setOnline] = useState(navigator.onLine);
  const [toast, setToast] = useState('');
  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);

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
    let active = true;
    getCurrentUser().then((currentUser) => {
      if (active) setUser(currentUser);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectMode = (nextMode) => {
    window.location.hash = `/${nextMode}`;
    trackUsage({ eventType: 'workspace_opened', workspace: nextMode });
  };

  const handleInstall = async () => {
    if (!installPrompt) {
      setInstallOpen(true);
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstalled(true);
      setInstallOpen(false);
    }
    setInstallPrompt(null);
  };

  const updatePreferences = (nextPreferences) => {
    const saved = savePreferences(nextPreferences);
    setPreferences(saved);
  };

  const handleAuthenticated = (authenticatedUser) => {
    setUser(authenticatedUser);
    if (!preferences.displayName && authenticatedUser?.name) {
      updatePreferences({ ...preferences, displayName: authenticatedUser.name });
    }
    setToast(`أهلًا ${authenticatedUser.name}.`);
  };

  const handleLogout = async () => {
    await logoutAccount();
    setUser(null);
    if (mode === 'admin') window.location.hash = '';
    setToast('تم تسجيل الخروج.');
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
      <Header mode={mode} onInstall={() => setInstallOpen(true)} installed={installed} online={online} user={user} onAccount={() => setAuthOpen(true)} onLogout={handleLogout} />
      {!mode ? (
        <Landing onSelect={selectMode} onInstall={() => setInstallOpen(true)} />
      ) : mode === 'admin' ? (
        <AdminDashboard user={user} onBack={() => { window.location.hash = ''; }} />
      ) : (
        <Workspace
          mode={mode}
          history={historyItems}
          preferences={preferences}
          onPreferencesChange={updatePreferences}
          onNewHistory={addHistory}
          onClearHistory={handleClearHistory}
          notify={setToast}
          key={mode}
        />
      )}
      <Footer />
      <InstallDialog open={installOpen} onClose={() => setInstallOpen(false)} onInstall={handleInstall} canInstall={Boolean(installPrompt)} installed={installed} />
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} onAuthenticated={handleAuthenticated} />
      {toast && <div className="toast" role="status"><BadgeCheck size={18} /> {toast}</div>}
    </div>
  );
}
