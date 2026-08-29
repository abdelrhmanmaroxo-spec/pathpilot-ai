import { dateTime } from './admin-utils.js';
import { EmptyAdmin } from './AdminShared.jsx';

export default function AdminOwnerLog({ accounts }) {
  return <section className="admin-table-wrap">{accounts?.length ? <table><thead><tr><th>Name</th><th>Email</th><th>Provider</th><th>Status</th><th>Role</th><th>Created</th><th>Login count</th><th>Last login</th></tr></thead><tbody>{accounts.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.email}</td><td>{item.auth_provider || 'password'}</td><td>{item.disabled ? 'Banned' : 'Active'}</td><td>{item.isOwner ? 'Owner' : item.role}</td><td>{dateTime(item.created_at)}</td><td>{item.loginCount ?? 0}</td><td>{dateTime(item.lastLoginAt)}</td></tr>)}</tbody></table> : <EmptyAdmin>لا توجد بيانات حسابات بعد.</EmptyAdmin>}</section>;
}
