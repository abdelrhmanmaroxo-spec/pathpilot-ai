import { useState } from 'react';
import {
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  Check,
  Code2,
  Download,
  GraduationCap,
  History,
  Home,
  Link,
  LogIn,
  LogOut,
  Menu,
  MessageSquareText,
  MonitorSmartphone,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserRound,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { hasPlatformBackend } from '../lib/platform.js';

export function Brand({ compact = false }) {
  return (
    <button className="brand" type="button" onClick={() => { window.location.hash = ''; }} aria-label="العودة للرئيسية">
      <span className="brand-mark" aria-hidden="true">P</span>
      <span>
        <strong>PathPilot <small>BETA</small></strong>
        {!compact && <small>AI STUDY & WORK</small>}
      </span>
    </button>
  );
}

export function Header({ mode, onInstall, installed, online, user, onAccount, onLogout }) {
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
          <button className={mode === 'chat' ? 'active' : ''} type="button" onClick={() => navigate('chat')}><MessageSquareText size={16} /> Chat</button>
          <button className={mode === 'general' ? 'active' : ''} type="button" onClick={() => navigate('general')}><Sparkles size={16} /> المساعد العام</button>
          <button className={mode === 'study' ? 'active' : ''} type="button" onClick={() => navigate('study')}><GraduationCap size={16} /> الدراسة</button>
          <button className={mode === 'work' ? 'active' : ''} type="button" onClick={() => navigate('work')}><BriefcaseBusiness size={16} /> العمل</button>
          {user?.role === 'admin' && <button className={mode === 'admin' ? 'active' : ''} type="button" onClick={() => navigate('admin')}><ShieldCheck size={16} /> الإدارة</button>}
        </nav>
        <div className="header-actions">
          <span className={online ? 'status-dot online' : 'status-dot offline'} title={online ? 'متصل' : 'يعمل Offline'}>
            {online ? <Wifi size={15} /> : <WifiOff size={15} />}
          </span>
          {!installed && <button className="button button-ghost install-button" type="button" onClick={onInstall}><Smartphone size={17} /> تثبيت</button>}
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

export function InstallDialog({ open, onClose, onInstall, canInstall, installed }) {
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
          <ol className="install-steps">{instructions.map((step) => <li key={step}>{step}</li>)}</ol>
        )}
        <div className="platform-row" aria-label="الأنظمة المدعومة"><span>Windows</span><span>Android</span><span>iPhone & iPad</span></div>
      </section>
    </div>
  );
}

export function Footer() {
  const base = import.meta.env.BASE_URL || '/';
  return (
    <footer className="site-footer">
      <div className="page-shell footer-inner">
        <div>
          <Brand />
          <p>مساعد عربي عام للدراسة والعمل والحياة اليومية، بطبقات AI حي ومحلي وموسوعة معرفية.</p>
          <small className="built-by">Built by Abdelrhman Essam</small>
          <small className="security-privacy-notice">للأمان ومنع إساءة الاستخدام: قد يُسجّل عنوان IP وبيانات الجهاز الأساسية لمدة محدودة. لا يتم جمع GPS أو كلمات السر.</small>
        </div>
        <div className="footer-meta">
          <span>PathPilot BETA</span>
          <a href={`${base}updates.html`}><History size={18} /> آخر التحديثات</a>
          <a href={`${base}guide.html`}><BookOpen size={18} /> دليل الاستخدام</a>
          <a href="https://github.com/abdelrhmanmaroxo-spec" target="_blank" rel="noreferrer"><Code2 size={18} /> GitHub</a>
          <a href="https://www.linkedin.com/in/abdelrhman-essam-vib/" target="_blank" rel="noreferrer"><Link size={18} /> LinkedIn</a>
        </div>
      </div>
    </footer>
  );
}
