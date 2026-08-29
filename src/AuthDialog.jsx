import { useState } from 'react';
import { LogIn, UserPlus, X } from 'lucide-react';
import { loginAccount, registerAccount } from './lib/platform.js';

export default function AuthDialog({ open, onClose, onAuthenticated }) {
  const [view, setView] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
