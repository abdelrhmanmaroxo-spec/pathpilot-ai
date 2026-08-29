import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Bot, BriefcaseBusiness, Crown, GraduationCap, MessageSquareText, RefreshCw, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { hasPlatformBackend, loadAdminDashboard, updateUserRole } from './lib/platform.js';

const TABS = [
  ['analytics', 'Analytics'],
  ['users', 'Users'],
  ['api', 'API Usage'],
  ['errors', 'Errors'],
  ['feedback', 'Feedback'],
];

function Metric({ icon: Icon, label, value, hint }) {
  return <article className="admin-metric"><span><Icon /></span><div><small>{label}</small><strong>{value}</strong><p>{hint}</p></div></article>;
}

function EmptyAdmin({ children }) {
  return <div className="admin-empty">{children}</div>;
}

export default function AdminDashboard({ user, onBack }) {
  const [tab, setTab] = useState('analytics');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [roleBusy, setRoleBusy] = useState('');

  const refresh = async () => {
    if (!hasPlatformBackend || user?.role !== 'admin') return;
    setLoading(true);
    setError('');
    try { setData(await loadAdminDashboard()); } catch (requestError) { setError(requestError.message); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!hasPlatformBackend || user?.role !== 'admin') return undefined;
    let active = true;
    loadAdminDashboard()
      .then((dashboard) => { if (active) setData(dashboard); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.role]);

  const percentages = useMemo(() => {
    const usage = data?.summary?.usage || {};
    const total = data?.summary?.totalUsage || 0;
    return Object.fromEntries(['general', 'study', 'work'].map((key) => [key, total ? Math.round(((usage[key] || 0) / total) * 100) : 0]));
  }, [data]);

  const changeRole = async (item) => {
    if (!user?.isOwner || item.isOwner) return;
    const nextRole = item.role === 'admin' ? 'user' : 'admin';
    setRoleBusy(item.id);
    setError('');
    try {
      const updated = await updateUserRole(item.id, nextRole);
      setData((current) => ({
        ...current,
        users: current.users.map((entry) => entry.id === item.id ? { ...entry, ...updated } : entry),
      }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setRoleBusy('');
    }
  };

  if (!hasPlatformBackend) return <main className="admin-page page-shell"><EmptyAdmin>لوحة الإدارة جاهزة في الكود، لكنها لن تستقبل بيانات قبل نشر الـBackend وربط VITE_PLATFORM_API_URL.</EmptyAdmin></main>;
  if (user?.role !== 'admin') return <main className="admin-page page-shell"><EmptyAdmin>هذه الصفحة متاحة لحساب المدير فقط.</EmptyAdmin></main>;

  return (
    <main className="admin-page page-shell">
      <header className="admin-header">
        <div><span>PATHPILOT CONTROL CENTER</span><h1>PathPilot Admin</h1><p>بيانات حقيقية من المستخدمين والطلبات، من دون أرقام تجريبية.</p></div>
        <div><button type="button" onClick={onBack}>العودة للتطبيق</button><button type="button" onClick={refresh} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} /> تحديث</button></div>
      </header>

      {user?.isOwner && <div className="admin-error" style={{ borderColor: 'rgba(255,215,64,.35)', color: 'inherit' }}><Crown /> أنت مالك المنصة. أنت فقط من يستطيع إضافة أو إزالة صلاحية Admin للمستخدمين.</div>}
      {error && <div className="admin-error"><AlertTriangle /> {error}</div>}
      <section className="admin-metrics">
        <Metric icon={Users} label="Total users" value={data?.summary?.totalUsers ?? '—'} hint={`${data?.summary?.activeToday ?? 0} active today`} />
        <Metric icon={MessageSquareText} label="AI requests" value={data?.summary?.aiRequests ?? '—'} hint={`${data?.summary?.aiSuccessRate ?? 0}% success rate`} />
        <Metric icon={Activity} label="Tracked usage" value={data?.summary?.totalUsage ?? '—'} hint="Real tool requests" />
        <Metric icon={AlertTriangle} label="Errors" value={data?.summary?.errors ?? '—'} hint={`${data?.summary?.feedback ?? 0} feedback items`} />
      </section>

      <section className="provider-panel">
        <div><span className={data?.status?.apiOnline ? 'provider-dot online' : 'provider-dot'} /><div><small>AI Provider</small><strong>{data?.status?.provider || 'Not configured'}</strong><small>{data?.status?.model || 'Waiting for model'}</small></div></div>
        <div><small>API Status</small><strong>{data?.status?.apiOnline ? 'Online' : 'Offline'}</strong></div>
        <div><small>Database</small><strong>{data?.status?.databaseOnline ? 'Online' : 'Offline'}</strong></div>
        <div><small>Google Sign-In</small><strong>{data?.status?.googleAuthAvailable ? 'Ready' : 'Not configured'}</strong></div>
      </section>

      <nav className="admin-tabs" aria-label="Admin sections">
        {TABS.map(([id, label]) => <button className={tab === id ? 'active' : ''} type="button" key={id} onClick={() => setTab(id)}>{label}</button>)}
      </nav>

      {tab === 'analytics' && (
        <section className="admin-grid">
          <article className="usage-card"><div><Sparkles /><span><strong>General</strong><small>{percentages.general}% of usage</small></span></div><i><b style={{ width: `${percentages.general}%` }} /></i></article>
          <article className="usage-card"><div><GraduationCap /><span><strong>Study</strong><small>{percentages.study}% of usage</small></span></div><i><b style={{ width: `${percentages.study}%` }} /></i></article>
          <article className="usage-card"><div><BriefcaseBusiness /><span><strong>Work</strong><small>{percentages.work}% of usage</small></span></div><i><b style={{ width: `${percentages.work}%` }} /></i></article>
          <article className="usage-card health"><div><Bot /><span><strong>Platform health</strong><small>{data?.status?.apiOnline ? 'AI and database are ready' : 'Database ready · AI waiting for key'}</small></span></div></article>
        </section>
      )}

      {tab === 'users' && <section className="admin-table-wrap">{data?.users?.length ? <table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Created</th><th>Last active</th><th>Admin control</th></tr></thead><tbody>{data.users.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.email}</td><td>{item.isOwner ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Crown size={14} /> Owner</span> : item.role}</td><td>{new Date(item.created_at).toLocaleDateString()}</td><td>{new Date(item.last_seen_at).toLocaleString()}</td><td>{item.isOwner ? <strong>Protected owner</strong> : user?.isOwner ? <button type="button" className="button button-ghost" disabled={roleBusy === item.id} onClick={() => changeRole(item)}><ShieldCheck size={15} /> {roleBusy === item.id ? '...' : item.role === 'admin' ? 'Remove Admin' : 'Make Admin'}</button> : <span>Owner only</span>}</td></tr>)}</tbody></table> : <EmptyAdmin>لا يوجد مستخدمون بعد.</EmptyAdmin>}</section>}
      {tab === 'api' && <section className="admin-table-wrap">{data?.apiUsage?.length ? <table><thead><tr><th>Workspace</th><th>Tool</th><th>Model</th><th>Status</th><th>Latency</th><th>Time</th></tr></thead><tbody>{data.apiUsage.map((item) => <tr key={item.id}><td>{item.workspace}</td><td>{item.tool}</td><td>{item.model || '—'}</td><td><span className={`request-status ${item.status}`}>{item.status}</span></td><td>{item.latency_ms == null ? '—' : `${item.latency_ms} ms`}</td><td>{new Date(item.created_at).toLocaleString()}</td></tr>)}</tbody></table> : <EmptyAdmin>لا توجد طلبات AI بعد.</EmptyAdmin>}</section>}
      {tab === 'errors' && <section className="admin-feed">{data?.errors?.length ? data.errors.map((item) => <article key={item.id}><AlertTriangle /><div><strong>{item.message}</strong><p>{item.context}</p><small>{new Date(item.created_at).toLocaleString()}</small></div></article>) : <EmptyAdmin>لا توجد أخطاء مسجلة.</EmptyAdmin>}</section>}
      {tab === 'feedback' && <section className="admin-feed">{data?.feedback?.length ? data.feedback.map((item) => <article key={item.id}><MessageSquareText /><div><strong>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</strong><p>{item.message || 'No written feedback'}</p><small>{item.workspace || 'general'} · {item.tool || 'unknown'} · {new Date(item.created_at).toLocaleString()}</small></div></article>) : <EmptyAdmin>لا توجد ملاحظات بعد.</EmptyAdmin>}</section>}
    </main>
  );
}
