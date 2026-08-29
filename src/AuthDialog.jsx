import { useEffect, useRef, useState } from 'react';
import { LogIn, UserPlus, X } from 'lucide-react';
import { getPlatformStatus, loginAccount, loginWithGoogleCredential, registerAccount } from './lib/platform.js';

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
  const googleButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
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
              onClose();
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
  }, [open, view, onAuthenticated, onClose]);

  if (!open) return null;

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = view === 'login' ? await loginAccount(form) : await registerAccount(form);
      onAuthenticated(user);
      onClose();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="dialog-close" type="button" onClick={onClose} aria-label="إغلاق"><X size={20} /></button>
        <div className="auth-tabs"><button className={view === 'login' ? 'active' : ''} type="button" onClick={() => setView('login')}>تسجيل الدخول</button><button className={view === 'register' ? 'active' : ''} type="button" onClick={() => setView('register')}>حساب جديد</button></div>
        <h2 id="auth-title">{view === 'login' ? 'أهلًا بعودتك.' : 'أنشئ حساب PathPilot.'}</h2>
        <p>الحساب يحفظ نشاطك في المنصة ويفتح المزايا المتصلة بالخادم.</p>
        <div ref={googleButtonRef} style={{ minHeight: 44, display: 'flex', justifyContent: 'center', margin: '14px 0' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.7, margin: '10px 0' }}><span style={{ height: 1, background: 'currentColor', flex: 1 }} /><small>أو بالبريد الإلكتروني</small><span style={{ height: 1, background: 'currentColor', flex: 1 }} /></div>
        <form onSubmit={submit}>
          {view === 'register' && <label><span>الاسم</span><input required minLength={2} maxLength={60} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name" /></label>}
          <label><span>البريد الإلكتروني</span><input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" /></label>
          <label><span>كلمة المرور</span><input required type="password" minLength={8} maxLength={128} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete={view === 'login' ? 'current-password' : 'new-password'} /></label>
          {error && <div className="auth-error">{error}</div>}
          <button className="button button-primary" type="submit" disabled={loading}>{view === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />} {loading ? 'جاري التنفيذ…' : view === 'login' ? 'دخول' : 'إنشاء الحساب'}</button>
        </form>
      </section>
    </div>
  );
}
