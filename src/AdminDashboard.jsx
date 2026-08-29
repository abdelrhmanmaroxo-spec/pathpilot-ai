import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Ban,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  Crown,
  Download,
  GraduationCap,
  KeyRound,
  LogIn,
  MailPlus,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import {
  deleteUserAccount,
  exportOwnerData,
  hasPlatformBackend,
  inviteAdminByEmail,
  loadAdminDashboard,
  loadAdminInvites,
  loadOwnerAccountLog,
  revokeAdminInvite,
  sendOwnerPasswordReset,
  setUserBan,
  updateUserRole,
} from './lib/platform.js';

const BASE_TABS = [
  ['analytics', 'Analytics'],
  ['users', 'Users'],
  ['security', 'Security & Login Log'],
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

function dateTime(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString();
}

function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminDashboard({ user, onBack }) {
  const [tab, setTab] = useState('analytics');
  const [data, setData] = useState(null);
  const [invites, setInvites] = useState([]);
  const [accountLog, setAccountLog] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [roleBusy, setRoleBusy] = useState('');
  const [deleteBusy, setDeleteBusy] = useState('');
  const [banBusy, setBanBusy] = useState('');
  const [resetBusy, setResetBusy] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);

  const tabs = useMemo(() => user?.isOwner ? [...BASE_TABS, ['owner-log', 'Owner Account Log']] : BASE_TABS, [user?.isOwner]);

  const refresh = async () => {
    if (!hasPlatformBackend || user?.role !== 'admin') return;
    setLoading(true);
    setError('');
    try {
      const dashboard = await loadAdminDashboard();
      setData(dashboard);
      if (user?.isOwner) {
        const [currentInvites, currentAccountLog] = await Promise.all([loadAdminInvites(), loadOwnerAccountLog()]);
        setInvites(currentInvites);
        setAccountLog(currentAccountLog);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasPlatformBackend || user?.role !== 'admin') return undefined;
    let active = true;
    Promise.all([
      loadAdminDashboard(),
      user?.isOwner ? loadAdminInvites() : Promise.resolve([]),
      user?.isOwner ? loadOwnerAccountLog() : Promise.resolve([]),
    ])
      .then(([dashboard, currentInvites, currentAccountLog]) => {
        if (!active) return;
        setData(dashboard);
        setInvites(currentInvites);
        setAccountLog(currentAccountLog);
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.role, user?.isOwner]);

  const percentages = useMemo(() => {
    const usage = data?.summary?.usage || {};
    const total = data?.summary?.totalUsage || 0;
    return Object.fromEntries(['general', 'study', 'work'].map((key) => [key, total ? Math.round(((usage[key] || 0) / total) * 100) : 0]));
  }, [data]);

  const bannedUsers = useMemo(() => (data?.users || []).filter((item) => Boolean(item.disabled)), [data?.users]);

  const patchUser = (userId, updated) => {
    setData((current) => current ? { ...current, users: current.users.map((entry) => entry.id === userId ? { ...entry, ...updated } : entry) } : current);
    setAccountLog((current) => current.map((entry) => entry.id === userId ? { ...entry, ...updated } : entry));
  };

  const changeRole = async (item) => {
    if (!user?.isOwner || item.isOwner) return;
    const nextRole = item.role === 'admin' ? 'user' : 'admin';
    setRoleBusy(item.id);
    setError('');
    setNotice('');
    try {
      const updated = await updateUserRole(item.id, nextRole);
      patchUser(item.id, updated);
      setNotice(nextRole === 'admin' ? `${item.email} is now an Admin.` : `Admin access removed from ${item.email}.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setRoleBusy('');
    }
  };

  const changeBan = async (item) => {
    if (!user?.isOwner || item.isOwner) return;
    const nextBanned = !Boolean(item.disabled);
    const message = nextBanned
      ? `Ban ${item.email}?\n\nThe account will be signed out immediately and cannot sign in until you unban it.`
      : `Unban ${item.email}?`;
    if (!globalThis.confirm?.(message)) return;
    setBanBusy(item.id);
    setError('');
    setNotice('');
    try {
      const updated = await setUserBan(item.id, nextBanned);
      patchUser(item.id, updated);
      setNotice(nextBanned ? `${item.email} is now banned and all sessions were revoked.` : `${item.email} is active again.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBanBusy('');
    }
  };

  const resetPassword = async (item) => {
    if (!user?.isOwner || item.isOwner) return;
    if (!globalThis.confirm?.(`Send a secure password reset link to ${item.email}?`)) return;
    setResetBusy(item.id);
    setError('');
    setNotice('');
    try {
      await sendOwnerPasswordReset(item.id);
      setNotice(`Password reset email sent to ${item.email}. The link is single-use and expires in 30 minutes.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setResetBusy('');
    }
  };

  const removeUser = async (item) => {
    if (!user?.isOwner || item.isOwner) return;
    const confirmed = globalThis.confirm?.(`Delete ${item.email}?\n\nThis permanently deletes the account and active sessions. This cannot be undone.`);
    if (!confirmed) return;
    setDeleteBusy(item.id);
    setError('');
    setNotice('');
    try {
      await deleteUserAccount(item.id);
      setData((current) => ({ ...current, users: current.users.filter((entry) => entry.id !== item.id), summary: { ...current.summary, totalUsers: Math.max(0, (current.summary?.totalUsers || 1) - 1) } }));
      setAccountLog((current) => current.filter((entry) => entry.id !== item.id));
      setNotice(`${item.email} was deleted.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeleteBusy('');
    }
  };

  const addAdmin = async (event) => {
    event.preventDefault();
    if (!user?.isOwner || !inviteEmail.trim()) return;
    setInviteBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await inviteAdminByEmail(inviteEmail.trim());
      if (result.status === 'admin_granted') {
        patchUser(result.user.id, result.user);
        setNotice(`${result.user.email} is now an Admin.`);
      } else {
        setInvites(await loadAdminInvites());
        setNotice(`Admin invitation saved for ${result.invite.email}. The role activates when that email creates and verifies an account.`);
      }
      setInviteEmail('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setInviteBusy(false);
    }
  };

  const revokeInvite = async (email) => {
    setError('');
    setNotice('');
    try {
      await revokeAdminInvite(email);
      setInvites((current) => current.filter((item) => item.email !== email || item.accepted_at));
      setNotice(`Pending invitation for ${email} was removed.`);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const exportBackup = async () => {
    if (!user?.isOwner) return;
    setBackupBusy(true);
    setError('');
    setNotice('');
    try {
      const snapshot = await exportOwnerData();
      const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
      downloadJson(`pathpilot-owner-export-${stamp}.json`, snapshot);
      setNotice('Safe owner data export downloaded. Password hashes, sessions and security tokens are intentionally excluded.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBackupBusy(false);
    }
  };

  if (!hasPlatformBackend) return <main className="admin-page page-shell"><EmptyAdmin>لوحة الإدارة جاهزة في الكود، لكنها لن تستقبل بيانات قبل نشر الـBackend وربط VITE_PLATFORM_API_URL.</EmptyAdmin></main>;
  if (user?.role !== 'admin') return <main className="admin-page page-shell"><EmptyAdmin>هذه الصفحة متاحة لحساب المدير فقط.</EmptyAdmin></main>;

  const pendingInvites = invites.filter((item) => !item.accepted_at);

  return (
    <main className="admin-page page-shell">
      <header className="admin-header">
        <div><span>PATHPILOT CONTROL CENTER</span><h1>PathPilot Admin</h1><p>بيانات حقيقية من المستخدمين والطلبات، من دون أرقام تجريبية.</p></div>
        <div>
          <button type="button" onClick={onBack}>العودة للتطبيق</button>
          {user?.isOwner && <button type="button" onClick={exportBackup} disabled={backupBusy}><Download size={16} /> {backupBusy ? 'Exporting…' : 'Owner Export'}</button>}
          <button type="button" onClick={refresh} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} /> تحديث</button>
        </div>
      </header>

      {user?.isOwner && <div className="admin-error" style={{ borderColor: 'rgba(255,215,64,.35)', color: 'inherit' }}><Crown /> أنت مالك المنصة. صلاحيات الحظر، إعادة تعيين كلمة المرور، إدارة المديرين، حذف الحسابات وOwner Account Log متاحة لك فقط. كلمات المرور الأصلية لا يتم تخزينها كنص قابل للعرض، ويتم التعامل معها عن طريق Reset آمن.</div>}
      {notice && <div className="admin-error" style={{ borderColor: 'rgba(34,197,94,.35)', color: 'inherit' }}><CheckCircle2 /> {notice}</div>}
      {error && <div className="admin-error"><AlertTriangle /> {error}</div>}

      <section className="admin-metrics">
        <Metric icon={Users} label="Total users" value={data?.summary?.totalUsers ?? '—'} hint={`${data?.summary?.activeToday ?? 0} active today`} />
        <Metric icon={MessageSquareText} label="AI requests" value={data?.summary?.aiRequests ?? '—'} hint={`${data?.summary?.aiSuccessRate ?? 0}% success rate`} />
        <Metric icon={Activity} label="Tracked usage" value={data?.summary?.totalUsage ?? '—'} hint="Real tool requests" />
        <Metric icon={Ban} label="Banned" value={bannedUsers.length} hint="Owner-controlled account bans" />
      </section>

      <section className="provider-panel">
        <div><span className={data?.status?.apiOnline ? 'provider-dot online' : 'provider-dot'} /><div><small>AI Provider</small><strong>{data?.status?.provider || 'Not configured'}</strong><small>{data?.status?.model || 'Waiting for model'}</small></div></div>
        <div><small>API Status</small><strong>{data?.status?.apiOnline ? 'Online' : 'Offline'}</strong></div>
        <div><small>Database</small><strong>{data?.status?.databaseOnline ? 'Online' : 'Offline'}</strong></div>
        <div><small>Email Verification</small><strong>{data?.status?.emailVerificationAvailable ? 'Ready' : 'Not configured'}</strong></div>
        <div><small>Google Sign-In</small><strong>{data?.status?.googleAuthAvailable ? 'Ready' : 'Not configured'}</strong></div>
      </section>

      <nav className="admin-tabs" aria-label="Admin sections">
        {tabs.map(([id, label]) => <button className={tab === id ? 'active' : ''} type="button" key={id} onClick={() => setTab(id)}>{label}</button>)}
      </nav>

      {tab === 'analytics' && (
        <section className="admin-grid">
          <article className="usage-card"><div><Sparkles /><span><strong>General</strong><small>{percentages.general}% of usage</small></span></div><i><b style={{ width: `${percentages.general}%` }} /></i></article>
          <article className="usage-card"><div><GraduationCap /><span><strong>Study</strong><small>{percentages.study}% of usage</small></span></div><i><b style={{ width: `${percentages.study}%` }} /></i></article>
          <article className="usage-card"><div><BriefcaseBusiness /><span><strong>Work</strong><small>{percentages.work}% of usage</small></span></div><i><b style={{ width: `${percentages.work}%` }} /></i></article>
          <article className="usage-card health"><div><Bot /><span><strong>Platform health</strong><small>{data?.status?.apiOnline ? 'AI and database are ready' : 'Database ready · AI waiting for key'}</small></span></div></article>
        </section>
      )}

      {tab === 'users' && (
        <section>
          {user?.isOwner && (
            <article className="usage-card" style={{ marginBottom: 18, display: 'block' }}>
              <div style={{ marginBottom: 14 }}><MailPlus /><span><strong>Add Admin by email</strong><small>Existing accounts are promoted immediately. New emails receive the role after account verification.</small></span></div>
              <form onSubmit={addAdmin} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input type="email" required placeholder="admin@example.com" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} style={{ flex: '1 1 260px' }} />
                <button type="submit" className="button button-primary" disabled={inviteBusy}><MailPlus size={16} /> {inviteBusy ? 'Adding…' : 'Add Admin'}</button>
              </form>
              {pendingInvites.length > 0 && <div style={{ marginTop: 14 }}>{pendingInvites.map((invite) => <div key={invite.email} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '8px 0' }}><span><strong>{invite.email}</strong><small style={{ display: 'block' }}>Pending admin invitation</small></span><button className="button button-ghost" type="button" onClick={() => revokeInvite(invite.email)}><XCircle size={15} /> Revoke</button></div>)}</div>}
            </article>
          )}

          <section className="admin-table-wrap">
            {data?.users?.length ? (
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Verified</th><th>Status</th><th>Role</th><th>Created</th><th>Last active</th><th>Controls</th></tr></thead>
                <tbody>{data.users.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.email}</td>
                    <td>{item.emailVerified ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><CheckCircle2 size={14} /> Verified</span> : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><XCircle size={14} /> Pending</span>}</td>
                    <td>{item.disabled ? <span style={{ color: '#f87171', display: 'inline-flex', gap: 5, alignItems: 'center' }}><Ban size={14} /> Banned</span> : <span style={{ color: '#86efac' }}>Active</span>}</td>
                    <td>{item.isOwner ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Crown size={14} /> Owner</span> : item.role}</td>
                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                    <td>{dateTime(item.last_seen_at)}</td>
                    <td>{item.isOwner ? <strong>Protected owner</strong> : user?.isOwner ? (
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                        <button type="button" className="button button-ghost" disabled={roleBusy === item.id || deleteBusy === item.id || banBusy === item.id} onClick={() => changeRole(item)}><ShieldCheck size={15} /> {roleBusy === item.id ? '...' : item.role === 'admin' ? 'Remove Admin' : 'Make Admin'}</button>
                        <button type="button" className="button button-ghost" disabled={resetBusy === item.id} onClick={() => resetPassword(item)}><KeyRound size={15} /> {resetBusy === item.id ? 'Sending…' : 'Reset Password'}</button>
                        <button type="button" className="button button-ghost" style={{ borderColor: item.disabled ? 'rgba(34,197,94,.45)' : 'rgba(245,158,11,.45)', color: item.disabled ? '#86efac' : '#fbbf24' }} disabled={banBusy === item.id || deleteBusy === item.id} onClick={() => changeBan(item)}><Ban size={15} /> {banBusy === item.id ? '...' : item.disabled ? 'Unban' : 'Ban'}</button>
                        <button type="button" className="button button-ghost" style={{ borderColor: 'rgba(239,68,68,.45)', color: '#f87171' }} disabled={deleteBusy === item.id || roleBusy === item.id || banBusy === item.id} onClick={() => removeUser(item)}><Trash2 size={15} /> {deleteBusy === item.id ? 'Deleting…' : 'Delete Account'}</button>
                      </div>
                    ) : <span>Owner only</span>}</td>
                  </tr>
                ))}</tbody>
              </table>
            ) : <EmptyAdmin>لا يوجد مستخدمون بعد.</EmptyAdmin>}
          </section>
        </section>
      )}

      {tab === 'security' && (
        <section style={{ display: 'grid', gap: 18 }}>
          <article className="usage-card" style={{ display: 'block' }}>
            <div style={{ marginBottom: 12 }}><Ban /><span><strong>Ban List</strong><small>الحسابات المحظورة حاليًا. الـOwner يقدر يعمل Unban من Users.</small></span></div>
            {bannedUsers.length ? bannedUsers.map((item) => <div key={item.id} style={{ padding: '10px 0', borderTop: '1px solid rgba(148,163,184,.12)', display: 'flex', justifyContent: 'space-between', gap: 12 }}><span><strong>{item.name}</strong><small style={{ display: 'block' }}>{item.email}</small></span><span style={{ color: '#f87171' }}>Banned</span></div>) : <EmptyAdmin>لا توجد حسابات محظورة.</EmptyAdmin>}
          </article>
          <section className="admin-table-wrap">
            {data?.loginLog?.length ? (
              <table><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Method / Event</th><th>Login time</th></tr></thead><tbody>{data.loginLog.map((item) => <tr key={item.id}><td>{item.user_name || 'Deleted / unknown'}</td><td>{item.user_email || '—'}</td><td>{item.role || '—'}</td><td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><LogIn size={14} /> {item.event_type}</span></td><td>{dateTime(item.created_at)}</td></tr>)}</tbody></table>
            ) : <EmptyAdmin>لا توجد عمليات تسجيل دخول مسجلة بعد.</EmptyAdmin>}
          </section>
        </section>
      )}

      {tab === 'owner-log' && user?.isOwner && (
        <section className="admin-table-wrap">
          {accountLog.length ? (
            <table><thead><tr><th>Name</th><th>Email</th><th>Provider</th><th>Status</th><th>Role</th><th>Created</th><th>Login count</th><th>Last login</th></tr></thead><tbody>{accountLog.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.email}</td><td>{item.auth_provider || 'password'}</td><td>{item.disabled ? 'Banned' : 'Active'}</td><td>{item.isOwner ? 'Owner' : item.role}</td><td>{dateTime(item.created_at)}</td><td>{item.loginCount ?? 0}</td><td>{dateTime(item.lastLoginAt)}</td></tr>)}</tbody></table>
          ) : <EmptyAdmin>لا توجد بيانات حسابات بعد.</EmptyAdmin>}
        </section>
      )}

      {tab === 'api' && <section className="admin-table-wrap">{data?.apiUsage?.length ? <table><thead><tr><th>Workspace</th><th>Tool</th><th>Model</th><th>Status</th><th>Latency</th><th>Time</th></tr></thead><tbody>{data.apiUsage.map((item) => <tr key={item.id}><td>{item.workspace}</td><td>{item.tool}</td><td>{item.model || '—'}</td><td><span className={`request-status ${item.status}`}>{item.status}</span></td><td>{item.latency_ms == null ? '—' : `${item.latency_ms} ms`}</td><td>{dateTime(item.created_at)}</td></tr>)}</tbody></table> : <EmptyAdmin>لا توجد طلبات AI بعد.</EmptyAdmin>}</section>}
      {tab === 'errors' && <section className="admin-feed">{data?.errors?.length ? data.errors.map((item) => <article key={item.id}><AlertTriangle /><div><strong>{item.message}</strong><p>{item.context}</p><small>{dateTime(item.created_at)}</small></div></article>) : <EmptyAdmin>لا توجد أخطاء مسجلة.</EmptyAdmin>}</section>}
      {tab === 'feedback' && <section className="admin-feed">{data?.feedback?.length ? data.feedback.map((item) => <article key={item.id}><MessageSquareText /><div><strong>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</strong><p>{item.message || 'No written feedback'}</p><small>{item.user_name || 'Anonymous'} · {item.user_email || 'No signed-in email'} · {item.workspace || 'general'} · {item.tool || 'unknown'} · {dateTime(item.created_at)}</small></div></article>) : <EmptyAdmin>لا توجد ملاحظات بعد.</EmptyAdmin>}</section>}
    </main>
  );
}
