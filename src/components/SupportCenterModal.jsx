import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Headphones,
  Inbox,
  Link2,
  Mail,
  MessageSquarePlus,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Ticket,
  X,
} from 'lucide-react';
import { getDocumentLanguage, subscribeLanguageChanges } from '../lib/language-state.js';
import {
  DEFAULT_SUPPORT_EMAIL,
  createSupportTicket,
  getFreeCloudConfig,
  getSupportEmail,
  listSupportTickets,
  replySupportTicket,
  saveFreeCloudConfig,
  testFreeCloudBridge,
  updateSupportTicketStatus,
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
  const isStaff = Boolean(user && (user.role === 'admin' || user.isOwner));
  const supportEmail = getSupportEmail() || DEFAULT_SUPPORT_EMAIL;

  const [tab, setTab] = useState(initialTab);
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
  const [allTickets, setAllTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Free Cloud Bridge Settings (Owner only)
  const [cloudCfg, setCloudCfg] = useState(() => getFreeCloudConfig());
  const [bridgeTestBusy, setBridgeTestBusy] = useState(false);
  const [bridgeNotice, setBridgeNotice] = useState('');

  useEffect(() => subscribeLanguageChanges(setUiLanguage), []);

  const loadTickets = useCallback(async (targetEmail = '') => {
    const effectiveEmail = targetEmail || user?.email || lookupEmail;
    try {
      if (effectiveEmail) {
        const list = await listSupportTickets({ email: effectiveEmail, ticketId: lookupTicketId });
        setMyTickets(list);
        setSelectedTicket((prev) => (prev ? list.find((t) => t.id === prev.id) || list[0] || null : list[0] || null));
      }
      if (isStaff) {
        const adminList = await listSupportTickets({ includeAll: true });
        setAllTickets(adminList);
      }
    } catch {
      // Keep current ticket view if offline
    }
  }, [isStaff, lookupEmail, lookupTicketId, user?.email]);

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
      setCloudCfg(getFreeCloudConfig());
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
          ? `Ticket #${created.id} created! You can track replies right here or via ${supportEmail}.`
          : `تم فتح التذكرة رقم #${created.id} بنجاح! يمكنك متابعة الردود مباشرة هنا أو عبر بريدك.`,
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
      setNotice(
        result.emailDelivered
          ? (en ? 'Reply sent in-app and delivered by email!' : 'تم إرسال الرد داخل المنصة وإشعار البريد تلقائيًا!')
          : (en ? 'Reply saved in ticket conversation!' : 'تم إرسال الرد وحفظه في محادثة التذكرة!'),
      );
    } catch (err) {
      setError(err?.message || (en ? 'Failed to send reply.' : 'تعذر إرسال الرد.'));
    } finally {
      setBusy(false);
    }
  };

  const handleStatusChange = async (ticketId, nextStatus) => {
    try {
      const updated = await updateSupportTicketStatus(ticketId, nextStatus);
      setSelectedTicket(updated);
      await loadTickets(lookupEmail);
    } catch (err) {
      setError(err?.message || 'Status update failed.');
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard?.writeText(supportEmail).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleSaveCloudConfig = async (event) => {
    event.preventDefault();
    const saved = saveFreeCloudConfig({
      bridgeUrl: cloudCfg.bridgeUrl,
      geminiApiKey: cloudCfg.geminiApiKey,
      geminiModel: cloudCfg.geminiModel,
    });
    setCloudCfg(saved);
    setBridgeNotice(
      en
        ? 'Free Cloud settings saved! Testing connection...'
        : 'تم حفظ إعدادات الربط المجاني! جاري اختبار الاتصال ببريد التطبيق...',
    );
    if (saved.bridgeUrl) {
      setBridgeTestBusy(true);
      const ping = await testFreeCloudBridge();
      setBridgeTestBusy(false);
      setBridgeNotice(
        ping.ok
          ? (en ? `Connected live to ${supportEmail} Free Mailer!` : `تم الاتصال بنجاح ببريد التطبيق المجاني (${supportEmail})!`)
          : (en ? 'Saved URL, but ping failed. Check Web App access = Anyone.' : 'تم حفظ الرابط، لكن تعذر الاتصال. تأكد أن صلاحية Web App في Google Script مضبوطة على Anyone.'),
      );
    } else {
      setBridgeNotice(en ? 'Settings saved locally.' : 'تم حفظ الإعدادات بنجاح.');
    }
  };

  const activeList = tab === 'admin'
    ? allTickets.filter((t) => (statusFilter === 'all' ? true : t.status === statusFilter))
    : myTickets;

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
              <span className="support-kicker">PATHPILOT SUPPORT & TICKETS</span>
              <h2 id="support-center-title">{en ? 'Support Center & Live Ticket Desk' : 'مركز الدعم الفني وتذاكر المساعدة'}</h2>
            </div>
          </div>
          <button className="account-panel-close" type="button" onClick={onClose} aria-label={en ? 'Close' : 'إغلاق'}>
            <X size={19} />
          </button>
        </header>

        <nav className="support-tabs">
          <button type="button" className={tab === 'new' ? 'active' : ''} onClick={() => { setTab('new'); setError(''); setNotice(''); }}>
            <MessageSquarePlus size={16} />
            <span>{en ? 'Open New Ticket' : 'فتح تيكت جديد'}</span>
          </button>
          <button type="button" className={tab === 'mine' ? 'active' : ''} onClick={() => { setTab('mine'); loadTickets(); }}>
            <Ticket size={16} />
            <span>{en ? 'My Tickets & Replies' : 'تذاكري والمراسلات'} ({myTickets.length})</span>
          </button>
          <button type="button" className={tab === 'direct' ? 'active' : ''} onClick={() => setTab('direct')}>
            <Mail size={16} />
            <span>{en ? 'Direct Email' : 'مراسلة البريد الرسمي'}</span>
          </button>
          {isStaff && (
            <button type="button" className={tab === 'admin' ? 'active owner-tab-btn' : 'owner-tab-btn'} onClick={() => { setTab('admin'); loadTickets(); }}>
              <Inbox size={16} />
              <span>{en ? 'Support Inbox (Owner)' : 'صندوق الإدارة والرد'} ({allTickets.length})</span>
            </button>
          )}
          {user?.isOwner && (
            <button type="button" className={tab === 'cloud' ? 'active owner-tab-btn' : 'owner-tab-btn'} onClick={() => setTab('cloud')}>
              <Sparkles size={16} />
              <span>{en ? 'Free Mail Bridge' : 'ربط البريد المجاني'}</span>
            </button>
          )}
        </nav>

        {notice && <div className="support-banner success"><CheckCircle2 size={17} /> <span>{notice}</span></div>}
        {error && <div className="support-banner danger"><span>{error}</span></div>}

        <div className="support-center-body">
          {tab === 'new' && (
            <form className="support-ticket-form" onSubmit={handleCreateTicket}>
              <p className="support-lead">
                {en
                  ? `Describe your issue or request below. A ticket ID will be generated immediately and routed to ${supportEmail}.`
                  : `اشرح المشكلة أو طلبك بالأسفل، وسيتم إصدار رقم تذكرة فوري وإرساله لفريق الدعم عبر (${supportEmail}) مع إمكانية متابعة الردود هنا مباشرة.`}
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
                  <span>{en ? 'Your Email (for replies)' : 'بريدك الإلكتروني (لاستلام الرد)'}</span>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="name@gmail.com"
                  />
                </label>
              </div>

              <div className="support-grid-2">
                <label>
                  <span>{en ? 'Category' : 'نوع المشكلة / الطلب'}</span>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="technical">{en ? 'Technical Issue' : 'مشكلة تقنية في المنصة'}</option>
                    <option value="account">{en ? 'Account & Verification Code' : 'الحساب وكود التفعيل'}</option>
                    <option value="suggestion">{en ? 'Feature Suggestion' : 'اقتراح ميزة أو تطوير'}</option>
                    <option value="other">{en ? 'General Question' : 'استفسار عام'}</option>
                  </select>
                </label>
                <label>
                  <span>{en ? 'Priority' : 'الأهمية'}</span>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <option value="normal">{en ? 'Normal' : 'عادية'}</option>
                    <option value="high">{en ? 'High' : 'مهمة'}</option>
                    <option value="urgent">{en ? 'Urgent' : 'عاجلة'}</option>
                  </select>
                </label>
              </div>

              <label>
                <span>{en ? 'Subject' : 'عنوان التذكرة'}</span>
                <input
                  required
                  minLength={3}
                  maxLength={160}
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder={en ? 'Brief summary of your issue...' : 'مثال: استفسار عن تفعيل الحساب أو ملخص PDF...'}
                />
              </label>

              <label>
                <span>{en ? 'Details' : 'تفاصيل الرسالة'}</span>
                <textarea
                  required
                  minLength={5}
                  maxLength={4000}
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder={en ? 'Write all details so we can help quickly...' : 'اكتب كل التفاصيل هنا عشان نقدر نساعدك بأسرع وقت...'}
                />
              </label>

              <div className="support-form-actions">
                <button className="button button-primary" type="submit" disabled={busy}>
                  <Send size={16} />
                  <span>{busy ? (en ? 'Submitting...' : 'جاري فتح التذكرة...') : (en ? 'Submit Support Ticket' : 'فتح التذكرة وإرسال للدعم')}</span>
                </button>
              </div>
            </form>
          )}

          {(tab === 'mine' || tab === 'admin') && (
            <div className="support-workspace">
              <aside className="support-ticket-sidebar">
                {tab === 'mine' ? (
                  <div className="support-lookup-box">
                    <input
                      type="email"
                      value={lookupEmail}
                      onChange={(e) => setLookupEmail(e.target.value)}
                      placeholder={en ? 'Your email to find tickets' : 'بريدك الإلكتروني لعرض تذاكرك'}
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
                ) : (
                  <div className="support-filter-bar">
                    {['all', 'open', 'in_progress', 'resolved'].map((st) => (
                      <button
                        key={st}
                        type="button"
                        className={statusFilter === st ? 'active' : ''}
                        onClick={() => setStatusFilter(st)}
                      >
                        {st === 'all' ? (en ? 'All' : 'الكل') : statusBadgeMeta(st, en).label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="support-ticket-list">
                  {activeList.length === 0 ? (
                    <div className="support-empty-list">
                      <Ticket size={28} />
                      <p>{en ? 'No tickets found yet.' : 'لا توجد تذاكر مسجلة حاليًا.'}</p>
                    </div>
                  ) : (
                    activeList.map((item) => {
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
                          <small>{item.requester_name} · {categoryLabel(item.category, en)}</small>
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
                    <h3>{en ? 'Select a ticket to view conversation' : 'اختر تذكرة لعرض المحادثة والردود'}</h3>
                    <p>{en ? 'Or open a new ticket if you need assistance.' : 'أو اضغط (فتح تيكت جديد) لمراسلة الدعم الفني.'}</p>
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
                        <small>{selectedTicket.requester_name} ({selectedTicket.requester_email})</small>
                      </div>
                      {isStaff && (
                        <div className="support-staff-controls">
                          <select
                            value={selectedTicket.status}
                            onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
                            aria-label="Ticket status"
                          >
                            <option value="open">{en ? 'Open' : 'مفتوحة'}</option>
                            <option value="in_progress">{en ? 'In Progress' : 'قيد المتابعة'}</option>
                            <option value="resolved">{en ? 'Resolved' : 'تم الحل'}</option>
                            <option value="closed">{en ? 'Closed' : 'مغلقة'}</option>
                          </select>
                        </div>
                      )}
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
                                {msg.sender_name}
                                {fromSupport ? ` (${en ? 'Official Support' : 'الدعم الرسمي'})` : ''}
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
                          placeholder={
                            isStaff && tab === 'admin'
                              ? (en ? `Write official support reply (auto-emails ${selectedTicket.requester_email})...` : `اكتب رد الدعم الرسمي (يُرسل للمحادثة ولبريد ${selectedTicket.requester_email})...`)
                              : (en ? 'Write a follow-up message on this ticket...' : 'اكتب رسالة متابعة على هذه التذكرة...')
                          }
                        />
                        <button className="button button-primary" type="submit" disabled={busy || !replyText.trim()}>
                          <Send size={16} />
                          <span>{busy ? (en ? 'Sending...' : 'جاري الإرسال...') : (en ? 'Send Reply' : 'إرسال الرد')}</span>
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
              <h3>{en ? 'Official PathPilot Support Mailbox' : 'البريد الرسمي لدعم منصة PathPilot AI'}</h3>
              <p>
                {en
                  ? 'You can message our support team directly by email or open an in-app ticket for structured tracking.'
                  : 'يمكنك مراسلة فريق الدعم مباشرة عبر البريد الرسمي للتطبيق، أو فتح تذكرة من التبويب الأول لمتابعة حالة طلبك لحظة بلحظة.'}
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
                  <span>{en ? 'Compose in Gmail' : 'مراسلة عبر Gmail مباشرة'}</span>
                </a>
                <a className="button button-ghost" href={`mailto:${supportEmail}?subject=${encodeURIComponent('PathPilot Support')}`}>
                  <Mail size={16} />
                  <span>{en ? 'Open Mail App' : 'فتح تطبيق البريد'}</span>
                </a>
              </div>
            </div>
          )}

          {tab === 'cloud' && user?.isOwner && (
            <form className="support-ticket-form" onSubmit={handleSaveCloudConfig}>
              <div className="support-banner success">
                <BadgeCheck size={18} />
                <span>
                  {en
                    ? `Owner Verified (${user?.email || 'Owner'}) — Zero-Cost Cloud & Automatic Mailer (${supportEmail}) without Railway!`
                    : `حساب المالك مُفعل (${user?.email || 'Owner'}) — تشغيل مجاني 100% بدون Railway عبر بريد التطبيق (${supportEmail})!`}
                </span>
              </div>
              <p className="support-lead">
                {en
                  ? 'Paste your Google Apps Script Web App URL (deployed from pathpilot.app00@gmail.com using free-integrations/google-apps-script-cloud.gs) so signup OTP codes and ticket emails send automatically 100% free.'
                  : 'الصق رابط Web App الخاص بـ Google Apps Script (من ملف free-integrations/google-apps-script-cloud.gs داخل حساب pathpilot.app00@gmail.com) ليقوم البريد بإرسال أكواد التفعيل والرد على التذاكر تلقائيًا ومجانًا بالكامل.'}
              </p>
              <label>
                <span><Link2 size={15} /> {en ? 'Google Apps Script Web App URL (100% Free Mailer & Sheet DB)' : 'رابط Google Apps Script Web App (الإرسال التلقائي المجاني)'}</span>
                <input
                  type="url"
                  value={cloudCfg.bridgeUrl}
                  onChange={(e) => setCloudCfg({ ...cloudCfg, bridgeUrl: e.target.value })}
                  placeholder="https://script.google.com/macros/s/.../exec"
                />
              </label>
              <label>
                <span>{en ? 'Optional Free Google AI Studio (Gemini) Key' : 'مفتاح Gemini المجاني من Google AI Studio (اختياري)'}</span>
                <input
                  type="password"
                  value={cloudCfg.geminiApiKey}
                  onChange={(e) => setCloudCfg({ ...cloudCfg, geminiApiKey: e.target.value })}
                  placeholder="AIzaSy..."
                />
              </label>
              {bridgeNotice && <div className="support-banner success"><span>{bridgeNotice}</span></div>}
              <div className="support-form-actions">
                <button className="button button-primary" type="submit" disabled={bridgeTestBusy}>
                  <CheckCircle2 size={16} />
                  <span>{bridgeTestBusy ? (en ? 'Testing...' : 'جاري الاختبار...') : (en ? 'Save & Test Free Mailer' : 'حفظ واختبار البريد المجاني')}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
