import {
  Activity, Ban, Clock3, Globe2, LogIn, MonitorSmartphone, ShieldAlert, UserCheck, UsersRound,
} from 'lucide-react';
import { dateTime } from './admin-utils.js';
import { EmptyAdmin } from './AdminShared.jsx';

function visitorLabel(item) {
  if (item.isGuest) return `Guest · ${String(item.visitor_id || '').slice(0, 8)}`;
  return item.user_name || item.user_email || 'Deleted account';
}

function severityColor(severity) {
  if (severity === 'critical' || severity === 'high') return '#f87171';
  if (severity === 'medium') return '#fbbf24';
  return '#86efac';
}

export default function AdminSecurity({ bannedUsers = [], loginLog = [], visits = [], visitSummary, securityEvents = [] }) {
  const metrics = [
    [UsersRound, 'Visitors', visitSummary?.uniqueVisitors || 0, `${visitSummary?.guestVisitors || 0} guests`],
    [Activity, 'Active 24h', visitSummary?.activeLast24h || 0, `${visitSummary?.recordedEntries || 0} recorded entries`],
    [Globe2, 'Unique IPs', visitSummary?.uniqueIps || 0, 'Server-observed addresses'],
    [UserCheck, 'Signed-in', visitSummary?.signedInUsers || 0, `${visitSummary?.retentionDays || 30}-day retention`],
  ];

  return (
    <section className="admin-security-section">
      <div className="admin-metrics admin-security-metrics">
        {metrics.map(([Icon, label, value, note]) => (
          <article className="admin-metric" key={label}>
            <span><Icon /></span><div><small>{label}</small><strong>{value}</strong><p>{note}</p></div>
          </article>
        ))}
      </div>

      <article className="usage-card admin-security-note">
        <div><ShieldAlert /><span><strong>Security visibility</strong><small>IP and basic browser/device context are recorded for abuse response only. No GPS, passwords, API keys or hidden device fingerprinting. Records expire automatically.</small></span></div>
      </article>

      <article className="usage-card" style={{ display: 'block' }}>
        <div style={{ marginBottom: 12 }}><Ban /><span><strong>Ban List</strong><small>الحسابات المحظورة حاليًا. يمكن للـAdmin أو الـOwner المسموح له عمل Unban من قسم Users.</small></span></div>
        {bannedUsers.length ? bannedUsers.map((item) => <div key={item.id} style={{ padding: '10px 0', borderTop: '1px solid rgba(148,163,184,.12)', display: 'flex', justifyContent: 'space-between', gap: 12 }}><span><strong>{item.name}</strong><small style={{ display: 'block' }}>{item.email}</small><small className="admin-cell-note">{item.disabled_reason || 'Policy or security review'} · {dateTime(item.disabled_at)}{item.disabled_by_name ? ` · by ${item.disabled_by_name}` : ''}</small></span><span style={{ color: '#f87171' }}>Banned</span></div>) : <EmptyAdmin>لا توجد حسابات محظورة.</EmptyAdmin>}
      </article>

      <div>
        <h2 className="admin-section-title">Visitor security log</h2>
        <p className="admin-section-copy">الزوار غير المسجلين يظهرون كـGuest، والحسابات المسجلة مرتبطة باسمها وبريدها. الـIP هنا عنوان شبكة وليس موقع GPS.</p>
        <section className="admin-table-wrap">{visits.length ? <table><thead><tr><th>Visitor</th><th>IP address</th><th>Device</th><th>Locale</th><th>Route / Source</th><th>First seen</th><th>Last seen</th><th>Count</th></tr></thead><tbody>{visits.map((item) => <tr key={item.id}><td><strong>{visitorLabel(item)}</strong>{item.user_email && <small className="admin-cell-note">{item.user_email}{item.user_disabled ? ' · Banned' : ''}</small>}</td><td><code>{item.ip_address || 'unknown'}</code></td><td title={item.user_agent || ''}><span className="admin-icon-text"><MonitorSmartphone size={14} /> {item.device || 'Unknown device'}</span><small className="admin-cell-note">{item.screen || 'Unknown screen'}</small></td><td>{item.language || '—'}<small className="admin-cell-note">{item.timezone || 'Unknown timezone'}</small></td><td>{item.path || '/'}<small className="admin-cell-note">{item.referrer_host ? `From ${item.referrer_host}` : 'Direct / unknown'}</small></td><td>{dateTime(item.first_seen_at)}</td><td>{dateTime(item.last_seen_at)}</td><td>{item.visit_count || 1}</td></tr>)}</tbody></table> : <EmptyAdmin>لا توجد زيارات أمنية مسجلة بعد.</EmptyAdmin>}</section>
      </div>

      <div>
        <h2 className="admin-section-title">Login log</h2>
        <section className="admin-table-wrap">{loginLog.length ? <table><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Event</th><th>IP</th><th>Device</th><th>Login time</th></tr></thead><tbody>{loginLog.map((item) => <tr key={item.id}><td>{item.user_name || 'Deleted / unknown'}</td><td>{item.user_email || '—'}</td><td>{item.role || '—'}</td><td><span className="admin-icon-text"><LogIn size={14} /> {item.event_key || item.event_type}</span></td><td><code>{item.ip || '—'}</code></td><td>{item.device || 'Unknown device'}</td><td>{dateTime(item.created_at)}</td></tr>)}</tbody></table> : <EmptyAdmin>لا توجد عمليات تسجيل دخول مسجلة بعد.</EmptyAdmin>}</section>
      </div>

      <div>
        <h2 className="admin-section-title">Blocked & administrative security events</h2>
        <section className="admin-table-wrap">{securityEvents.length ? <table><thead><tr><th>Severity</th><th>Event</th><th>IP</th><th>Path</th><th>Details</th><th>Time</th></tr></thead><tbody>{securityEvents.map((item) => <tr key={item.id}><td><strong style={{ color: severityColor(item.severity) }}>{item.severity}</strong></td><td>{item.event_type}</td><td><code>{item.ip || '—'}</code></td><td>{item.path || '—'}</td><td title={item.details || ''}>{item.details || '—'}</td><td><span className="admin-icon-text"><Clock3 size={14} /> {dateTime(item.created_at)}</span></td></tr>)}</tbody></table> : <EmptyAdmin>لا توجد محاولات محظورة أو أحداث أمان بعد.</EmptyAdmin>}</section>
      </div>
    </section>
  );
}
