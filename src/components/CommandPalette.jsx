import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  BriefcaseBusiness,
  Clock3,
  Download,
  GraduationCap,
  History,
  Home,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  TextCursorInput,
  UserRound,
  X,
} from 'lucide-react';
import { TOOL_LIBRARY } from '../lib/assistant.js';

function currentLanguage() {
  return document.body?.dataset?.language === 'en' ? 'en' : 'ar';
}

function isEnglish() {
  return currentLanguage() === 'en';
}

function normalize(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06EDـ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function goToHash(hash) {
  const target = `${globalThis.location.pathname}${globalThis.location.search}${hash}`;
  globalThis.location.assign(target);
}

function goToPage(url) {
  globalThis.location.assign(url);
}

const TOOL_ALIASES = {
  explain: 'explain explanation شرح مفهوم تبسيط lesson concept',
  summarize: 'summary summarize تلخيص لخص notes ملاحظات',
  plan: 'plan study schedule خطة مذاكرة جدول',
  quiz: 'quiz test questions اختبار اسئلة فهم',
  flashcards: 'flashcards cards بطاقات مراجعة سؤال جواب',
  research: 'research search web بحث مصادر مراجع',
  email: 'email mail بريد رسالة professional',
  tasks: 'tasks todo مهام اولويات تنفيذ',
  meeting: 'meeting notes minutes اجتماع ملخص قرارات',
  cv: 'cv resume سيرة ذاتية ATS خبرة انجاز',
  cover: 'cover letter خطاب تقديم وظيفة',
  qa: 'qa quality bug report جودة خطأ اختبار',
  ask: 'ask assistant question اسأل سؤال مساعد عام',
  rewrite: 'rewrite improve text تحسين نص صياغة',
  brainstorm: 'brainstorm ideas افكار توليد',
  decide: 'decide compare decision قرار مقارنة اختار',
  organize: 'organize day schedule تنظيم يوم جدول',
  content: 'content post article video محتوى بوست مقال فيديو',
};

const MODE_LABELS = {
  general: ['General Assistant', 'المساعد العام'],
  study: ['Study', 'الدراسة'],
  work: ['Work', 'العمل'],
};

const TOOL_ENGLISH = {
  explain: ['Explain a concept', 'A clear step-by-step explanation with an example and review question.'],
  summarize: ['Summarize my notes', 'Turn long text into focused points and key terms.'],
  plan: ['Study plan', 'Break a goal into practical, actionable sessions.'],
  quiz: ['Quiz me', 'Short active-recall questions with answer guidance.'],
  flashcards: ['Flashcards', 'Turn any topic into quick question-and-answer cards.'],
  research: ['Research map', 'Turn a broad topic into questions, themes, and a research plan.'],
  email: ['Professional email', 'Clear professional writing with a subject and next step.'],
  tasks: ['Turn it into tasks', 'Turn a scattered goal into steps, priorities, and outputs.'],
  meeting: ['Meeting summary', 'Decisions, owners, risks, and next steps.'],
  cv: ['CV achievement', 'Turn completed work into a strong, evidence-based CV bullet.'],
  cover: ['Cover letter', 'A tailored draft connecting real experience to the role.'],
  qa: ['QA report', 'Turn an issue into a clear, actionable QA report.'],
  ask: ['Ask anything', 'Understands the request and chooses the best available workflow.'],
  rewrite: ['Improve any text', 'Organize text and make it clearer and easier to read.'],
  brainstorm: ['Generate ideas', 'Generate varied ideas and help rank the strongest ones.'],
  decide: ['Help me decide', 'Compare options using clear criteria and real tradeoffs.'],
  organize: ['Plan my day', 'Turn commitments into a realistic, flexible schedule.'],
  content: ['Create content', 'Structure a post, video, or article around the goal and audience.'],
};

function collectVisiblePageEntries(close, en = isEnglish()) {
  const selector = 'main h1, main h2, main h3, main button, main a, main label, main [aria-label]';
  const seen = new Set();
  return [...document.querySelectorAll(selector)]
    .filter((element) => !element.closest('.command-palette') && !element.closest('.global-command-trigger'))
    .filter((element) => {
      const style = getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
    })
    .map((element, index) => {
      const text = String(element.getAttribute('aria-label') || element.textContent || '').replace(/\s+/g, ' ').trim();
      if (text.length < 2 || text.length > 120) return null;
      const key = normalize(text);
      if (!key || seen.has(key)) return null;
      seen.add(key);
      return {
        id: `visible-${index}-${key.slice(0, 20)}`,
        label: text,
        hint: en ? 'On this page' : 'موجود في الصفحة الحالية',
        keywords: text,
        icon: Search,
        rank: 20,
        run: () => {
          close();
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('pathpilot-search-hit');
          globalThis.setTimeout(() => element.classList.remove('pathpilot-search-hit'), 1500);
          if (typeof element.focus === 'function') globalThis.setTimeout(() => element.focus({ preventScroll: true }), 350);
        },
      };
    })
    .filter(Boolean)
    .slice(0, 80);
}

function searchScore(action, query) {
  const needle = normalize(query);
  if (!needle) return action.rank || 0;
  const tokens = needle.split(' ').filter(Boolean);
  const label = normalize(action.label);
  const haystack = normalize(`${action.label} ${action.hint || ''} ${action.keywords || ''}`);
  if (!tokens.every((token) => haystack.includes(token))) return -1;
  let score = action.rank || 0;
  if (label === needle) score += 180;
  else if (label.startsWith(needle)) score += 120;
  else if (label.includes(needle)) score += 80;
  tokens.forEach((token) => { if (label.includes(token)) score += 12; });
  return score;
}

export default function CommandPalette({ user, history = [], onAccount, onInstall }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pageEntries, setPageEntries] = useState([]);
  const [language, setLanguage] = useState(() => currentLanguage());
  const inputRef = useRef(null);
  const en = language === 'en';
  const base = import.meta.env.BASE_URL || '/';
  const isAdmin = user?.role === 'admin';

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const openSearch = () => {
    setPageEntries(collectVisiblePageEntries(close, en));
    setOpen(true);
  };

  const navigateWorkspace = (mode, toolId = null, prompt = '') => {
    goToHash(`#/${mode}`);
    close();
    globalThis.setTimeout(() => {
      if (toolId) globalThis.dispatchEvent(new CustomEvent('pathpilot:select-tool', { detail: { toolId } }));
      if (prompt) globalThis.dispatchEvent(new CustomEvent('pathpilot:reuse-prompt', { detail: { prompt } }));
      else document.querySelector('#assistant-prompt')?.focus();
    }, 130);
  };

  const navigateAdmin = (tab) => {
    if (!isAdmin) return;
    globalThis.sessionStorage.setItem('pathpilot.admin.tab', tab);
    goToHash('#/admin');
    close();
    globalThis.setTimeout(() => globalThis.dispatchEvent(new CustomEvent('pathpilot:admin-tab', { detail: { tab } })), 130);
  };

  const openAccount = () => {
    close();
    if (!user) {
      onAccount?.();
      return;
    }
    const trigger = document.querySelector('.account-center-trigger');
    if (trigger instanceof HTMLElement) {
      trigger.click();
      globalThis.setTimeout(() => {
        const settingsButton = [...document.querySelectorAll('.account-menu button')]
          .find((button) => /الإعدادات|settings/i.test(button.textContent || ''));
        if (settingsButton instanceof HTMLElement) settingsButton.click();
      }, 50);
    }
  };

  const openFeedback = () => {
    close();
    const trigger = document.querySelector('.feedback-header-button');
    if (trigger instanceof HTMLElement) trigger.click();
  };

  const actions = [
    { id: 'home', label: en ? 'Home' : 'الرئيسية', hint: en ? 'PathPilot home page' : 'العودة للصفحة الرئيسية', keywords: 'home الرئيسية البداية', icon: Home, rank: 100, run: () => { close(); goToHash(''); } },
    { id: 'general', label: en ? 'Ask PathPilot anything' : 'اسأل PathPilot أي حاجة', hint: en ? 'General Assistant' : 'المساعد العام', keywords: 'assistant ask question chat مساعد سؤال محادثة', icon: Sparkles, rank: 110, run: () => navigateWorkspace('general') },
    { id: 'study', label: en ? 'Open Study workspace' : 'افتح مساحة الدراسة', hint: en ? 'Study tools' : 'أدوات الدراسة', keywords: 'study school learn دراسة مذاكرة تعليم', icon: GraduationCap, rank: 95, run: () => navigateWorkspace('study') },
    { id: 'work', label: en ? 'Open Work workspace' : 'افتح مساحة العمل', hint: en ? 'Professional tools' : 'أدوات العمل', keywords: 'work job professional عمل وظيفة شغل', icon: BriefcaseBusiness, rank: 95, run: () => navigateWorkspace('work') },
    { id: 'focus', label: en ? 'Focus the current prompt' : 'روح لمربع السؤال الحالي', hint: en ? 'Continue typing' : 'كمّل كتابة طلبك', keywords: 'prompt input سؤال كتابة', icon: TextCursorInput, rank: 65, run: () => { close(); globalThis.setTimeout(() => document.querySelector('#assistant-prompt')?.focus(), 0); } },
    { id: 'account', label: user ? (en ? 'Account & settings' : 'الحساب والإعدادات') : (en ? 'Sign in or create account' : 'تسجيل الدخول أو إنشاء حساب'), hint: user?.email || (en ? 'Account access' : 'إدارة الحساب'), keywords: 'account settings login register signup password حساب اعدادات دخول تسجيل باسورد', icon: user ? Settings : UserRound, rank: 90, run: openAccount },
    { id: 'feedback', label: en ? 'Send feedback' : 'إرسال ملاحظة', hint: en ? 'Suggestion or issue' : 'اقتراح أو مشكلة', keywords: 'feedback report issue suggestion ملاحظة اقتراح مشكلة', icon: MessageSquare, rank: 55, run: openFeedback },
    { id: 'install', label: en ? 'Install PathPilot' : 'تثبيت PathPilot', hint: en ? 'Install the app on this device' : 'ثبّت التطبيق على الجهاز', keywords: 'install pwa app download تثبيت تطبيق تنزيل', icon: Download, rank: 60, run: () => { close(); onInstall?.(); } },
    { id: 'guide', label: en ? 'User guide' : 'دليل الاستخدام', hint: en ? 'How to use PathPilot' : 'شرح استخدام التطبيق', keywords: 'guide help tutorial docs دليل مساعدة شرح استخدام', icon: BookOpen, rank: 70, run: () => goToPage(`${base}guide.html`) },
    { id: 'updates', label: en ? 'What’s new' : 'آخر التحديثات', hint: en ? 'Product updates and benefits' : 'الجديد وفايدته للمستخدم', keywords: 'updates changelog new release تحديثات جديد', icon: History, rank: 62, run: () => goToPage(`${base}updates.html`) },
    { id: 'privacy', label: en ? 'Privacy policy' : 'سياسة الخصوصية', hint: en ? 'Privacy and data handling' : 'الخصوصية والتعامل مع البيانات', keywords: 'privacy data security خصوصية بيانات امان', icon: ShieldCheck, rank: 48, run: () => goToPage(`${base}privacy.html`) },
  ];

  Object.entries(TOOL_LIBRARY).forEach(([mode, tools]) => {
    tools.forEach((tool) => {
      const [modeEn, modeAr] = MODE_LABELS[mode] || [mode, mode];
      const englishTool = TOOL_ENGLISH[tool.id];
      actions.push({
        id: `tool-${mode}-${tool.id}`,
        label: en && englishTool ? englishTool[0] : tool.label,
        hint: en ? `${modeEn} · ${englishTool?.[1] || 'PathPilot tool'}` : `${modeAr} · ${tool.description}`,
        keywords: `${TOOL_ALIASES[tool.id] || ''} ${tool.id} ${modeEn} ${modeAr} ${tool.label} ${englishTool?.join(' ') || ''}`,
        icon: mode === 'study' ? GraduationCap : mode === 'work' ? BriefcaseBusiness : Sparkles,
        rank: 75,
        run: () => navigateWorkspace(mode, tool.id),
      });
    });
  });

  history.slice(0, 30).forEach((item, index) => {
    const prompt = String(item?.prompt || '').trim();
    if (!prompt) return;
    actions.push({
      id: `history-${item.id || index}`,
      label: prompt.length > 74 ? `${prompt.slice(0, 74)}…` : prompt,
      hint: en ? 'Recent conversation' : 'من النتائج السابقة',
      keywords: `${prompt} ${item.mode || ''} ${item.tool || ''} history recent سجل نتائج`,
      icon: Clock3,
      rank: 42,
      run: () => navigateWorkspace(item.mode || 'general', item.tool || null, prompt),
    });
  });

  if (isAdmin) {
    [
      ['analytics', 'Analytics', 'الإحصائيات والتحليلات', 'users activity retention analytics احصائيات تحليلات استخدام'],
      ['users', 'Users', 'المستخدمون', 'users accounts roles ban مستخدمين حسابات صلاحيات حظر'],
      ['security', 'Security & Login Log', 'الأمان وسجل الدخول', 'security login sessions suspicious امان دخول جلسات'],
      ['api', 'API Usage', 'استخدام API', 'api usage provider cost tokens استخدام مزود'],
      ['errors', 'Errors', 'الأخطاء', 'errors crashes logs اخطاء مشاكل'],
      ['feedback', 'Feedback', 'ملاحظات المستخدمين', 'feedback ratings users ملاحظات تقييمات'],
    ].forEach(([tab, englishLabel, arabicLabel, keywords]) => actions.push({
      id: `admin-${tab}`,
      label: en ? englishLabel : arabicLabel,
      hint: en ? 'Admin only' : 'للإدارة فقط',
      keywords: `${englishLabel} ${arabicLabel} ${keywords} admin إدارة`,
      icon: ShieldCheck,
      rank: 88,
      run: () => navigateAdmin(tab),
    }));
    if (user?.isOwner) actions.push({
      id: 'admin-owner-log',
      label: en ? 'Owner Account Log' : 'سجل حساب المالك',
      hint: en ? 'Owner only' : 'للمالك فقط',
      keywords: 'owner log account مالك سجل حساب',
      icon: ShieldCheck,
      rank: 89,
      run: () => navigateAdmin('owner-log'),
    });
  }

  const allActions = [...actions, ...pageEntries];
  const filtered = allActions
    .map((action) => ({ action, score: searchScore(action, query) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, query.trim() ? 18 : 10)
    .map(({ action }) => action);

  useEffect(() => {
    const body = document.body;
    if (!body) return undefined;
    const syncLanguage = () => setLanguage(currentLanguage());
    syncLanguage();
    const observer = new MutationObserver((records) => {
      if (records.some((record) => record.attributeName === 'data-language')) syncLanguage();
    });
    observer.observe(body, { attributes: true, attributeFilter: ['data-language'] });
    globalThis.addEventListener('pathpilot:language-changed', syncLanguage);
    return () => {
      observer.disconnect();
      globalThis.removeEventListener('pathpilot:language-changed', syncLanguage);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setPageEntries(collectVisiblePageEntries(close, en));
  }, [en, open]);

  useEffect(() => {
    const handler = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (open) {
          setOpen(false);
          setQuery('');
        } else {
          setPageEntries(collectVisiblePageEntries(() => { setOpen(false); setQuery(''); }, en));
          setOpen(true);
        }
        return;
      }
      if (open && event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        setOpen(false);
        setQuery('');
      }
    };
    globalThis.addEventListener('keydown', handler, true);
    return () => globalThis.removeEventListener('keydown', handler, true);
  }, [en, open]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = globalThis.setTimeout(() => inputRef.current?.focus(), 0);
    return () => globalThis.clearTimeout(timer);
  }, [open]);

  return (
    <>
      <div className="command-dock-spacer" aria-hidden="true" />
      <button className="global-command-trigger" type="button" onClick={openSearch} aria-label={en ? 'Search all PathPilot' : 'البحث في PathPilot بالكامل'}>
        <Search size={15} />
        <span>{en ? 'Search PathPilot, tools, pages…' : 'ابحث في PathPilot، الأدوات، الصفحات…'}</span>
        <kbd>Ctrl K</kbd>
      </button>
      {open && (
        <div className="command-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <section className="command-palette" role="dialog" aria-modal="true" aria-label={en ? 'Search PathPilot' : 'البحث الشامل في PathPilot'}>
            <div className="command-search">
              <Search size={18} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && filtered[0]) {
                    event.preventDefault();
                    filtered[0].run();
                  }
                }}
                placeholder={en ? 'Search pages, tools, settings, history…' : 'دوّر على صفحة، أداة، إعداد، نتيجة سابقة…'}
                aria-label={en ? 'Search all PathPilot' : 'بحث شامل في PathPilot'}
              />
              <button type="button" onClick={close} aria-label={en ? 'Close' : 'إغلاق'}><X size={17} /></button>
            </div>
            <div className="command-list">
              {filtered.length ? filtered.map((action) => {
                const Icon = action.icon;
                return (
                  <button type="button" key={action.id} onClick={action.run}>
                    <span className="command-icon"><Icon size={18} /></span>
                    <span><strong>{action.label}</strong><small>{action.hint}</small></span>
                    <kbd>↵</kbd>
                  </button>
                );
              }) : <p className="command-empty">{en ? 'Nothing matched. Try another word.' : 'ملقتش نتيجة مطابقة. جرّب كلمة تانية.'}</p>}
            </div>
            <footer className="command-footer">
              <span>Ctrl K</span><span>{en ? 'Open / close' : 'فتح / إغلاق'}</span>
              <span>Enter</span><span>{en ? 'Open first result' : 'فتح أول نتيجة'}</span>
              <span>Esc</span><span>{en ? 'Close' : 'إغلاق'}</span>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
