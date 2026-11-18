import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Headphones,
  Mail,
  MessageSquarePlus,
  RefreshCw,
  Send,
  ShieldCheck,
  Ticket,
  X,
} from 'lucide-react';
import { getDocumentLanguage, subscribeLanguageChanges } from '../lib/language-state.js';
import {
  DEFAULT_SUPPORT_EMAIL,
  createSupportTicket,
  getSupportEmail,
  listSupportTickets,
  replySupportTicket,
} from '../lib/platform.js';

function statusBadgeMeta(status, en) {
  if (status === 'resolved') return { label: en ? 'Resolved' : 'تم الحل', cls: 'status-resolved' };
  if (status === 'in_progress') return { label: en ? 'In Progress' : 'قيد المتابعة', cls: 'status-progress' };
  if (status === 'closed') return { label: en ? 'Closed' : 'مغلقة', cls: 'status-closed' };
  return { label: en ? 'Open' : 'مفتوحة', cls: 'status-open' };
}

function categoryLabel(category, en) {
  const map = {
    technical: en ? 'Technical Issue' : 'مشكلة تقنية',
    account: en ? 'Account & Verification' : 'الحساب وكود التفعيل',
    suggestion: en ? 'Feature Request' : 'اقتراح تطوير',
    other: en ? 'General Inquiry' : 'استفسار عام',
  };
  return map[category] || map.technical;
}

export default function SupportCenterModal({ open, onClose, user, initialTab = 'new' }) {
  const [uiLanguage, setUiLanguage] = useState(() => getDocumentLanguage());
  const en = uiLanguage === 'en';
  const supportEmail = getSupportEmail() || DEFAULT_SUPPORT_EMAIL;

  const safeInitialTab = ['new', 'mine', 'direct'].includes(initialTab) ? initialTab : 'new';
  const [tab, setTab] = useState(safeInitialTab);
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    category: 'technical',
    priority: 'normal',
    subject: '',
    message: '',
  });
  const [lookupEmail, setLookupEmail] = useState(user?.email || '');
  const [lookupTicketId, setLookupTicketId] = useState('');
  const [myTickets, setMyTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => subscribeLanguageChanges(setUiLanguage), []);

  const loadTickets = useCallback(async (targetEmail = '') => {
    const effectiveEmail = targetEmail || user?.email || lookupEmail;
    if (!effectiveEmail) return;
    try {
      const list = await listSupportTickets({ email: effectiveEmail, ticketId: lookupTicketId });
      setMyTickets(list);
      setSelectedTicket((prev) => (prev ? list.find((t) => t.id === prev.id) || list[0] || null : list[0] || null));
    } catch {
      // Keep current ticket view if offline
    }
  }, [lookupEmail, lookupTicketId, user?.email]);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setForm((prev) => ({
        ...prev,
        name: user?.name || prev.name,
        email: user?.email || prev.email,
      }));
      if (user?.email) setLookupEmail(user.email);
      loadTickets(user?.email || '');
    });
    return () => { active = false; };
  }, [open, user?.name, user?.email, loadTickets]);

  if (!open) return null;

  const handleCreateTicket = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await createSupportTicket(form);
      const created = result.ticket;
      setLookupEmail(created.requester_email);
      await loadTickets(created.requester_email);
      setSelectedTicket(created);
      setForm((prev) => ({ ...prev, subject: '', message: '' }));
      setNotice(
        en
          ? `Ticket #${created.id} submitted successfully. Our support team will respond shortly.`
          : `تم تسجيل تذكرتك رقم #${created.id} بنجاح، وسيقوم فريق الدعم بالرد عليك في أقرب وقت.`,
      );
      setTab('mine');
    } catch (err) {
      setError(err?.message || (en ? 'Could not create ticket.' : 'تعذر فتح التذكرة حاليًا.'));
    } finally {
      setBusy(false);
    }
  };

  const handleSendReply = async (event) => {
    event.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await replySupportTicket({
        ticketId: selectedTicket.id,
        message: replyText.trim(),
        senderName: user?.name || form.name || selectedTicket.requester_name,
        senderEmail: user?.email || lookupEmail || selectedTicket.requester_email,
      });
      setReplyText('');
      setSelectedTicket(result.ticket);
      await loadTickets(lookupEmail);
      setNotice(en ? 'Your reply has been sent to support.' : 'تم إرسال رسالتك إلى فريق الدعم بنجاح.');
    } catch (err) {
      setError(err?.message || (en ? 'Failed to send reply.' : 'تعذر إرسال الرد.'));
    } finally {
      setBusy(false);
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard?.writeText(supportEmail).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return createPortal(
    <div
      className="account-overlay support-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section className="support-center-modal" role="dialog" aria-modal="true" aria-labelledby="support-center-title" dir={en ? 'ltr' : 'rtl'}>
        <header className="support-center-header">
          <div className="support-header-brand">
            <span className="support-header-icon"><Headphones size={22} /></span>
            <div>
              <span className="support-kicker">PATHPILOT SUPPORT</span>
              <h2 id="support-center-title">{en ? 'Help & Support Center' : 'مركز المساعدة والدعم الفني'}</h2>
            </div>
          </div>
          <button className="account-panel-close" type="button" onClick={onClose} aria-label={en ? 'Close' : 'إغلاق'}>
            <X size={19} />
          </button>
        </header>

        <nav className="support-tabs">
          <button type="button" className={tab === 'new' ? 'active' : ''} onClick={() => { setTab('new'); setError(''); setNotice(''); }}>
            <MessageSquarePlus size={16} />
            <span>{en ? 'Open New Ticket' : 'فتح تذكرة جديدة'}</span>
          </button>
          <button type="button" className={tab === 'mine' ? 'active' : ''} onClick={() => { setTab('mine'); loadTickets(); }}>
            <Ticket size={16} />
            <span>{en ? 'My Tickets' : 'تذاكري ومتابعة الردود'} ({myTickets.length})</span>
          </button>
          <button type="button" className={tab === 'direct' ? 'active' : ''} onClick={() => setTab('direct')}>
            <Mail size={16} />
            <span>{en ? 'Contact Email' : 'البريد الرسمي للدعم'}</span>
          </button>
        </nav>

        {notice && <div className="support-banner success"><CheckCircle2 size={17} /> <span>{notice}</span></div>}
        {error && <div className="support-banner danger"><span>{error}</span></div>}

        <div className="support-center-body">
          {tab === 'new' && (
            <form className="support-ticket-form" onSubmit={handleCreateTicket}>
              <p className="support-lead">
                {en
                  ? 'Tell us how we can help. You will receive a ticket number immediately to follow up on responses.'
                  : 'اكتب تفاصيل استفسارك أو المشكلة التي تواجهك، وسيظهر لك رقم التذكرة فورًا لمتابعة رد فريق الدعم.'}
              </p>
              <div className="support-grid-2">
                <label>
                  <span>{en ? 'Your Name' : 'الاسم'}</span>
                  <input
                    required
                    minLength={2}
                    maxLength={80}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={en ? 'Full name' : 'اكتب اسمك'}
                  />
                </label>
                <label>
                  <span>{en ? 'Your Email' : 'البريد الإلكتروني'}</span>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="name@example.com"
                  />
                </label>
              </div>

              <div className="support-grid-2">
                <label>
                  <span>{en ? 'Category' : 'القسم'}</span>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="technical">{en ? 'Technical Issue' : 'مشكلة تقنية'}</option>
                    <option value="account">{en ? 'Account & Sign-In' : 'الحساب وتسجيل الدخول'}</option>
                    <option value="suggestion">{en ? 'Feature Request' : 'اقتراح تطوير'}</option>
                    <option value="other">{en ? 'General Inquiry' : 'استفسار عام'}</option>
                  </select>
                </label>
                <label>
                  <span>{en ? 'Priority' : 'الأولوية'}</span>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <option value="normal">{en ? 'Normal' : 'عادية'}</option>
                    <option value="high">{en ? 'High' : 'مرتفعة'}</option>
                    <option value="urgent">{en ? 'Urgent' : 'عاجلة'}</option>
                  </select>
                </label>
              </div>

              <label>
                <span>{en ? 'Subject' : 'عنوان الطلب'}</span>
                <input
                  required
                  minLength={3}
                  maxLength={160}
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder={en ? 'Short summary of your request...' : 'ملخص سريع للموضوع...'}
                />
              </label>

              <label>
                <span>{en ? 'Message' : 'التفاصيل'}</span>
                <textarea
                  required
                  minLength={5}
                  maxLength={4000}
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder={en ? 'Explain everything clearly so our team can assist you...' : 'اشرح التفاصيل هنا بوضوح لنتمكن من مساعدتك بأسرع وقت...'}
                />
              </label>

              <div className="support-form-actions">
                <button className="button button-primary" type="submit" disabled={busy}>
                  <Send size={16} />
                  <span>{busy ? (en ? 'Sending...' : 'جاري الإرسال...') : (en ? 'Submit Ticket' : 'إرسال تذكرة الدعم')}</span>
                </button>
              </div>
            </form>
          )}

          {tab === 'mine' && (
            <div className="support-workspace">
              <aside className="support-ticket-sidebar">
                <div className="support-lookup-box">
                  <input
                    type="email"
                    value={lookupEmail}
                    onChange={(e) => setLookupEmail(e.target.value)}
                    placeholder={en ? 'Your email address' : 'بريدك الإلكتروني لعرض تذاكرك'}
                  />
                  <div className="support-lookup-row">
                    <input
                      value={lookupTicketId}
                      onChange={(e) => setLookupTicketId(e.target.value)}
                      placeholder={en ? 'Ticket # (optional)' : 'رقم التذكرة (اختياري)'}
                    />
                    <button className="button button-ghost" type="button" onClick={() => loadTickets(lookupEmail)}>
                      <RefreshCw size={15} />
                    </button>
                  </div>
                </div>

                <div className="support-ticket-list">
                  {myTickets.length === 0 ? (
                    <div className="support-empty-list">
                      <Ticket size={28} />
                      <p>{en ? 'No tickets found yet.' : 'لا توجد تذاكر مسجلة لهذا البريد بعد.'}</p>
                    </div>
                  ) : (
                    myTickets.map((item) => {
                      const badge = statusBadgeMeta(item.status, en);
                      return (
                        <button
                          type="button"
                          key={item.id}
                          className={`support-ticket-item ${selectedTicket?.id === item.id ? 'selected' : ''}`}
                          onClick={() => setSelectedTicket(item)}
                        >
                          <div className="support-ticket-item-top">
                            <strong>#{item.id}</strong>
                            <span className={`support-status-pill ${badge.cls}`}>{badge.label}</span>
                          </div>
                          <div className="support-ticket-subject">{item.subject}</div>
                          <small>{categoryLabel(item.category, en)}</small>
                        </button>
                      );
                    })
                  )}
                </div>
              </aside>

              <div className="support-thread-pane">
                {!selectedTicket ? (
                  <div className="support-empty-thread">
                    <Headphones size={36} />
                    <h3>{en ? 'Select a ticket to view replies' : 'اختر تذكرة لعرض المحادثة والردود'}</h3>
                  </div>
                ) : (
                  <>
                    <div className="support-thread-header">
                      <div>
                        <div className="support-thread-meta">
                          <strong>#{selectedTicket.id}</strong>
                          <span className={`support-status-pill ${statusBadgeMeta(selectedTicket.status, en).cls}`}>
                            {statusBadgeMeta(selectedTicket.status, en).label}
                          </span>
                          <span>{categoryLabel(selectedTicket.category, en)}</span>
                        </div>
                        <h3>{selectedTicket.subject}</h3>
                      </div>
                    </div>

                    <div className="support-messages-scroll">
                      {(selectedTicket.messages || []).map((msg) => {
                        const fromSupport = msg.sender_role === 'owner' || msg.sender_role === 'support';
                        return (
                          <article key={msg.id} className={`support-msg-bubble ${fromSupport ? 'staff' : 'requester'}`}>
                            <div className="support-msg-head">
                              <strong>
                                {fromSupport ? <ShieldCheck size={14} /> : null}
                                {' '}
                                {fromSupport ? (en ? 'PathPilot Support' : 'فريق دعم PathPilot') : msg.sender_name}
                              </strong>
                              <small><Clock size={12} /> {new Date(msg.created_at).toLocaleString(en ? 'en-US' : 'ar-EG')}</small>
                            </div>
                            <p>{msg.body}</p>
                          </article>
                        );
                      })}
                    </div>

                    {selectedTicket.status !== 'closed' && (
                      <form className="support-reply-box" onSubmit={handleSendReply}>
                        <textarea
                          rows={3}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={en ? 'Write a reply...' : 'اكتب ردك أو رسالتك الإضافية...'}
                        />
                        <button className="button button-primary" type="submit" disabled={busy || !replyText.trim()}>
                          <Send size={16} />
                          <span>{busy ? (en ? 'Sending...' : 'جاري الإرسال...') : (en ? 'Send Reply' : 'إرسال')}</span>
                        </button>
                      </form>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {tab === 'direct' && (
            <div className="support-direct-card">
              <div className="support-direct-badge"><Mail size={28} /></div>
              <h3>{en ? 'Official Support Email' : 'البريد الرسمي للدعم الفني'}</h3>
              <p>
                {en
                  ? 'Reach out directly via email anytime or submit a ticket for faster structured follow-up.'
                  : 'تواصل معنا مباشرة عبر البريد الرسمي في أي وقت، أو افتح تذكرة لمتابعة الردود مباشرة داخل المنصة.'}
              </p>
              <div className="support-email-pill">
                <code>{supportEmail}</code>
                <button className="button button-ghost" type="button" onClick={handleCopyEmail}>
                  <Copy size={15} />
                  <span>{copied ? (en ? 'Copied!' : 'تم النسخ!') : (en ? 'Copy Email' : 'نسخ البريد')}</span>
                </button>
              </div>
              <div className="support-direct-actions">
                <a
                  className="button button-primary"
                  href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(supportEmail)}&su=${encodeURIComponent('دعم PathPilot AI')}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={16} />
                  <span>{en ? 'Send via Gmail' : 'مراسلة عبر Gmail'}</span>
                </a>
                <a className="button button-ghost" href={`mailto:${supportEmail}?subject=${encodeURIComponent('PathPilot Support')}`}>
                  <Mail size={16} />
                  <span>{en ? 'Open Mail App' : 'فتح تطبيق البريد'}</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
