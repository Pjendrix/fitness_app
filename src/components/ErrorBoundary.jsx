import { Component } from 'react';
import { t } from '../lib/i18n.js';

// Chyba při vykreslení (poškozený dokument, nenačtený chunk po nasazení…) nesmí skončit bílou obrazovkou.
// Draft rozdělaného tréninku je v localStorage, takže reload nic neztratí.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Forge crash:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const { onHome } = this.props;
    return (
      <div className="screen" role="alert">
        <div className="card empty-card">
          <h2>{t('crash.title')}</h2>
          <p className="muted small">{t('crash.msg')}</p>
          <button className="btn btn-primary btn-block" onClick={() => window.location.reload()}>{t('crash.reload')}</button>
          {onHome && <button className="btn btn-ghost btn-block" onClick={() => { this.setState({ error: null }); onHome(); }}>{t('crash.home')}</button>}
        </div>
      </div>
    );
  }
}
