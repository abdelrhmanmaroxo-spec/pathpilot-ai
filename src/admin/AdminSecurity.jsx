import { Ban, LogIn } from 'lucide-react';
import { dateTime } from './admin-utils.js';
import { EmptyAdmin } from './AdminShared.jsx';

export default function AdminSecurity({ bannedUsers, loginLog }) {
  return (
    <section style={{ display: 'grid', gap: 18 }}>
      <article className="usage-card" style={{ display: 'block' }}>
        <div style={{ marginBottom: 12 }}><Ban /><span><strong>Ban List</strong><small>الحسابات المحظورة حاليًا. الـOwner يقدر يعمل Unban من Users.</small></span></div>
        {bannedUsers.length ? bannedUsers.map((item) => <div key={item.id} style={{ padding: '10px 0', borderTop: '1px solid rgba(148,163,184,.12)', display: 'flex', justifyContent: 'space-between', gap: 12 }}><span><strong>{item.name}</strong><small style={{ display: 'block' }}>{item.email}</small></span><span style={{ color: '#f87171' }}>Banned</span></div>) : <EmptyAdmin>لا توجد حسابات محظورة.</EmptyAdmin>}
      </article>
      <section className="admin-table-wrap">{loginLog?.length ? <table><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Method / Event</th><th>Login time</th></tr></thead><tbody>{loginLog.map((item) => <tr key={item.id}><td>{item.user_name || 'Deleted / unknown'}</td><td>{item.user_email || '—'}</td><td>{item.role || '—'}</td><td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><LogIn size={14} /> {item.event_type}</span></td><td>{dateTime(item.created_at)}</td></tr>)}</tbody></table> : <EmptyAdmin>لا توجد عمليات تسجيل دخول مسجلة بعد.</EmptyAdmin>}</section>
    </section>
  );
}
