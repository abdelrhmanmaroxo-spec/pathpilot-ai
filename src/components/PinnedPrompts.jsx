import { useState } from 'react';
import { Pin, PinOff } from 'lucide-react';
import { loadPinnedPrompts, togglePinnedPrompt } from '../lib/storage.js';

function isEnglish() {
  return document.body?.dataset?.language === 'en';
}

export default function PinnedPrompts({ currentPrompt, onSelect, notify }) {
  const [items, setItems] = useState(() => loadPinnedPrompts());
  const en = isEnglish();
  const current = String(currentPrompt || '').trim();
  const pinned = current && items.includes(current);

  const toggleCurrent = () => {
    if (!current) {
      notify?.(en ? 'Write a prompt first, then pin it.' : 'اكتب Prompt الأول وبعدها ثبّته.');
      return;
    }
    const next = togglePinnedPrompt(current);
    setItems(next);
    notify?.(next.includes(current) ? (en ? 'Prompt pinned.' : 'تم تثبيت الـPrompt.') : (en ? 'Prompt unpinned.' : 'تم إلغاء تثبيت الـPrompt.'));
  };

  if (!items.length && !current) return null;
  return (
    <section className="pinned-prompts" style={{ display: 'grid', gap: 8 }} aria-label={en ? 'Pinned prompts' : 'Prompts مثبتة'}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={toggleCurrent} disabled={!current} title={en ? 'Pin current prompt' : 'ثبّت الـPrompt الحالي'}>
          {pinned ? <PinOff size={15} /> : <Pin size={15} />} {pinned ? (en ? 'Unpin' : 'إلغاء التثبيت') : (en ? 'Pin prompt' : 'ثبّت Prompt')}
        </button>
        {items.length > 0 && <small>{en ? `${items.length} saved` : `${items.length} محفوظ`}</small>}
      </div>
      {items.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {items.slice(0, 6).map((item) => (
            <button type="button" key={item} onClick={() => onSelect?.(item)} title={item} style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <Pin size={13} /> {item}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
