import { useState } from 'react';
import { CheckCircle2, Clock, Headphones, Send, ShieldCheck } from 'lucide-react';
import { replySupportTicket, updateSupportTicketStatus } from '../lib/platform.js';
import { EmptyAdmin } from './AdminShared.jsx';

export default function AdminSupportTickets({ user, tickets = [], onRefresh }) {
  const [selectedId, setSelectedId] = useState(() => tickets[0]?.id || '');
  const [replyText, setReplyText] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const activeTicket = tickets.find((t) => t.id === selectedId) || tickets[0] || null;

  const handleReply = async (event) => {
    event.preventDefault();
    if (!activeTicket || !replyText.trim()) return;
    setBusy(true);
    setNotice('');
    try {
      await replySupportTicket({
        ticketId: activeTicket.id,
        message: replyText.trim(),
        senderName: user?.name || 'PathPilot Support',
        senderEmail: user?.email || '',
      });
      setReplyText('');
      setNotice('تم إرسال الرد وحفظه في التذكرة وإشعار المستخدم بالبريد.');
      if (onRefresh) await onRefresh();
    } finally {
      setBusy(false);
    }
  };

  const handleStatus = async (ticketId, status) => {
    await updateSupportTicketStatus(ticketId, status);
    if (onRefresh) await onRefresh();
  };

  if (!tickets.length) {
    return <EmptyAdmin>لا توجد تذاكر دعم مفتوحة حاليًا. ستظهر تذاكر المستخدمين هنا فور إرسالها.</EmptyAdmin>;
  }

  return (
    <section className="admin-panel">
      <div className="admin-section-head">
        <div>
          <h2><Headphones size={19} /> تذاكر الدعم والمراسلة المباشرة ({tickets.length})</h2>
          <p>رد مباشر من الإدارة والمالك مع إشعار تلقائي لبريد المستخدم من pathpilot.app00@gmail.com.</p>
        </div>
      </div>

      {notice && <div className="admin-error" style={{ borderColor: 'rgba(34,197,94,.4)', color: 'inherit' }}><CheckCircle2 size={16} /> {notice}</div>}

      <div className="support-workspace">
        <aside className="support-ticket-sidebar">
          <div className="support-ticket-list">
            {tickets.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`support-ticket-item ${activeTicket?.id === t.id ? 'selected' : ''}`}
                onClick={() => setSelectedId(t.id)}
              >
                <div className="support-ticket-item-top">
                  <strong>#{t.id}</strong>
                  <span className={`support-status-pill status-${t.status === 'in_progress' ? 'progress' : t.status}`}>{t.status}</span>
                </div>
                <div className="support-ticket-subject">{t.subject}</div>
                <small>{t.requester_name} ({t.requester_email})</small>
              </button>
            ))}
          </div>
        </aside>

        {activeTicket && (
          <div className="support-thread-pane">
            <div className="support-thread-header">
              <div>
                <strong>#{activeTicket.id} · {activeTicket.subject}</strong>
                <div><small>{activeTicket.requester_name} — {activeTicket.requester_email}</small></div>
              </div>
              <select value={activeTicket.status} onChange={(e) => handleStatus(activeTicket.id, e.target.value)}>
                <option value="open">open</option>
                <option value="in_progress">in_progress</option>
                <option value="resolved">resolved</option>
                <option value="closed">closed</option>
              </select>
            </div>

            <div className="support-messages-scroll">
              {(activeTicket.messages || []).map((msg) => {
                const staff = msg.sender_role === 'owner' || msg.sender_role === 'support';
                return (
                  <article key={msg.id} className={`support-msg-bubble ${staff ? 'staff' : 'requester'}`}>
                    <div className="support-msg-head">
                      <strong>{staff ? <ShieldCheck size={14} /> : null} {msg.sender_name}</strong>
                      <small><Clock size={12} /> {new Date(msg.created_at).toLocaleString('ar-EG')}</small>
                    </div>
                    <p>{msg.body}</p>
                  </article>
                );
              })}
            </div>

            <form className="support-reply-box" onSubmit={handleReply}>
              <textarea
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`اكتب ردًا رسميًا إلى ${activeTicket.requester_email}...`}
              />
              <button className="button button-primary" type="submit" disabled={busy || !replyText.trim()}>
                <Send size={16} /> {busy ? 'جاري الإرسال...' : 'إرسال الرد'}
              </button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
