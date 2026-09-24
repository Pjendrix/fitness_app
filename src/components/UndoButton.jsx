import { useStore } from '../lib/store.jsx';
import { t } from '../lib/i18n.js';
import { RedoIcon, UndoIcon } from './Icons.jsx';

// Undo / Redo pill (last 5 changes). Two arrows side by side = editing control, not "back".
// Hidden when there is nothing to undo or redo.
export default function UndoButton() {
  const { undoStack, undo, redoStack, redo } = useStore();
  if (!undoStack.length && !redoStack.length) return null;
  const u = undoStack[undoStack.length - 1];
  const r = redoStack[redoStack.length - 1];
  return (
    <div className="undo-btn" role="group" aria-label={t('undo.pill')}>
      <button onClick={undo} disabled={!u} title={u ? t('undo.title', { what: t(u.label), n: undoStack.length }) : t('undo.btn')} aria-label={t('undo.btn')}>
        <UndoIcon width={16} height={16} />
      </button>
      <i aria-hidden="true" />
      <button onClick={redo} disabled={!r} title={r ? t('undo.redoTitle', { what: t(r.label), n: redoStack.length }) : t('undo.redoBtn')} aria-label={t('undo.redoBtn')}>
        <RedoIcon width={16} height={16} />
      </button>
    </div>
  );
}
