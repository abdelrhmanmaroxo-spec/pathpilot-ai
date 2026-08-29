import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BadgeCheck,
  ChevronDown,
  KeyRound,
  LogIn,
  LogOut,
  MessageSquare,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Star,
  UserRound,
  X,
} from 'lucide-react';
import AuthDialog from './AuthDialog.jsx';
import {
  getCurrentUser,
  getPlatformStatus,
  hasPlatformBackend,
  logoutAccount,
  requestPasswordReset,
  sendFeedback,
} from './lib/platform.js';

function currentWorkspace() {
  const route = window.location.hash.replace('#/', '').replace('#', '');
  return ['general', 'study', 'work'].includes(route) ? route : 'general';
}

function roleLabel(user) {
  if (user?.isOwner) return 'Owner';
  if (user?.role === 'admin') return 'Admin';
  return 'User';
}

function FeedbackDialog({ open, onClose }) {
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  if (!open) return null;

  const submit = async (event) => {
    event.preventDefault();
    if (!rating) {
      setNotice('اختار تقييم من 1 إلى 5 نجوم.');
      return;
    }
    if (message.trim().length < 2) {
      setNotice('اكتب ملاحظتك الأول.');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      await sendFeedback({
        rating,
        message: message.trim(),
        workspace: currentWorkspace(),
        tool: 'account-feedback',
      });
      setNotice('تم إرسال ملاحظتك للإدارة. شكرًا ✨');
      setMessage('');
      setRating(0);
    } catch (error) {
      setNotice(error.message || 'تعذر إرسال الملاحظة حاليًا.');
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="account-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="account-panel compact-panel" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
        <button className="account-panel-close" type="button" onClick={onClose} aria-label="إغلاق"><X size={19} /></button>
        <div className="account-panel-icon"><MessageSquare /></div>
        <h2 id="feedback-title">ابعت ملاحظتك</h2>
        <p>الملاحظة بتوصل للوحة الإدارة عشان نعرف إيه اللي محتاج يتحسن.</p>
        <form onSubmit={submit} className="feedback-form">
          <div className="feedback-stars" aria-label="التقييم">
            {[1, 2, 3, 4, 5].map((value) => (
              <button className={rating >= value ? 'active' : ''} type="button" key={value} onClick={() => setRating(value)} aria-label={`${value} من 5`}>
                <Star size={21} />
              </button>
            ))}
          </div>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="اكتب اقتراح، مشكلة، أو أي ملاحظة…" maxLength={2000} rows={5} />
          {notice && <div className="account-notice"><BadgeCheck size={16} /> {notice}</div>}
          <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'جاري الإرسال…' : 'إرسال الملاحظة'}</button>
        </form>
      </section>
    </div>,
    document.body,
  );
}

function SettingsDialog({ open, onClose, user, status, onGoogle, onForgotPassword, resetNotice, resetBusy, onFeedback }) {
  if (!open) return null;

  return createPortal(
    <div className="account-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="account-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <button className="account-panel-close" type="button" onClick={onClose} aria-label="إغلاق"><X size={19} /></button>
        <div className="account-panel-heading">
          <div className="account-panel-icon"><Settings /></div>
          <div><span>PATHPILOT ACCOUNT</span><h2 id="settings-title">الإعدادات</h2></div>
        </div>

        {user && (
          <div className="account-profile-card">
            <span className="account-avatar"><UserRound /></span>
            <div><strong>{user.name}</strong><small>{user.email}</small></div>
            <span className="account-role"><ShieldCheck size={14} /> {roleLabel(user)}</span>
          </div>
        )}

        <div className="settings-list">
          <div className="settings-row">
            <div><strong><span className="google-g small">G</span> تسجيل الدخول بحساب Google</strong><small>{status?.googleAuthAvailable ? 'Google Sign-In جاهز على PathPilot.' : 'Google Sign-In يحتاج إعداد Google Client ID أولًا.'}</small></div>
            <button className="button button-ghost" type="button" onClick={onGoogle} disabled={!status?.googleAuthAvailable}>{user ? 'تبديل / متابعة' : 'متابعة'}</button>
          </div>
          {user?.email && (
            <div className="settings-row">
              <div><strong><KeyRound size={17} /> نسيت كلمة المرور؟</strong><small>هنبعت رابط إعادة تعيين على البريد المسجل.</small></div>
              <button className="button button-ghost" type="button" onClick={onForgotPassword} disabled={resetBusy}>{resetBusy ? 'جاري الإرسال…' : 'إرسال الرابط'}</button>
            </div>
          )}
          <div className="settings-row">
            <div><strong><MessageSquare size={17} /> الملاحظات</strong><small>اقتراح أو مشكلة تتبعت مباشرة للوحة الإدارة.</small></div>
            <button className="button button-ghost" type="button" onClick={onFeedback}>إرسال ملاحظة</button>
          </div>
        </div>
        {resetNotice && <div className="account-notice"><BadgeCheck size={16} /> {resetNotice}</div>}
      </section>
    </div>,
    document.body,
  );
}

export default function AccountExperience() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetNotice, setResetNotice] = useState('');
  const [targets, setTargets] = useState({ header: null, hero: null });

  useEffect(() => {
    if (!hasPlatformBackend) return undefined;
    let active = true;
    Promise.all([
      getCurrentUser(),
      getPlatformStatus().catch(() => null),
    ]).then(([currentUser, platformStatus]) => {
      if (!active) return;
      setUser(currentUser);
      setStatus(platformStatus);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;
    const syncTargets = () => {
      const header = document.querySelector('.header-actions');
      const hero = document.querySelector('.hero-actions');
      setTargets((previous) => (previous.header === header && previous.hero === hero ? previous : { header, hero }));
    };
    syncTargets();
    const observer = new MutationObserver(syncTargets);
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener('hashchange', syncTargets);
    return () => {
      observer.disconnect();
      window.removeEventListener('hashchange', syncTargets);
    };
  }, []);

  if (!hasPlatformBackend) return null;

  const handleLogout = async () => {
    setMenuOpen(false);
    await logoutAccount();
    window.location.hash = '';
    window.location.reload();
  };

  const handleSwitchAccount = async () => {
    setMenuOpen(false);
    setSettingsOpen(false);
    await logoutAccount();
    setUser(null);
    setAuthOpen(true);
  };

  const handleAuthenticated = (authenticatedUser) => {
    setUser(authenticatedUser);
    window.setTimeout(() => window.location.reload(), 80);
  };

  const handleForgotPassword = async () => {
    if (!user?.email) return;
    setResetBusy(true);
    setResetNotice('');
    try {
      await requestPasswordReset(user.email);
      setResetNotice('لو الحساب مؤهل، اتبعت رابط إعادة تعيين للبريد. راجع Inbox وSpam.');
    } catch (error) {
      setResetNotice(error.message || 'تعذر إرسال رابط إعادة التعيين.');
    } finally {
      setResetBusy(false);
    }
  };

  const openGoogle = () => {
    if (!status?.googleAuthAvailable) {
      setResetNotice('Google Sign-In لسه محتاج GOOGLE_CLIENT_ID في إعدادات السيرفر.');
      return;
    }
    setSettingsOpen(false);
    setMenuOpen(false);
    setAuthOpen(true);
  };

  const headerPortal = targets.header ? createPortal(
    <>
      <button className="feedback-header-button" type="button" onClick={() => setFeedbackOpen(true)} title="إرسال ملاحظة" aria-label="إرسال ملاحظة">
        <MessageSquare size={16} />
      </button>
      {!user ? (
        <button className="account-center-login" type="button" onClick={() => setAuthOpen(true)}><LogIn size={16} /> دخول</button>
      ) : (
        <div className="account-center-slot">
          <button className="account-center-trigger" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen}>
            <UserRound size={16} />
            <span>{user.name?.split(' ')[0] || 'حسابي'}</span>
            <ChevronDown size={14} />
          </button>
          {menuOpen && (
            <div className="account-menu">
              <div className="account-menu-profile">
                <span className="account-avatar"><UserRound /></span>
                <div><strong>{user.name}</strong><small>{user.email}</small></div>
                <span className="account-role">{roleLabel(user)}</span>
              </div>
              <button type="button" onClick={() => { setMenuOpen(false); setSettingsOpen(true); }}><Settings size={17} /><span><strong>الإعدادات</strong><small>الحساب وGoogle والأمان</small></span></button>
              <button type="button" onClick={handleSwitchAccount}><RefreshCcw size={17} /><span><strong>تبديل الحساب</strong><small>سجّل بحساب مختلف</small></span></button>
              <button type="button" onClick={() => { setMenuOpen(false); setSettingsOpen(true); window.setTimeout(handleForgotPassword, 0); }}><KeyRound size={17} /><span><strong>نسيت كلمة المرور؟</strong><small>إرسال رابط للبريد</small></span></button>
              <button type="button" onClick={() => { setMenuOpen(false); setFeedbackOpen(true); }}><MessageSquare size={17} /><span><strong>إرسال ملاحظة</strong><small>اقتراح أو مشكلة</small></span></button>
              <div className="account-menu-separator" />
              <button className="danger" type="button" onClick={handleLogout}><LogOut size={17} /><span><strong>تسجيل الخروج</strong><small>إنهاء الجلسة الحالية</small></span></button>
            </div>
          )}
        </div>
      )}
    </>,
    targets.header,
  ) : null;

  const googleHeroPortal = !user && status?.googleAuthAvailable && targets.hero ? createPortal(
    <button className="google-continue-button" type="button" onClick={() => setAuthOpen(true)}>
      <span className="google-g">G</span>
      متابعة باستخدام Google
    </button>,
    targets.hero,
  ) : null;

  return (
    <>
      {headerPortal}
      {googleHeroPortal}
      <SettingsDialog
        open={settingsOpen}
        onClose={() => { setSettingsOpen(false); setResetNotice(''); }}
        user={user}
        status={status}
        onGoogle={openGoogle}
        onForgotPassword={handleForgotPassword}
        resetNotice={resetNotice}
        resetBusy={resetBusy}
        onFeedback={() => { setSettingsOpen(false); setFeedbackOpen(true); }}
      />
      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} onAuthenticated={handleAuthenticated} />
    </>
  );
}
