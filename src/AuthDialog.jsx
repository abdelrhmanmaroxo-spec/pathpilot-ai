import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, KeyRound, LogIn, MailCheck, UserPlus, X } from 'lucide-react';
import { getPlatformStatus, loginAccount, loginWithGoogleCredential, registerAccount, requestPasswordReset, resendVerification } from './lib/platform.js';

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

export default function AuthDialog({ open, onClose, onAuthenticated }) {
  const [view, setView] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationPending, setVerificationPending] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState('');
  const [resent, setResent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const googleButtonRef = useRef(null);

  const resetVerificationState = useCallback(() => {
    setVerificationEmail('');
    setVerificationPending(false);
    setDeliveryMode('');
    setResent(false);
  }, []);

  const closeDialog = useCallback(() => {
    resetVerificationState();
    setResetSent(false);
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

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResent(false);
    try {
      if (view === 'register') {
        const result = await registerAccount(form);
        if (result.requiresVerification) {
          setVerificationEmail(result.email || form.email);
          setVerificationPending(Boolean(result.deliveryPending));
          setDeliveryMode(result.deliveryMode || '');
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
      } else {
        setError(requestError.message);
      }
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
      setResent(!result.deliveryPending);
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
    try {
      await requestPasswordReset(form.email);
      setResetSent(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
      <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="dialog-close" type="button" onClick={closeDialog} aria-label="إغلاق"><X size={20} /></button>

        {verificationEmail ? (
          <div style={{ textAlign: 'center', padding: '18px 6px 8px' }}>
            <MailCheck size={46} style={{ margin: '0 auto 12px' }} />
            <h2 id="auth-title">الحساب اتعمل ومستني التفعيل</h2>
            {verificationPending ? (
              <>
                <p>حساب <strong>{verificationEmail}</strong> محفوظ بالفعل، لكن مزود البريد لم يسلّم رسالة التفعيل في المحاولة الحالية.</p>
                <div className="auth-error" style={{ borderColor: 'rgba(245,158,11,.5)' }}>
                  <AlertTriangle size={17} />
                  {deliveryMode === 'sandbox'
                    ? 'الإرسال حاليًا في وضع Resend التجريبي، لذلك الإرسال العام لأي Gmail لن يكتمل حتى يتم استخدام Sender Domain موثّق. الحساب لن يُحذف ويمكن إعادة المحاولة.'
                    : 'الحساب آمن ومعلّق فقط. اضغط إعادة الإرسال لاحقًا، ولن تحتاج لإنشاء الحساب من جديد.'}
                </div>
              </>
            ) : (
              <p>أرسلنا رابط تفعيل إلى <strong>{verificationEmail}</strong>. افتح الرسالة واضغط Verify email، وبعدها ارجع وسجل دخولك.</p>
            )}
            {resent && <div className="auth-error" style={{ borderColor: 'rgba(34,197,94,.45)' }}><CheckCircle2 size={17} /> تم إرسال رابط جديد. راجع Inbox وSpam.</div>}
            {error && <div className="auth-error">{error}</div>}
            <button className="button button-primary" type="button" onClick={resend} disabled={loading}><MailCheck size={18} /> {loading ? 'جاري الإرسال…' : 'إعادة إرسال رابط التفعيل'}</button>
            <button className="button button-ghost" type="button" style={{ marginTop: 10 }} onClick={() => { resetVerificationState(); setView('login'); setError(''); }}>العودة لتسجيل الدخول</button>
          </div>
        ) : view === 'forgot' ? (
          <div style={{ paddingTop: 10 }}>
            <KeyRound size={42} style={{ marginBottom: 10 }} />
            <h2 id="auth-title">إعادة تعيين كلمة المرور</h2>
            <p>اكتب البريد المرتبط بحسابك. لو الحساب موجود ومؤهل، هنرسل له رابط Reset صالح لمدة 30 دقيقة.</p>
            <form onSubmit={forgotPassword}>
              <label><span>البريد الإلكتروني</span><input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" /></label>
              {resetSent && <div className="auth-error" style={{ borderColor: 'rgba(34,197,94,.45)' }}><CheckCircle2 size={17} /> لو البريد مرتبط بحساب، تم إرسال رابط إعادة التعيين. راجع Inbox وSpam.</div>}
              {error && <div className="auth-error">{error}</div>}
              <button className="button button-primary" type="submit" disabled={loading}><MailCheck size={18} /> {loading ? 'جاري الإرسال…' : resetSent ? 'إرسال رابط آخر' : 'إرسال رابط إعادة التعيين'}</button>
              <button className="button button-ghost" type="button" style={{ marginTop: 10 }} onClick={() => { setView('login'); setResetSent(false); setError(''); }}>العودة لتسجيل الدخول</button>
            </form>
          </div>
        ) : (
          <>
            <div className="auth-tabs"><button className={view === 'login' ? 'active' : ''} type="button" onClick={() => setView('login')}>تسجيل الدخول</button><button className={view === 'register' ? 'active' : ''} type="button" onClick={() => setView('register')}>حساب جديد</button></div>
            <h2 id="auth-title">{view === 'login' ? 'أهلًا بعودتك.' : 'أنشئ حساب PathPilot.'}</h2>
            <p>{view === 'register' ? 'بعد إنشاء الحساب ستحتاج لتأكيد بريدك الإلكتروني قبل أول تسجيل دخول.' : 'الحساب يحفظ نشاطك في المنصة ويفتح المزايا المتصلة بالخادم.'}</p>
            <div ref={googleButtonRef} style={{ minHeight: 44, display: 'flex', justifyContent: 'center', margin: '14px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.7, margin: '10px 0' }}><span style={{ height: 1, background: 'currentColor', flex: 1 }} /><small>أو بالبريد الإلكتروني</small><span style={{ height: 1, background: 'currentColor', flex: 1 }} /></div>
            <form onSubmit={submit}>
              {view === 'register' && <label><span>الاسم</span><input required minLength={2} maxLength={60} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name" /></label>}
              <label><span>البريد الإلكتروني</span><input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" /></label>
              <label><span>كلمة المرور</span><input required type="password" minLength={8} maxLength={128} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete={view === 'login' ? 'current-password' : 'new-password'} /></label>
              {view === 'login' && <button type="button" className="button button-ghost" style={{ paddingInline: 0, justifyContent: 'flex-start', marginTop: -4 }} onClick={() => { setView('forgot'); setError(''); setResetSent(false); }}>نسيت كلمة المرور؟</button>}
              {error && <div className="auth-error">{error}</div>}
              <button className="button button-primary" type="submit" disabled={loading}>{view === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />} {loading ? 'جاري التنفيذ…' : view === 'login' ? 'دخول' : 'إنشاء الحساب'}</button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
