import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, BriefcaseBusiness, GraduationCap, History, Search, Sparkles, TextCursorInput, X } from 'lucide-react';

function isEnglish() {
  return document.body?.dataset?.language === 'en';
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const en = isEnglish();
  const base = import.meta.env.BASE_URL || '/';

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const navigateWorkspace = (mode) => {
    window.location.hash = `/${mode}`;
    close();
    window.setTimeout(() => document.querySelector('#assistant-prompt')?.focus(), 90);
  };

  const actions = useMemo(() => [
    { id: 'general', label: en ? 'Ask PathPilot anything' : 'اسأل PathPilot أي حاجة', hint: en ? 'General assistant' : 'المساعد العام', icon: Sparkles, run: () => navigateWorkspace('general') },
    { id: 'study', label: en ? 'Open Study workspace' : 'افتح مساحة الدراسة', hint: en ? 'Explain, summarize, quiz, plan' : 'شرح، تلخيص، اختبار وخطة', icon: GraduationCap, run: () => navigateWorkspace('study') },
    { id: 'work', label: en ? 'Open Work workspace' : 'افتح مساحة العمل', hint: en ? 'Email, CV, QA, tasks' : 'Email، CV، QA ومهام', icon: BriefcaseBusiness, run: () => navigateWorkspace('work') },
    { id: 'focus', label: en ? 'Focus the current prompt' : 'روح لمربع السؤال الحالي', hint: en ? 'Continue typing' : 'كمّل كتابة طلبك', icon: TextCursorInput, run: () => { close(); window.setTimeout(() => document.querySelector('#assistant-prompt')?.focus(), 0); } },
    { id: 'guide', label: en ? 'Open user guide' : 'افتح دليل الاستخدام', hint: en ? 'How to use PathPilot' : 'طريقة استخدام PathPilot', icon: BookOpen, run: () => { window.location.href = `${base}guide.html`; } },
    { id: 'updates', label: en ? 'See what’s new' : 'شوف آخر التحديثات', hint: en ? 'Product changelog' : 'الجديد وفايدته للمستخدم', icon: History, run: () => { window.location.href = `${base}updates.html`; } },
  ], [base, en]);

  const filtered = actions.filter((action) => `${action.label} ${action.hint}`.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    const handler = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        event.stopImmediatePropagation();
        setOpen((current) => !current);
        return;
      }
      if (open && event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <>
      <button className="global-command-trigger" type="button" onClick={() => setOpen(true)} aria-label={en ? 'Open command palette' : 'فتح لوحة الأوامر'}>
        <Search size={15} />
        <span>{en ? 'Ask PathPilot or jump anywhere…' : 'اسأل PathPilot أو روح لأي مكان…'}</span>
        <kbd>Ctrl K</kbd>
      </button>
      {open && (
        <div className="command-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <section className="command-palette" role="dialog" aria-modal="true" aria-label={en ? 'PathPilot command palette' : 'لوحة أوامر PathPilot'}>
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
                placeholder={en ? 'Search actions…' : 'دوّر على أمر…'}
                aria-label={en ? 'Search commands' : 'بحث في الأوامر'}
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
              }) : <p className="command-empty">{en ? 'No matching actions.' : 'مفيش أمر مطابق.'}</p>}
            </div>
            <footer className="command-footer"><span>Ctrl K</span><span>{en ? 'Open / close' : 'فتح / إغلاق'}</span><span>Esc</span><span>{en ? 'Close' : 'إغلاق'}</span></footer>
          </section>
        </div>
      )}
    </>
  );
}
