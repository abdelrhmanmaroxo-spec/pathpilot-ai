import { Ban, Eye, LogIn, MonitorSmartphone, ShieldCheck } from 'lucide-react';
import { dateTime } from './admin-utils.js';
import { EmptyAdmin } from './AdminShared.jsx';

function shortAnonymousId(value) {
  const text = String(value || '');
  if (!text) return '—';
  return text.length > 18 ? `${text.slice(0, 9)}…${text.slice(-6)}` : text;
}

export default function AdminSecurity({ bannedUsers, loginLog, visitorLog = [], visitorRetentionDays = 30 }) {
  return (
    <section style={{ display: 'grid', gap: 18 }}>
      <article className="usage-card" style={{ display: 'block' }}>
        <div style={{ marginBottom: 12 }}><Ban /><span><strong>Ban List</strong><small>الحسابات المحظورة حاليًا. الـAdmin يقدر يفك الحظر عن User عادي من Users، والـOwner يظل صاحب صلاحيات الحسابات الإدارية.</small></span></div>
        {bannedUsers.length ? bannedUsers.map((item) => <div key={item.id} style={{ padding: '10px 0', borderTop: '1px solid rgba(148,163,184,.12)', display: 'flex', justifyContent: 'space-between', gap: 12 }}><span><strong>{item.name}</strong><small style={{ display: 'block' }}>{item.email}</small></span><span style={{ color: '#f87171' }}>Banned</span></div>) : <EmptyAdmin>لا توجد حسابات محظورة.</EmptyAdmin>}
      </article>

      <article className="usage-card" style={{ display: 'block' }}>
        <div style={{ marginBottom: 12 }}>
          <ShieldCheck />
          <span>
            <strong>Visitor Security Log</strong>
            <small>Security-focused visit records only. IP/User-Agent records are kept for {visitorRetentionDays} days; no canvas, font, hardware-ID, or hidden device fingerprinting is collected.</small>
          </span>
        </div>
        <section className="admin-table-wrap">
          {visitorLog.length ? (
            <table>
              <thead><tr><th>Identity</th><th>IP</th><th>Device</th><th>Route</th><th>Locale</th><th>Seen</th></tr></thead>
              <tbody>
                {visitorLog.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {item.authenticated ? <LogIn size={14} /> : <Eye size={14} />}
                        <span>
                          <strong style={{ display: 'block' }}>{item.userName || (item.authenticated ? 'Signed-in user' : 'Guest visitor')}</strong>
                          <small title={item.anonymousId || ''}>{item.userEmail || `Anon ${shortAnonymousId(item.anonymousId)}`}</small>
                        </span>
                      </span>
                    </td>
                    <td><code>{item.ip || 'unknown'}</code></td>
                    <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><MonitorSmartphone size={14} /> {item.device || 'Unknown device'}</span><small style={{ display: 'block', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.userAgent || ''}>{item.userAgent || '—'}</small></td>
                    <td>{item.route || 'home'}</td>
                    <td>{[item.language, item.timezone].filter(Boolean).join(' · ') || '—'}</td>
                    <td>{dateTime(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyAdmin>No visitor security records yet.</EmptyAdmin>}
        </section>
      </article>

      <section className="admin-table-wrap">{loginLog?.length ? <table><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Method / Event</th><th>Login time</th></tr></thead><tbody>{loginLog.map((item) => <tr key={item.id}><td>{item.user_name || 'Deleted / unknown'}</td><td>{item.user_email || '—'}</td><td>{item.role || '—'}</td><td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><LogIn size={14} /> {item.event_type}</span></td><td>{dateTime(item.created_at)}</td></tr>)}</tbody></table> : <EmptyAdmin>لا توجد عمليات تسجيل دخول مسجلة بعد.</EmptyAdmin>}</section>
    </section>
  );
}