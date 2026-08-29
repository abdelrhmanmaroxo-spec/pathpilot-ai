import { Component } from 'react';
import { TriangleAlert } from 'lucide-react';
import { reportClientError } from './lib/platform.js';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    reportClientError(error, `react-boundary:${info?.componentStack || ''}`.slice(0, 1800)).catch(() => undefined);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const english = document.body?.dataset?.language === 'en';
    const title = english ? 'PathPilot hit a temporary interface error.' : 'حصل خطأ مؤقت في واجهة PathPilot.';
    const message = english
      ? 'Your account and saved data were not deleted. Reload the interface and try again.'
      : 'حسابك وبياناتك المحفوظة لم يتم حذفهم. أعد تحميل الواجهة وجرب مرة أخرى.';
    const retry = english ? 'Reload PathPilot' : 'إعادة تحميل PathPilot';
    const home = english ? 'Return home' : 'العودة للرئيسية';

    return (
      <main className="page-shell" style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', paddingBlock: '4rem' }}>
        <section className="result-card" role="alert" style={{ maxWidth: 720, width: '100%' }}>
          <div className="result-head">
            <div><span className="assistant-avatar"><TriangleAlert size={18} /></span><div><strong>{title}</strong><small>UI_ERROR_BOUNDARY</small></div></div>
          </div>
          <p style={{ lineHeight: 1.8 }}>{message}</p>
          <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
            <button className="button button-primary" type="button" onClick={() => window.location.reload()}>{retry}</button>
            <button className="button button-secondary" type="button" onClick={() => { window.location.hash = ''; window.location.reload(); }}>{home}</button>
          </div>
        </section>
      </main>
    );
  }
}
