import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { isFeatureEnabled } from './lib/feature-flags.js';

export default function UpdateBanner() {
  const [waitingWorker, setWaitingWorker] = useState(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!isFeatureEnabled('pwaUpdatePrompt')) return undefined;
    const onReady = (event) => {
      if (event.detail?.worker) {
        setWaitingWorker(event.detail.worker);
        setHidden(false);
      }
    };
    window.addEventListener('pathpilot:update-ready', onReady);
    return () => window.removeEventListener('pathpilot:update-ready', onReady);
  }, []);

  if (!waitingWorker || hidden) return null;
  const english = document.body?.dataset?.language === 'en';

  const applyUpdate = () => {
    let reloading = false;
    navigator.serviceWorker?.addEventListener?.('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    }, { once: true });
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  };

  return (
    <div className="pathpilot-update-banner" role="status" style={{ position: 'fixed', insetInline: '1rem', bottom: '1rem', zIndex: 9999, maxWidth: 620, marginInline: 'auto', background: '#101827', border: '1px solid #334155', borderRadius: 16, padding: '1rem', boxShadow: '0 18px 60px rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
      <div>
        <strong>{english ? 'A new PathPilot version is ready.' : 'نسخة جديدة من PathPilot جاهزة.'}</strong>
        <div style={{ opacity: .78, marginTop: '.3rem', fontSize: '.9rem' }}>{english ? 'Update now to get the latest fixes and improvements.' : 'حدّث دلوقتي عشان تاخد آخر الإصلاحات والتحسينات.'}</div>
      </div>
      <div style={{ display: 'flex', gap: '.45rem', flexShrink: 0 }}>
        <button className="button button-primary" type="button" onClick={applyUpdate}><RefreshCw size={16} /> {english ? 'Update' : 'تحديث'}</button>
        <button className="button button-ghost" type="button" onClick={() => setHidden(true)} aria-label={english ? 'Later' : 'لاحقًا'}><X size={16} /></button>
      </div>
    </div>
  );
}
