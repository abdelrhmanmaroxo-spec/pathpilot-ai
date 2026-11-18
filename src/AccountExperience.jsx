import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BadgeCheck,
  ChevronDown,
  Crown,
  Headphones,
  KeyRound,
  LogIn,
  LogOut,
  MessageSquare,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  X,
} from 'lucide-react';
import AuthDialog from './AuthDialog.jsx';
import SupportCenterModal from './components/SupportCenterModal.jsx';
import { getDocumentLanguage, subscribeLanguageChanges } from './lib/language-state.js';
import {
  DEFAULT_SUPPORT_EMAIL,
  getCurrentUser,
  getPlatformStatus,
  getSupportEmail,
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

function FeedbackDialog({ open, onClose, en }) {
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  if (!open) return null;

  const submit = async (event) => {
    event.preventDefault();
    if (!rating) {
      setNotice(en ? 'Choose a rating from 1 to 5 stars.' : 'اختار تقييم من 1 إلى 5 نجوم.');
      return;
    }
    if (message.trim().length < 2) {
      setNotice(en ? 'Write your feedback first.' : 'اكتب ملاحظتك الأول.');
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
      setNotice(en ? 'Feedback sent to administration. Thank you!' : 'تم إرسال ملاحظتك للإدارة. شكرًا ✨');
      setMessage('');
      setRating(0);
    } catch (error) {
      setNotice(error.message || (en ? 'Could not send feedback right now.' : 'تعذر إرسال الملاحظة حاليًا.'));
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="account-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="account-panel compact-panel" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
        <button className="account-panel-close" type="button" onClick={onClose} aria-label={en ? 'Close' : 'إغلاق'}><X size={19} /></button>
        <div className="account-panel-icon"><MessageSquare /></div>
        <h2 id="feedback-title">{en ? 'Send Feedback' : 'ابعت ملاحظتك'}</h2>
        <p>{en ? 'Your note goes directly to the Admin Dashboard so we can improve.' : 'الملاحظة بتوصل للوحة الإدارة عشان نعرف إيه اللي محتاج يتحسن.'}</p>
        <form onSubmit={submit} className="feedback-form">
          <div className="feedback-stars" aria-label={en ? 'Rating' : 'التقييم'}>
            {[1, 2, 3, 4, 5].map((value) => (
              <button className={rating >= value ? 'active' : ''} type="button" key={value} onClick={() => setRating(value)} aria-label={`${value} / 5`}>
                <Star size={21} />
              </button>
            ))}
          </div>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder={en ? 'Write a suggestion, issue, or note…' : 'اكتب اقتراح، مشكلة، أو أي ملاحظة…'} maxLength={2000} rows={5} />
          {notice && <div className="account-notice"><BadgeCheck size={16} /> {notice}</div>}
          <button className="button button-primary" type="submit" disabled={busy}>{busy ? (en ? 'Sending…' : 'جاري الإرسال…') : (en ? 'Submit Feedback' : 'إرسال الملاحظة')}</button>
        </form>
      </section>
    </div>,
    document.body,
  );
}

function SettingsDialog({ open, onClose, user, status, onGoogle, onForgotPassword, resetNotice, resetBusy, onFeedback, onOpenSupport, en }) {
  if (!open) return null;
  const supportEmail = getSupportEmail() || DEFAULT_SUPPORT_EMAIL;

  return createPortal(
    <div className="account-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="account-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <button className="account-panel-close" type="button" onClick={onClose} aria-label={en ? 'Close' : 'إغلاق'}><X size={19} /></button>
        <div className="account-panel-heading">
          <div className="account-panel-icon"><Settings /></div>
          <div><span>PATHPILOT ACCOUNT</span><h2 id="settings-title">{en ? 'Settings' : 'الإعدادات'}</h2></div>
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
            <div>
              <strong><Headphones size={17} /> {en ? 'Support Tickets & Messaging' : 'تذاكر الدعم الفني والمراسلة'}</strong>
              <small>{en ? `Open a ticket or message ${supportEmail}` : `افتح تيكت للدعم أو تواصل عبر ${supportEmail}`}</small>
            </div>
            <button className="button button-primary" type="button" onClick={() => { onClose(); onOpenSupport('new'); }}>
              {en ? 'Open Support' : 'فتح الدعم'}
            </button>
          </div>
          {user?.isOwner && (
            <div className="settings-row">
              <div>
                <strong><Sparkles size={17} /> {en ? '100% Free Gmail Mailer Bridge' : 'ربط بريد التطبيق المجاني (بدون Railway)'}</strong>
                <small>{en ? 'Connect pathpilot.app00@gmail.com automatic OTP & Ticket emails' : 'تفعيل الإرسال التلقائي للأكواد والتذاكر من pathpilot.app00@gmail.com مجانًا'}</small>
              </div>
              <button className="button button-ghost" type="button" onClick={() => { onClose(); onOpenSupport('cloud'); }}>
                {en ? 'Configure' : 'ضبط الربط'}
              </button>
            </div>
          )}
          <div className="settings-row">
            <div><strong><span className="google-g small">G</span> {en ? 'Sign in with Google' : 'تسجيل الدخول بحساب Google'}</strong><small>{status?.googleAuthAvailable ? (en ? 'Google Sign-In is ready.' : 'Google Sign-In جاهز على PathPilot.') : (en ? 'Use email + 6-digit verification code for free.' : 'متاح التسجيل المجاني بالبريد وكود التفعيل السداسي.')}</small></div>
            <button className="button button-ghost" type="button" onClick={onGoogle} disabled={!status?.googleAuthAvailable}>{user ? (en ? 'Switch' : 'تبديل / متابعة') : (en ? 'Continue' : 'متابعة')}</button>
          </div>
          {user?.email && (
            <div className="settings-row">
              <div><strong><KeyRound size={17} /> {en ? 'Forgot password?' : 'نسيت كلمة المرور؟'}</strong><small>{en ? 'Send a reset code to your registered email.' : 'هنبعت كود إعادة تعيين على البريد المسجل.'}</small></div>
              <button className="button button-ghost" type="button" onClick={onForgotPassword} disabled={resetBusy}>{resetBusy ? (en ? 'Sending…' : 'جاري الإرسال…') : (en ? 'Send Code' : 'إرسال الكود')}</button>
            </div>
          )}
          <div className="settings-row">
            <div><strong><MessageSquare size={17} /> {en ? 'Quick Feedback' : 'الملاحظات'}</strong><small>{en ? 'Send a quick rating or suggestion.' : 'اقتراح أو ملاحظة سريعة للوحة الإدارة.'}</small></div>
            <button className="button button-ghost" type="button" onClick={onFeedback}>{en ? 'Send Feedback' : 'إرسال ملاحظة'}</button>
          </div>
        </div>
        {resetNotice && <div className="account-notice"><BadgeCheck size={16} /> {resetNotice}</div>}
      </section>
    </div>,
    document.body,
  );
}

export default function AccountExperience() {
  const [uiLanguage, setUiLanguage] = useState(() => getDocumentLanguage());
  const en = uiLanguage === 'en';
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportTab, setSupportTab] = useState('new');
  const [authOpen, setAuthOpen] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetNotice, setResetNotice] = useState('');
  const [targets, setTargets] = useState({ header: null, hero: null });

  useEffect(() => subscribeLanguageChanges(setUiLanguage), []);

  useEffect(() => {
    const onOpenSupportEvent = (event) => {
      const requestedTab = event?.detail?.tab || 'new';
      setSupportTab(requestedTab);
      setSupportOpen(true);
    };
    const onOpenAuthEvent = () => setAuthOpen(true);
    window.addEventListener('pathpilot:open-support', onOpenSupportEvent);
    window.addEventListener('pathpilot:open-auth', onOpenAuthEvent);
    return () => {
      window.removeEventListener('pathpilot:open-support', onOpenSupportEvent);
      window.removeEventListener('pathpilot:open-auth', onOpenAuthEvent);
    };
  }, []);

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

  const openSupport = (initialTab = 'new') => {
    setMenuOpen(false);
    setSupportTab(initialTab);
    setSupportOpen(true);
  };

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
      setResetNotice(en ? 'Reset code sent! Use Forgot Password in Sign In to apply it.' : 'تم إصدار كود الاستعادة! افتح نسيت كلمة المرور لإدخاله.');
    } catch (error) {
      setResetNotice(error.message || (en ? 'Could not send reset code.' : 'تعذر إرسال كود إعادة التعيين.'));
    } finally {
      setResetBusy(false);
    }
  };

  const openGoogle = () => {
    if (!status?.googleAuthAvailable) {
      setResetNotice(en ? 'Google Sign-In requires GOOGLE_CLIENT_ID.' : 'Google Sign-In يحتاج إعداد GOOGLE_CLIENT_ID أولًا.');
      return;
    }
    setSettingsOpen(false);
    setMenuOpen(false);
    setAuthOpen(true);
  };

  const headerPortal = targets.header ? createPortal(
    <>
      <button
        className="support-header-button"
        type="button"
        onClick={() => openSupport(user?.isOwner ? 'admin' : 'new')}
        title={en ? 'Support & Tickets' : 'الدعم الفني وفتح تيكت'}
      >
        <Headphones size={15} />
        <span>{en ? 'Support' : 'الدعم'}</span>
      </button>
      <button className="feedback-header-button" type="button" onClick={() => setFeedbackOpen(true)} title={en ? 'Send feedback' : 'إرسال ملاحظة'} aria-label={en ? 'Send feedback' : 'إرسال ملاحظة'}>
        <MessageSquare size={16} />
      </button>
      {!user ? (
        <button className="account-center-login" type="button" onClick={() => setAuthOpen(true)}><LogIn size={16} /> {en ? 'Sign In' : 'دخول'}</button>
      ) : (
        <div className="account-center-slot">
          <button className="account-center-trigger" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen}>
            <UserRound size={16} />
            <span>{user.name?.split(' ')[0] || (en ? 'Account' : 'حسابي')}</span>
            <ChevronDown size={14} />
          </button>
          {menuOpen && (
            <div className="account-menu">
              <div className="account-menu-profile">
                <span className="account-avatar"><UserRound /></span>
                <div><strong>{user.name}</strong><small>{user.email}</small></div>
                <span className="account-role">{roleLabel(user)}</span>
              </div>
              {(user.role === 'admin' || user.isOwner) && (
                <button type="button" onClick={() => { setMenuOpen(false); window.location.hash = '#/admin'; }}>
                  <Crown size={17} />
                  <span><strong>{en ? 'Owner & Admin Panel' : 'لوحة المالك والإدارة'}</strong><small>{en ? 'Manage users & support tickets' : 'إدارة المستخدمين وتذاكر الدعم'}</small></span>
                </button>
              )}
              <button type="button" onClick={() => openSupport(user.isOwner ? 'admin' : 'new')}>
                <Headphones size={17} />
                <span><strong>{en ? 'Support & Tickets' : 'الدعم الفني وتذاكر المساعدة'}</strong><small>{en ? 'Open a ticket or view replies' : 'فتح تيكت أو متابعة المحادثات'}</small></span>
              </button>
              <button type="button" onClick={() => { setMenuOpen(false); setSettingsOpen(true); }}><Settings size={17} /><span><strong>{en ? 'Settings' : 'الإعدادات'}</strong><small>{en ? 'Account, Free Mail & Security' : 'الحساب والبريد المجاني والأمان'}</small></span></button>
              <button type="button" onClick={handleSwitchAccount}><RefreshCcw size={17} /><span><strong>{en ? 'Switch Account' : 'تبديل الحساب'}</strong><small>{en ? 'Sign in with another email' : 'سجّل بحساب مختلف'}</small></span></button>
              <button type="button" onClick={() => { setMenuOpen(false); setFeedbackOpen(true); }}><MessageSquare size={17} /><span><strong>{en ? 'Send Feedback' : 'إرسال ملاحظة'}</strong><small>{en ? 'Suggestion or quick rating' : 'اقتراح أو تقييم سريع'}</small></span></button>
              <div className="account-menu-separator" />
              <button className="danger" type="button" onClick={handleLogout}><LogOut size={17} /><span><strong>{en ? 'Sign Out' : 'تسجيل الخروج'}</strong><small>{en ? 'End current session' : 'إنهاء الجلسة الحالية'}</small></span></button>
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
      {en ? 'Continue with Google' : 'متابعة باستخدام Google'}
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
        onOpenSupport={openSupport}
        en={en}
      />
      <SupportCenterModal
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        user={user}
        initialTab={supportTab}
      />
      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} en={en} />
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} onAuthenticated={handleAuthenticated} />
    </>
  );
}
