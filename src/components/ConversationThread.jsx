import { CornerUpLeft, Sparkles, UserRound } from 'lucide-react';
import ResponseContent from './ResponseContent.jsx';

function isEnglish() {
  return document.body?.dataset?.language === 'en';
}

export default function ConversationThread({ turns = [], onReuse, maxTurns = 5 }) {
  if (!turns.length) return null;
  const en = isEnglish();
  const visibleTurns = turns.slice(-Math.max(1, Number(maxTurns || 5)));
  return (
    <section className="conversation-thread" aria-label={en ? 'Conversation context' : 'سياق المحادثة'} style={{ display: 'grid', gap: 12, marginBottom: 14 }}>
      {visibleTurns.map((turn) => (
        <article key={turn.id} style={{ display: 'grid', gap: 10 }}>
          <div style={{ border: '1px solid rgba(148,163,184,.16)', borderRadius: 14, padding: 12, background: 'rgba(15,23,42,.24)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><UserRound size={15} /> {en ? 'You' : 'أنت'}</strong>
              {onReuse && <button type="button" onClick={() => onReuse(turn.prompt)} title={en ? 'Edit and resubmit' : 'تعديل وإعادة الإرسال'} aria-label={en ? 'Edit and resubmit' : 'تعديل وإعادة الإرسال'}><CornerUpLeft size={15} /></button>}
            </div>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{turn.prompt}</p>
          </div>
          <div style={{ borderInlineStart: '2px solid rgba(96,165,250,.35)', paddingInlineStart: 12 }}>
            <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 6 }}><Sparkles size={15} /> PathPilot</strong>
            <ResponseContent answer={turn.answer} />
          </div>
        </article>
      ))}
    </section>
  );
}
