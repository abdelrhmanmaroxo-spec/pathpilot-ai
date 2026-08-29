import { useEffect, useState } from 'react';
import { AlertTriangle, PauseCircle, PlayCircle, RefreshCw, ShieldAlert } from 'lucide-react';
import { loadSecurityEvents, loadSystemControl, setSystemPause } from '../lib/platform.js';

export default function AdminSystemStatus({ status }) {
  const [control, setControl] = useState(null);
  const [reason, setReason] = useState('Security maintenance');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);

  const refreshSecurity = async () => {
    setError('');
    try {
      const [nextControl, nextEvents] = await Promise.all([loadSystemControl(), loadSecurityEvents()]);
      setControl(nextControl);
      setEvents(nextEvents.slice(0, 8));
      if (nextControl?.reason) setReason(nextControl.reason);
    } catch (requestError) {
      setError(requestError.message || 'Could not load security controls.');
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([loadSystemControl(), loadSecurityEvents()])
      .then(([nextControl, nextEvents]) => {
        if (!active) return;
        setControl(nextControl);
        setEvents(nextEvents.slice(0, 8));
        if (nextControl?.reason) setReason(nextControl.reason);
      })
      .catch((requestError) => { if (active) setError(requestError.message || 'Could not load security controls.'); });
    return () => { active = false; };
  }, []);

  const togglePause = async () => {
    const pausing = !control?.paused;
    if (pausing && !globalThis.confirm?.('Pause PathPilot for all normal users? Admin and authentication access will remain available so you can recover the system.')) return;
    setBusy(true);
    setError('');
    try {
      const next = await setSystemPause(pausing, pausing ? reason : '');
      setControl(next);
      setEvents(await loadSecurityEvents().then((items) => items.slice(0, 8)));
    } catch (requestError) {
      setError(requestError.message || 'Could not change system state.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="provider-panel" aria-label="System status">
        <div><span className={status?.apiOnline ? 'provider-dot online' : 'provider-dot'} /><div><small>AI Service</small><strong>{status?.apiOnline ? 'Ready' : 'Unavailable'}</strong><small>Provider details hidden from users</small></div></div>
        <div><small>API Status</small><strong>{status?.apiOnline ? 'Online' : 'Offline'}</strong></div>
        <div><small>Database</small><strong>{status?.databaseOnline ? 'Online' : 'Offline'}</strong></div>
        <div><small>Email Verification</small><strong>{status?.emailVerificationAvailable ? 'Ready' : 'Not configured'}</strong></div>
        <div><small>Google Sign-In</small><strong>{status?.googleAuthAvailable ? 'Ready' : 'Not configured'}</strong></div>
      </section>

      <section className="usage-card" style={{ marginTop: 16, display: 'block' }} aria-label="Emergency system control">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldAlert />
            <span><strong>PathPilot Security Shield</strong><small style={{ display: 'block' }}>Emergency pause + exploit-like input blocking + security event log.</small></span>
          </div>
          <strong style={{ color: control?.paused ? '#fca5a5' : '#86efac' }}>{control?.paused ? 'PAUSED' : 'ACTIVE'}</strong>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <input
            type="text"
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason shown while the system is paused"
            style={{ flex: '1 1 280px' }}
            disabled={busy || control?.paused}
          />
          <button className={control?.paused ? 'button button-primary' : 'button button-ghost'} type="button" onClick={togglePause} disabled={busy || !control}>
            {control?.paused ? <PlayCircle size={17} /> : <PauseCircle size={17} />}
            {busy ? 'Applying…' : control?.paused ? 'Resume system' : 'PAUSE system'}
          </button>
          <button className="button button-ghost" type="button" onClick={refreshSecurity} disabled={busy}><RefreshCw size={16} /> Refresh</button>
        </div>

        {control?.paused && <div className="admin-error" style={{ marginTop: 12, borderColor: 'rgba(239,68,68,.45)' }}><AlertTriangle size={17} /> Normal user API actions are blocked. Admin and authentication access remain available for recovery.</div>}
        {error && <div className="admin-error" style={{ marginTop: 12 }}><AlertTriangle size={17} /> {error}</div>}

        <div style={{ marginTop: 16 }}>
          <strong>Recent security events</strong>
          {events.length ? (
            <div style={{ marginTop: 8, display: 'grid', gap: 7 }}>
              {events.map((event) => (
                <div key={event.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 10, alignItems: 'center', padding: '8px 10px', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10 }}>
                  <ShieldAlert size={15} />
                  <span><strong>{event.event_type}</strong><small style={{ display: 'block' }}>{event.details || event.path || 'Security event recorded'}</small></span>
                  <small>{new Date(event.created_at).toLocaleString()}</small>
                </div>
              ))}
            </div>
          ) : <small style={{ display: 'block', marginTop: 8 }}>No blocked security events recorded yet.</small>}
        </div>
      </section>
    </>
  );
}
