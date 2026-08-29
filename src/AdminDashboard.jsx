import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Ban, CheckCircle2, Crown, Download, KeyRound,
  MailPlus, RefreshCw, ShieldCheck, Trash2, XCircle,
} from 'lucide-react';
import {
  deleteUserAccount, exportOwnerData, hasPlatformBackend, inviteAdminByEmail,
  loadAdminDashboard, loadAdminInvites, loadOwnerAccountLog, revokeAdminInvite,
  sendOwnerPasswordReset, setUserBan, updateUserRole,
} from './lib/platform.js';
import AdminAnalytics from './admin/AdminAnalytics.jsx';
import AdminApiUsage from './admin/AdminApiUsage.jsx';
import AdminErrors from './admin/AdminErrors.jsx';
import AdminFeedback from './admin/AdminFeedback.jsx';
import AdminOwnerLog from './admin/AdminOwnerLog.jsx';
import AdminSecurity from './admin/AdminSecurity.jsx';
import AdminSystemStatus from './admin/AdminSystemStatus.jsx';
import { dateTime, downloadJson } from './admin/admin-utils.js';
import { EmptyAdmin } from './admin/AdminShared.jsx';

const BASE_TABS = [
  ['analytics', 'Analytics'], ['users', 'Users'], ['security', 'Security & Login Log'],
  ['api', 'API Usage'], ['errors', 'Errors'], ['feedback', 'Feedback'],
];

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
  const bannedUsers = useMemo(() => (data?.users || []).filter((item) => item.disabled), [data?.users]);
  const percentages = useMemo(() => {
    const usage = data?.summary?.usage || {};
    const total = data?.summary?.totalUsage || 0;
    return Object.fromEntries(['general', 'study', 'work'].map((key) => [key, total ? Math.round(((usage[key] || 0) / total) * 100) : 0]));
  }, [data]);

  const loadEverything = async () => {
    const dashboard = await loadAdminDashboard();
    const currentInvites = user?.isOwner ? await loadAdminInvites() : [];
    const currentAccountLog = user?.isOwner ? await loadOwnerAccountLog() : [];
    return { dashboard, currentInvites, currentAccountLog };
  };

  const refresh = async () => {
    if (!hasPlatformBackend || user?.role !== 'admin') return;
    setLoading(true); setError('');
    try {
      const result = await loadEverything();
      setData(result.dashboard); setInvites(result.currentInvites); setAccountLog(result.currentAccountLog);
    } catch (requestError) { setError(requestError.message); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!hasPlatformBackend || user?.role !== 'admin') return undefined;
    let active = true;
    loadEverything()
      .then((result) => {
        if (!active) return;
        setData(result.dashboard); setInvites(result.currentInvites); setAccountLog(result.currentAccountLog);
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, user?.isOwner]);

  const patchUser = (userId, updated) => {
    setData((current) => current ? { ...current, users: current.users.map((entry) => entry.id === userId ? { ...entry, ...updated } : entry) } : current);
    setAccountLog((current) => current.map((entry) => entry.id === userId ? { ...entry, ...updated } : entry));
  };

  const changeRole = async (item) => {
    if (!user?.isOwner || item.isOwner) return;
    const nextRole = item.role === 'admin' ? 'user' : 'admin';
    setRoleBusy(item.id); setError(''); setNotice('');
    try {
      const updated = await updateUserRole(item.id, nextRole); patchUser(item.id, updated);
      setNotice(nextRole === 'admin' ? `${item.email} is now an Admin.` : `Admin access removed from ${item.email}.`);
    } catch (requestError) { setError(requestError.message); } finally { setRoleBusy(''); }
  };

  const changeBan = async (item) => {
    if (!user?.isOwner || item.isOwner) return;
    const nextBanned = !item.disabled;
    const message = nextBanned ? `Ban ${item.email}?\n\nThe account will be signed out immediately and cannot sign in until you unban it.` : `Unban ${item.email}?`;
    if (!globalThis.confirm?.(message)) return;
    setBanBusy(item.id); setError(''); setNotice('');
    try {
      const updated = await setUserBan(item.id, nextBanned); patchUser(item.id, updated);
      setNotice(nextBanned ? `${item.email} is now banned and all sessions were revoked.` : `${item.email} is active again.`);
    } catch (requestError) { setError(requestError.message); } finally { setBanBusy(''); }
  };

  const resetPassword = async (item) => {
    if (!user?.isOwner || item.isOwner) return;
    if (!globalThis.confirm?.(`Send a secure password reset link to ${item.email}?`)) return;
    setResetBusy(item.id); setError(''); setNotice('');
    try { await sendOwnerPasswordReset(item.id); setNotice(`Password reset email sent to ${item.email}. The link is single-use and expires in 30 minutes.`); }
    catch (requestError) { setError(requestError.message); } finally { setResetBusy(''); }
  };

  const removeUser = async (item) => {
    if (!user?.isOwner || item.isOwner) return;
    if (!globalThis.confirm?.(`Delete ${item.email}?\n\nThis permanently deletes the account and active sessions. This cannot be undone.`)) return;
    setDeleteBusy(item.id); setError(''); setNotice('');
    try {
      await deleteUserAccount(item.id);
      setData((current) => ({ ...current, users: current.users.filter((entry) => entry.id !== item.id), summary: { ...current.summary, totalUsers: Math.max(0, (current.summary?.totalUsers || 1) - 1) } }));
      setAccountLog((current) => current.filter((entry) => entry.id !== item.id));
      setNotice(`${item.email} was deleted.`);
    } catch (requestError) { setError(requestError.message); } finally { setDeleteBusy(''); }
  };

  const addAdmin = async (event) => {
    event.preventDefault();
    if (!user?.isOwner || !inviteEmail.trim()) return;
    setInviteBusy(true); setError(''); setNotice('');
    try {
      const result = await inviteAdminByEmail(inviteEmail.trim());
      if (result.status === 'admin_granted') { patchUser(result.user.id, result.user); setNotice(`${result.user.email} is now an Admin.`); }
      else { setInvites(await loadAdminInvites()); setNotice(`Admin invitation saved for ${result.invite.email}. The role activates when that email creates and verifies an account.`); }
      setInviteEmail('');
    } catch (requestError) { setError(requestError.message); } finally { setInviteBusy(false); }
  };

  const revokeInvite = async (email) => {
    setError(''); setNotice('');
    try { await revokeAdminInvite(email); setInvites((current) => current.filter((item) => item.email !== email || item.accepted_at)); setNotice(`Pending invitation for ${email} was removed.`); }
    catch (requestError) { setError(requestError.message); }
  };

  const exportBackup = async () => {
    if (!user?.isOwner) return;
    setBackupBusy(true); setError(''); setNotice('');
    try {
      const snapshot = await exportOwnerData();
      const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
      downloadJson(`pathpilot-owner-export-${stamp}.json`, snapshot);
      setNotice('Safe owner data export downloaded. Password hashes, sessions and security tokens are intentionally excluded.');
    } catch (requestError) { setError(requestError.message); } finally { setBackupBusy(false); }
  };

  if (!hasPlatformBackend) return <main className="admin-page page-shell"><EmptyAdmin>لوحة الإدارة تحتاج Backend متصل.</EmptyAdmin></main>;
  if (user?.role !== 'admin') return <main className="admin-page page-shell"><EmptyAdmin>هذه الصفحة متاحة للـAdmin والـOwner فقط.</EmptyAdmin></main>;
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

      {user?.isOwner && <div className="admin-error" style={{ borderColor: 'rgba(255,215,64,.35)', color: 'inherit' }}><Crown /> أنت مالك المنصة. الحظر، Reset Password، إدارة المديرين، حذف الحسابات وOwner Account Log متاحة لك فقط. كلمة المرور الأصلية لا تُخزن كنص قابل للعرض، لذلك الإدارة الآمنة تتم عبر Reset.</div>}
      {notice && <div className="admin-error" style={{ borderColor: 'rgba(34,197,94,.35)', color: 'inherit' }}><CheckCircle2 /> {notice}</div>}
      {error && <div className="admin-error"><AlertTriangle /> {error}</div>}

      <AdminAnalytics data={data} percentages={percentages} bannedCount={bannedUsers.length} showBreakdown={tab === 'analytics'} />
      <AdminSystemStatus status={data?.status} />
      <nav className="admin-tabs" aria-label="Admin sections">{tabs.map(([id, label]) => <button className={tab === id ? 'active' : ''} type="button" key={id} onClick={() => setTab(id)}>{label}</button>)}</nav>

      {tab === 'users' && <section>
        {user?.isOwner && <article className="usage-card" style={{ marginBottom: 18, display: 'block' }}>
          <div style={{ marginBottom: 14 }}><MailPlus /><span><strong>Add Admin by email</strong><small>Existing accounts are promoted immediately. New emails receive the role after verification.</small></span></div>
          <form onSubmit={addAdmin} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><input type="email" required placeholder="admin@example.com" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} style={{ flex: '1 1 260px' }} /><button type="submit" className="button button-primary" disabled={inviteBusy}><MailPlus size={16} /> {inviteBusy ? 'Adding…' : 'Add Admin'}</button></form>
          {pendingInvites.length > 0 && <div style={{ marginTop: 14 }}>{pendingInvites.map((invite) => <div key={invite.email} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '8px 0' }}><span><strong>{invite.email}</strong><small style={{ display: 'block' }}>Pending admin invitation</small></span><button className="button button-ghost" type="button" onClick={() => revokeInvite(invite.email)}><XCircle size={15} /> Revoke</button></div>)}</div>}
        </article>}
        <section className="admin-table-wrap">{data?.users?.length ? <table><thead><tr><th>Name</th><th>Email</th><th>Verified</th><th>Status</th><th>Role</th><th>Created</th><th>Last active</th><th>Controls</th></tr></thead><tbody>{data.users.map((item) => <tr key={item.id}>
          <td>{item.name}</td><td>{item.email}</td>
          <td>{item.emailVerified ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><CheckCircle2 size={14} /> Verified</span> : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><XCircle size={14} /> Pending</span>}</td>
          <td>{item.disabled ? <span style={{ color: '#f87171', display: 'inline-flex', gap: 5, alignItems: 'center' }}><Ban size={14} /> Banned</span> : <span style={{ color: '#86efac' }}>Active</span>}</td>
          <td>{item.isOwner ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Crown size={14} /> Owner</span> : item.role}</td>
          <td>{new Date(item.created_at).toLocaleDateString()}</td><td>{dateTime(item.last_seen_at)}</td>
          <td>{item.isOwner ? <strong>Protected owner</strong> : user?.isOwner ? <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            <button type="button" className="button button-ghost" disabled={roleBusy === item.id || deleteBusy === item.id || banBusy === item.id} onClick={() => changeRole(item)}><ShieldCheck size={15} /> {roleBusy === item.id ? '...' : item.role === 'admin' ? 'Remove Admin' : 'Make Admin'}</button>
            <button type="button" className="button button-ghost" disabled={resetBusy === item.id} onClick={() => resetPassword(item)}><KeyRound size={15} /> {resetBusy === item.id ? 'Sending…' : 'Reset Password'}</button>
            <button type="button" className="button button-ghost" style={{ borderColor: item.disabled ? 'rgba(34,197,94,.45)' : 'rgba(245,158,11,.45)', color: item.disabled ? '#86efac' : '#fbbf24' }} disabled={banBusy === item.id || deleteBusy === item.id} onClick={() => changeBan(item)}><Ban size={15} /> {banBusy === item.id ? '...' : item.disabled ? 'Unban' : 'Ban'}</button>
            <button type="button" className="button button-ghost" style={{ borderColor: 'rgba(239,68,68,.45)', color: '#f87171' }} disabled={deleteBusy === item.id || roleBusy === item.id || banBusy === item.id} onClick={() => removeUser(item)}><Trash2 size={15} /> {deleteBusy === item.id ? 'Deleting…' : 'Delete Account'}</button>
          </div> : <span>Owner only</span>}</td>
        </tr>)}</tbody></table> : <EmptyAdmin>لا يوجد مستخدمون بعد.</EmptyAdmin>}</section>
      </section>}

      {tab === 'security' && <AdminSecurity bannedUsers={bannedUsers} loginLog={data?.loginLog} />}
      {tab === 'owner-log' && user?.isOwner && <AdminOwnerLog accounts={accountLog} />}
      {tab === 'api' && <AdminApiUsage requests={data?.apiUsage} />}
      {tab === 'errors' && <AdminErrors errors={data?.errors} />}
      {tab === 'feedback' && <AdminFeedback feedback={data?.feedback} />}
    </main>
  );
}
