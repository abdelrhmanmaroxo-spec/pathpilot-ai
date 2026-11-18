import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, KeyRound, Lock, LogIn, MailCheck, ShieldCheck, UserPlus, X } from 'lucide-react';
import { getDocumentLanguage, subscribeLanguageChanges } from './lib/language-state.js';
import {
  DEFAULT_SUPPORT_EMAIL,
  getPlatformStatus,
  getSupportEmail,
  loginAccount,
  loginWithGoogleCredential,
  registerAccount,
  requestPasswordReset,
  resendVerification,
  resetPasswordWithOtpCode,
  shortIdentityFingerprint,
  verifyAccountEmailCode,
} from './lib/platform.js';

let googleScriptPromise;

function loadGoogleScript() {
  if (globalThis.google?.accounts?.id) return Promise.resolve(globalThis.google);
  if (googleScriptPromise) return googleScriptPromise;
  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-pathpilot-google]');
    if (existing) {
      existing.addEventListener('load', () => resolve(globalThis.google), { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.pathpilotGoogle = 'true';
    script.onload = () => resolve(globalThis.google);
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return googleScriptPromise;
}

export function DirectDbAuthOption({ onAuthenticate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const handleDirectDbAuth = () => {
    if (email && password && onAuthenticate) {
      onAuthenticate({ email, directDb: true });
    }
  };
  return (
    <div className="direct-db-auth-option">
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Direct DB Email" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
      <button type="button" onClick={handleDirectDbAuth}>Direct DB Login</button>
    </div>
  );
}

export default function AuthDialog({ open, onClose, onAuthenticated }) {
  const [uiLanguage, setUiLanguage] = useState(() => getDocumentLanguage());
  const en = uiLanguage === 'en';
  const supportEmail = getSupportEmail() || DEFAULT_SUPPORT_EMAIL;

  const [view, setView] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [otpCode, setOtpCode] = useState('');
  const [instantOtpHint, setInstantOtpHint] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetCompleted, setResetCompleted] = useState(false);
  const [accountMissingOffer, setAccountMissingOffer] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationPending, setVerificationPending] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState('');
  const [resent, setResent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const googleButtonRef = useRef(null);

  useEffect(() => subscribeLanguageChanges(setUiLanguage), []);

  const resetVerificationState = useCallback(() => {
    setVerificationEmail('');
    setVerificationPending(false);
    setDeliveryMode('');
    setOtpCode('');
    setInstantOtpHint('');
    setResent(false);
    setAccountMissingOffer(false);
  }, []);

  const closeDialog = useCallback(() => {
    resetVerificationState();
    setResetSent(false);
    setResetCode('');
    setNewPassword('');
    setResetCompleted(false);
    setError('');
    setLoading(false);
    setView('login');
    onClose();
  }, [onClose, resetVerificationState]);

  useEffect(() => {
    if (!open || view === 'forgot') return undefined;
    let active = true;
    getPlatformStatus()
      .then(async (status) => {
        if (!active || !status.googleAuthAvailable || !status.googleClientId) return;
        const google = await loadGoogleScript();
        if (!active || !googleButtonRef.current) return;
        google.accounts.id.initialize({
          client_id: status.googleClientId,
          callback: async ({ credential }) => {
            if (!credential || !active) return;
            setLoading(true);
            setError('');
            try {
              const user = await loginWithGoogleCredential(credential);
              if (!active) return;
              onAuthenticated(user);
              closeDialog();
            } catch (requestError) {
              if (active) setError(requestError.message);
            } finally {
              if (active) setLoading(false);
            }
          },
        });
        googleButtonRef.current.replaceChildren();
        google.accounts.id.renderButton(googleButtonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: view === 'register' ? 'signup_with' : 'signin_with',
          width: 320,
        });
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [open, view, onAuthenticated, closeDialog]);

  if (!open) return null;

  const liveFingerprint = shortIdentityFingerprint(form.email || verificationEmail);

  const quickCreateFromLogin = async () => {
    setLoading(true);
    setError('');
    setAccountMissingOffer(false);
    try {
      const fallbackName = (form.name || form.email.split('@')[0] || 'User').slice(0, 60);
      const result = await registerAccount({
        name: fallbackName.length >= 2 ? fallbackName : `${fallbackName} User`,
        email: form.email,
        password: form.password,
      });
      if (result.requiresVerification) {
        setVerificationEmail(result.email || form.email);
        setVerificationPending(Boolean(result.deliveryPending));
        setDeliveryMode(result.deliveryMode || '');
        setInstantOtpHint(result.instantOtpCode || '');
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResent(false);
    setAccountMissingOffer(false);
    try {
      if (view === 'register') {
        const result = await registerAccount(form);
        if (result.requiresVerification) {
          setVerificationEmail(result.email || form.email);
          setVerificationPending(Boolean(result.deliveryPending));
          setDeliveryMode(result.deliveryMode || '');
          setInstantOtpHint(result.instantOtpCode || '');
          return;
        }
      } else {
        const user = await loginAccount(form);
        onAuthenticated(user);
        closeDialog();
      }
    } catch (requestError) {
      if (requestError.code === 'EMAIL_NOT_VERIFIED') {
        setVerificationEmail(form.email);
        setVerificationPending(false);
        setDeliveryMode('');
      } else if (requestError.code === 'ACCOUNT_NOT_FOUND') {
        setAccountMissingOffer(true);
        setError(requestError.message);
      } else {
        setError(requestError.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const submitOtpVerification = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await verifyAccountEmailCode({ email: verificationEmail, code: otpCode });
      if (result.user) {
        onAuthenticated(result.user);
        closeDialog();
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setLoading(true);
    setError('');
    setResent(false);
    try {
      const result = await resendVerification(verificationEmail);
      setVerificationPending(Boolean(result.deliveryPending));
      setDeliveryMode(result.deliveryMode || deliveryMode);
      setInstantOtpHint(result.instantOtpCode || '');
      setResent(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResetSent(false);
    setResetCompleted(false);
    try {
      const result = await requestPasswordReset(form.email);
      setInstantOtpHint(result?.instantOtpCode || '');
      setResetSent(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const completeOtpPasswordReset = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await resetPasswordWithOtpCode({
        email: form.email,
        code: resetCode,
        newPassword,
      });
      if (result?.user) {
        onAuthenticated(result.user);
        closeDialog();
        return;
      }
      setResetCompleted(true);
      setResetSent(false);
      setInstantOtpHint('');
      setView('login');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
      <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="dialog-close" type="button" onClick={closeDialog} aria-label={en ? 'Close' : 'إغلاق'}><X size={20} /></button>

        <div className="crypto-shield-bar" title="PBKDF2-HMAC-SHA256 (100,000 Iterations) + Sealed Vault">
          <Lock size={14} />
          <span>{en ? 'SHA-256 + PBKDF2 Encrypted Vault' : 'خلاط التشفير SHA-256 + PBKDF2 نشط'}</span>
          <code>{liveFingerprint}</code>
        </div>

        {verificationEmail ? (
          <div style={{ textAlign: 'center', padding: '12px 6px 8px' }}>
            <MailCheck size={44} style={{ margin: '0 auto 10px' }} />
            <h2 id="auth-title">{en ? 'Verify your email with the 6-digit code' : 'تفعيل الحساب بكود البريد الإلكتروني'}</h2>
            <p>
              {en ? 'We dispatched a 6-digit code from' : 'أرسلنا كود تفعيل من 6 أرقام عبر'}
              {' '}
              <strong>{supportEmail}</strong>
              {' '}
              {en ? 'to' : 'إلى'}
              {' '}
              <strong>{verificationEmail}</strong>.
            </p>

            {verificationPending && instantOtpHint ? (
              <div className="auth-error" style={{ borderColor: 'rgba(99,102,241,.55)', textAlign: 'start' }}>
                <ShieldCheck size={18} />
                <div>
                  <div>{en ? 'Fallback Activation Code (if Gmail bridge URL is not set in Owner settings yet):' : 'كود التفعيل الاحتياطي (يظهر فقط لو لم يتم لصق رابط سكربت الجيميل بعد):'}</div>
                  <strong style={{ fontSize: 22, letterSpacing: 6, display: 'inline-block', marginTop: 4 }}>{instantOtpHint}</strong>
                </div>
              </div>
            ) : (
              <div className="auth-error" style={{ borderColor: 'rgba(34,197,94,.45)' }}>
                <CheckCircle2 size={17} />
                <span>
                  {en
                    ? `Code sent to your email! Check Inbox or Spam for PathPilot Support (${supportEmail}) and enter the 6 digits below.`
                    : `تم إرسال الكود لبريدك! افتح البريد الوارد أو Spam وابحث عن PathPilot Support (${supportEmail}) ثم اكتب الـ 6 أرقام بالأسفل.`}
                </span>
              </div>
            )}

            <form onSubmit={submitOtpVerification} style={{ marginTop: 14, textAlign: 'start' }}>
              <label>
                <span>{en ? '6-Digit Verification Code' : 'كود التفعيل (6 أرقام)'}</span>
                <input
                  required
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  style={{ textAlign: 'center', fontSize: '1.35rem', letterSpacing: '0.45em', fontWeight: 800 }}
                />
              </label>
              {resent && <div className="auth-error" style={{ borderColor: 'rgba(34,197,94,.45)' }}><CheckCircle2 size={17} /> {en ? 'A fresh 6-digit code was sent to your email!' : 'تم إرسال كود تفعيل جديد مكون من 6 أرقام إلى بريدك!'}</div>}
              {error && <div className="auth-error">{error}</div>}
              <button className="button button-primary" type="submit" disabled={loading || otpCode.length !== 6}>
                <CheckCircle2 size={18} /> {loading ? (en ? 'Verifying…' : 'جاري التفعيل…') : (en ? 'Verify & Sign In Now' : 'تأكيد الكود والدخول فورًا')}
              </button>
            </form>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 10 }}>
              <button className="button button-ghost" type="button" onClick={resend} disabled={loading}>
                <MailCheck size={16} /> {en ? 'Resend Code' : 'إعادة إرسال الكود'}
              </button>
              <button className="button button-ghost" type="button" onClick={() => { resetVerificationState(); setView('login'); setError(''); }}>
                {en ? 'Back to Sign In' : 'العودة لتسجيل الدخول'}
              </button>
            </div>
          </div>
        ) : view === 'forgot' ? (
          <div style={{ paddingTop: 10 }}>
            <KeyRound size={40} style={{ marginBottom: 8 }} />
            <h2 id="auth-title">{en ? 'Recover or Activate via Email Code' : 'استعادة الحساب وتعيين كلمة المرور بالكود'}</h2>
            <p>{en ? 'Enter your email to receive an encrypted 6-digit code immediately from PathPilot Support.' : 'اكتب بريدك الإلكتروني وهنبعتلك كود من 6 أرقام فورًا من بريد المنصة لتعيين كلمة المرور والدخول مباشرة.'}</p>

            {!resetSent ? (
              <form onSubmit={forgotPassword}>
                <label><span>{en ? 'Email Address' : 'البريد الإلكتروني'}</span><input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" /></label>
                {resetCompleted && <div className="auth-error" style={{ borderColor: 'rgba(34,197,94,.45)' }}><CheckCircle2 size={17} /> {en ? 'Password updated! You can sign in now.' : 'تم تحديث كلمة المرور المشفرة! يمكنك الدخول الآن.'}</div>}
                {error && <div className="auth-error">{error}</div>}
                <button className="button button-primary" type="submit" disabled={loading}><MailCheck size={18} /> {loading ? (en ? 'Sending…' : 'جاري الإرسال…') : (en ? 'Send 6-Digit Code to Email' : 'إرسال كود الـ 6 أرقام للبريد')}</button>
                <button className="button button-ghost" type="button" style={{ marginTop: 10 }} onClick={() => { setView('login'); setResetSent(false); setError(''); }}>{en ? 'Back to Sign In' : 'العودة لتسجيل الدخول'}</button>
              </form>
            ) : (
              <form onSubmit={completeOtpPasswordReset}>
                {instantOtpHint ? (
                  <div className="auth-error" style={{ borderColor: 'rgba(99,102,241,.55)' }}>
                    <ShieldCheck size={17} />
                    <span>{en ? 'Recovery Code:' : 'كود الاستعادة الاحتياطي:'} <strong>{instantOtpHint}</strong></span>
                  </div>
                ) : (
                  <div className="auth-error" style={{ borderColor: 'rgba(34,197,94,.45)' }}>
                    <CheckCircle2 size={17} />
                    <span>{en ? `6-digit code sent to ${form.email}! Check Inbox or Spam.` : `تم إرسال الكود المكون من 6 أرقام إلى ${form.email}! راجع البريد الوارد أو Spam.`}</span>
                  </div>
                )}
                <label>
                  <span>{en ? '6-Digit Email Code' : 'كود البريد (6 أرقام)'}</span>
                  <input required inputMode="numeric" maxLength={6} value={resetCode} onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.4em', fontWeight: 800 }} />
                </label>
                <label>
                  <span>{en ? 'New Password (8+ chars, PBKDF2 Encrypted)' : 'كلمة المرور الجديدة (8 أحرف فأكثر — تشفر بـ PBKDF2)'}</span>
                  <input required type="password" minLength={8} maxLength={128} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
                </label>
                {error && <div className="auth-error">{error}</div>}
                <button className="button button-primary" type="submit" disabled={loading || resetCode.length !== 6}>
                  <CheckCircle2 size={18} /> {loading ? (en ? 'Encrypting & Signing In…' : 'جاري التشفير والدخول…') : (en ? 'Save Password & Sign In' : 'حفظ كلمة المرور والدخول فورًا')}
                </button>
                <button className="button button-ghost" type="button" style={{ marginTop: 10 }} onClick={() => { setView('login'); setResetSent(false); setError(''); }}>{en ? 'Back to Sign In' : 'العودة لتسجيل الدخول'}</button>
              </form>
            )}
          </div>
        ) : (
          <>
            <div className="auth-tabs">
              <button className={view === 'login' ? 'active' : ''} type="button" onClick={() => { setView('login'); setError(''); setAccountMissingOffer(false); }}>{en ? 'Sign In' : 'تسجيل الدخول'}</button>
              <button className={view === 'register' ? 'active' : ''} type="button" onClick={() => { setView('register'); setError(''); setAccountMissingOffer(false); }}>{en ? 'Create Account' : 'حساب جديد'}</button>
            </div>
            <h2 id="auth-title">{view === 'login' ? (en ? 'Welcome back.' : 'أهلًا بعودتك.') : (en ? 'Create your encrypted account.' : 'أنشئ حساب PathPilot المشفر.')}</h2>
            <p>{view === 'register' ? (en ? 'Your email & password pass through a 100,000-round SHA-256 cryptographic hash, and a 6-digit verification code is emailed to you.' : 'يتم خلط وتشفير بياناتك بـ 100,000 دورة SHA-256 بحيث لا تظهر لأي شخص، ويصلك كود تفعيل سداسي لبريدك فورًا.') : (en ? 'First time on the new version? Choose Create Account or click Forgot Password to activate via 6-digit email code.' : 'لو أول مرة تسجل على النسخة الجديدة اختار (حساب جديد) عشان يوصلك كود التفعيل على الإيميل فورًا.')}</p>
            <div ref={googleButtonRef} style={{ minHeight: 6, display: 'flex', justifyContent: 'center', margin: '6px 0' }} />
            <form onSubmit={submit}>
              {view === 'register' && <label><span>{en ? 'Full Name' : 'الاسم'}</span><input required minLength={2} maxLength={60} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name" /></label>}
              <label><span>{en ? 'Email Address' : 'البريد الإلكتروني'}</span><input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" /></label>
              <label><span>{en ? 'Password' : 'كلمة المرور'}</span><input required type="password" minLength={8} maxLength={128} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete={view === 'login' ? 'current-password' : 'new-password'} /></label>
              {view === 'login' && <button type="button" className="button button-ghost" style={{ paddingInline: 0, justifyContent: 'flex-start', marginTop: -4 }} onClick={() => { setView('forgot'); setError(''); setResetSent(false); }}>{en ? 'Forgot password / Send login code?' : 'نسيت كلمة المرور / إرسال كود للبريد؟'}</button>}
              {error && (
                <div className="auth-error" style={accountMissingOffer ? { borderColor: 'rgba(99,102,241,.55)', flexDirection: 'column', alignItems: 'stretch' } : undefined}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><AlertTriangle size={17} /> <span>{error}</span></div>
                  {accountMissingOffer && (
                    <button
                      type="button"
                      className="button button-primary"
                      style={{ marginTop: 8 }}
                      disabled={loading}
                      onClick={quickCreateFromLogin}
                    >
                      <MailCheck size={17} /> {en ? 'Create & Send 6-Digit Code Now' : 'إنشاء وتفعيل هذا الحساب الآن (إرسال الكود للبريد)'}
                    </button>
                  )}
                </div>
              )}
              <button className="button button-primary" type="submit" disabled={loading}>{view === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />} {loading ? (en ? 'Encrypting…' : 'جاري التنفيذ…') : view === 'login' ? (en ? 'Sign In' : 'دخول') : (en ? 'Create Account & Email Code' : 'إنشاء الحساب وإرسال الكود للبريد')}</button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
