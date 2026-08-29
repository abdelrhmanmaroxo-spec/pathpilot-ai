import { MessageSquareText } from 'lucide-react';
import { dateTime } from './admin-utils.js';
import { EmptyAdmin } from './AdminShared.jsx';

export default function AdminFeedback({ feedback }) {
  return <section className="admin-feed">{feedback?.length ? feedback.map((item) => <article key={item.id}><MessageSquareText /><div><strong>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</strong><p>{item.message || 'No written feedback'}</p><small>{item.user_name || 'Anonymous'} · {item.user_email || 'No signed-in email'} · {item.workspace || 'general'} · {item.tool || 'unknown'} · {dateTime(item.created_at)}</small></div></article>) : <EmptyAdmin>لا توجد ملاحظات بعد.</EmptyAdmin>}</section>;
}
