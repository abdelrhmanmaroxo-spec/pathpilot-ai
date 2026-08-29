import { AlertTriangle } from 'lucide-react';
import { dateTime } from './admin-utils.js';
import { EmptyAdmin } from './AdminShared.jsx';

export default function AdminErrors({ errors }) {
  return <section className="admin-feed">{errors?.length ? errors.map((item) => <article key={item.id}><AlertTriangle /><div><strong>{item.message}</strong><p>{item.context}</p><small>{dateTime(item.created_at)}</small></div></article>) : <EmptyAdmin>لا توجد أخطاء مسجلة.</EmptyAdmin>}</section>;
}
