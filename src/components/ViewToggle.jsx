import { useViewMode } from '../lib/viewMode.js';

// Rychlé přepnutí mobil ↔ desktop (analytický) režim.
export default function ViewToggle({ full = false }) {
  const { mode, desktop, setMode } = useViewMode();
  if (full) {
    return (
      <div className="seg seg-sm" role="tablist" aria-label="Režim zobrazení">
        {[['auto', 'Auto'], ['mobile', 'Mobil'], ['desktop', 'Desktop']].map(([id, l]) => (
          <button key={id} role="tab" aria-selected={mode === id} className={mode === id ? 'is-on' : ''} onClick={() => setMode(id)}>{l}</button>
        ))}
      </div>
    );
  }
  return (
    <button className="view-toggle" onClick={() => setMode(desktop ? 'mobile' : 'desktop')} title="Přepnout režim zobrazení">
      {desktop ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 18h2" /></svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M8 20h8M12 16v4" /></svg>
      )}
      <span>{desktop ? 'Mobil' : 'Desktop'}</span>
    </button>
  );
}
