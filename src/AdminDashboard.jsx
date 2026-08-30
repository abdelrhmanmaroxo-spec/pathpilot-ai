import {
  AlertTriangle, CheckCircle2, Crown, Download, RefreshCw,
} from 'lucide-react';
import { hasPlatformBackend } from './lib/platform.js';
import AdminAnalytics from './admin/AdminAnalytics.jsx';
import AdminApiUsage from './admin/AdminApiUsage.jsx';
import AdminErrors from './admin/AdminErrors.jsx';
import AdminFeedback from './admin/AdminFeedback.jsx';
import AdminOwnerLog from './admin/AdminOwnerLog.jsx';
import AdminSecurity from './admin/AdminSecurity.jsx';
import AdminSystemStatus from './admin/AdminSystemStatus.jsx';
import AdminUsers from './admin/AdminUsers.jsx';
import { EmptyAdmin } from './admin/AdminShared.jsx';
import { useAdminDashboardController } from './admin/useAdminDashboardController.js';

export default function AdminDashboard({ user, onBack }) {
  const {
    tab, setTab, data, accountLog, inviteEmail, setInviteEmail,
    notice, error, loading, roleBusy, deleteBusy, banBusy, resetBusy,
    inviteBusy, backupBusy, tabs, bannedUsers, percentages, pendingInvites,
    refresh, changeRole, changeBan, resetPassword, removeUser, addAdmin,
    revokeInvite, exportBackup,
  } = useAdminDashboardController(user);

  if (!hasPlatformBackend) return <main className="admin-page page-shell"><EmptyAdmin>لوحة الإدارة تحتاج Backend متصل.</EmptyAdmin></main>;
  if (user?.role !== 'admin') return <main className="admin-page page-shell"><EmptyAdmin>هذه الصفحة متاحة للـAdmin والـOwner فقط.</EmptyAdmin></main>;

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

      {user?.isOwner && <div className="admin-error" style={{ borderColor: 'rgba(255,215,64,.35)', color: 'inherit' }}><Crown /> أنت مالك المنصة. إدارة المديرين، Reset Password، حذف الحسابات وOwner Account Log متاحة لك فقط. الـAdmin يقدر يعمل Ban/Unban للمستخدمين العاديين فقط، ولا يقدر يوقف Owner أو Admin آخر.</div>}
      {notice && <div className="admin-error" style={{ borderColor: 'rgba(34,197,94,.35)', color: 'inherit' }}><CheckCircle2 /> {notice}</div>}
      {error && <div className="admin-error"><AlertTriangle /> {error}</div>}

      <AdminAnalytics data={data} percentages={percentages} bannedCount={bannedUsers.length} showBreakdown={tab === 'analytics'} />
      <AdminSystemStatus status={data?.status} />
      <nav className="admin-tabs" aria-label="Admin sections">{tabs.map(([id, label]) => <button className={tab === id ? 'active' : ''} type="button" key={id} onClick={() => setTab(id)}>{label}</button>)}</nav>

      {tab === 'users' && (
        <AdminUsers
          user={user}
          users={data?.users || []}
          pendingInvites={pendingInvites}
          inviteEmail={inviteEmail}
          inviteBusy={inviteBusy}
          roleBusy={roleBusy}
          deleteBusy={deleteBusy}
          banBusy={banBusy}
          resetBusy={resetBusy}
          onInviteEmailChange={(event) => setInviteEmail(event.target.value)}
          onAddAdmin={addAdmin}
          onRevokeInvite={revokeInvite}
          onChangeRole={changeRole}
          onResetPassword={resetPassword}
          onChangeBan={changeBan}
          onRemoveUser={removeUser}
        />
      )}

      {tab === 'security' && <AdminSecurity bannedUsers={bannedUsers} loginLog={data?.loginLog} visits={data?.securityVisits} visitSummary={data?.securityVisitSummary} securityEvents={data?.securityEvents} />}
      {tab === 'owner-log' && user?.isOwner && <AdminOwnerLog accounts={accountLog} />}
      {tab === 'api' && <AdminApiUsage requests={data?.apiUsage} />}
      {tab === 'errors' && <AdminErrors errors={data?.errors} />}
      {tab === 'feedback' && <AdminFeedback feedback={data?.feedback} />}
    </main>
  );
}
