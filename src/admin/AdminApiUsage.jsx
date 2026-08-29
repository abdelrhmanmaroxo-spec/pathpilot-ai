import { dateTime } from './admin-utils.js';
import { EmptyAdmin } from './AdminShared.jsx';

export default function AdminApiUsage({ requests }) {
  return <section className="admin-table-wrap">{requests?.length ? <table><thead><tr><th>Workspace</th><th>Tool</th><th>Model</th><th>Status</th><th>Latency</th><th>Time</th></tr></thead><tbody>{requests.map((item) => <tr key={item.id}><td>{item.workspace}</td><td>{item.tool}</td><td>{item.model || '—'}</td><td><span className={`request-status ${item.status}`}>{item.status}</span></td><td>{item.latency_ms == null ? '—' : `${item.latency_ms} ms`}</td><td>{dateTime(item.created_at)}</td></tr>)}</tbody></table> : <EmptyAdmin>لا توجد طلبات AI بعد.</EmptyAdmin>}</section>;
}
