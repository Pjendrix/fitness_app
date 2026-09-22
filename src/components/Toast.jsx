import { useToast } from '../lib/store.jsx';

export default function Toast() {
  const { toast, dismissToast } = useToast();
  if (!toast) return null;
  return (
    <div className="toast" role="status" aria-live="polite" key={toast.id}>
      <span>{toast.msg}</span>
      {toast.action && (
        <button className="toast-action" onClick={() => { toast.action.run(); dismissToast(); }}>{toast.action.label}</button>
      )}
    </div>
  );
}
