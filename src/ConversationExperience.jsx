import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquareShare, Trash2, X } from 'lucide-react';
import { loadHistory, saveHistory } from './lib/storage.js';

function readCurrentConversation() {
  const prompt = document.querySelector('#assistant-prompt')?.value?.trim() || '';
  const answer = document.querySelector('.result-card pre')?.textContent?.trim() || '';
  return { prompt, answer };
}

function shareText({ prompt, answer }) {
  return `PathPilot\n\nالسؤال / الطلب\n${prompt || '—'}\n\nالنتيجة\n${answer || '—'}\n\nتمت مشاركة هذه المحادثة فقط.`;
}

function HistoryManager({ open, onClose, notify }) {
  const [items, setItems] = useState(() => loadHistory());

  useEffect(() => {
    if (open) setItems(loadHistory());
  }, [open]);

  if (!open) return null;

  const removeItem = (item) => {
    if (!window.confirm(`حذف هذه المحادثة فقط؟\n\n${String(item.prompt || '').slice(0, 120)}`)) return;
    const next = saveHistory(items.filter((entry) => entry.id !== item.id));
    setItems(next);
    notify('تم حذف المحادثة المحددة فقط.');
    window.setTimeout(() => window.location.reload(), 500);
  };

  return createPortal(
    <div className="conversation-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="conversation-panel" role="dialog" aria-modal="true" aria-labelledby="history-manager-title">
        <button className="conversation-close" type="button" onClick={onClose} aria-label="إغلاق"><X size={19} /></button>
        <div className="conversation-heading">
          <span className="conversation-icon"><Trash2 size={20} /></span>
          <div><small>PATHPILOT HISTORY</small><h2 id="history-manager-title">إدارة المحادثات</h2></div>
        </div>
        <p className="conversation-help">احذف محادثة واحدة فقط من غير ما باقي السجل يتلمس.</p>
        {items.length === 0 ? (
          <div className="conversation-empty">مفيش محادثات محفوظة حاليًا.</div>
        ) : (
          <div className="conversation-history-list">
            {items.map((item) => (
              <div className="conversation-history-item" key={item.id}>
                <div>
                  <strong>{item.prompt}</strong>
                  <small>{new Date(item.createdAt).toLocaleString('ar-EG')}</small>
                </div>
                <button type="button" onClick={() => removeItem(item)} title="حذف هذه المحادثة فقط" aria-label="حذف هذه المحادثة فقط"><Trash2 size={17} /></button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>,
    document.body,
  );
}

export default function ConversationExperience() {
  const [targets, setTargets] = useState({ resultActions: null, historyHead: null });
  const [managerOpen, setManagerOpen] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;
    const sync = () => {
      const resultActions = document.querySelector('.result-actions');
      const historyHead = document.querySelector('.history-head');
      setTargets((previous) => (
        previous.resultActions === resultActions && previous.historyHead === historyHead
          ? previous
          : { resultActions, historyHead }
      ));
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener('hashchange', sync);
    return () => {
      observer.disconnect();
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const shareConversation = async () => {
    const conversation = readCurrentConversation();
    if (!conversation.answer) {
      setToast('أنشئ نتيجة الأول عشان تشارك المحادثة.');
      return;
    }
    const text = shareText(conversation);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'PathPilot conversation', text });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    await navigator.clipboard.writeText(text);
    setToast('تم نسخ هذه المحادثة فقط للمشاركة.');
  };

  const resultPortal = targets.resultActions ? createPortal(
    <button className="conversation-share-button" type="button" onClick={shareConversation} title="مشاركة هذه المحادثة فقط" aria-label="مشاركة هذه المحادثة فقط">
      <MessageSquareShare size={17} />
    </button>,
    targets.resultActions,
  ) : null;

  const historyPortal = targets.historyHead ? createPortal(
    <button className="history-manage-button" type="button" onClick={() => setManagerOpen(true)} title="إدارة وحذف محادثة محددة">
      <Trash2 size={15} /> إدارة
    </button>,
    targets.historyHead,
  ) : null;

  return (
    <>
      {resultPortal}
      {historyPortal}
      <HistoryManager open={managerOpen} onClose={() => setManagerOpen(false)} notify={setToast} />
      {toast && createPortal(<div className="conversation-toast" role="status">{toast}</div>, document.body)}
    </>
  );
}
