import { useStore } from '../lib/store.jsx';
import { t } from '../lib/i18n.js';
import { UndoIcon } from './Icons.jsx';

// Minimal persistent undo (last 5 changes). Hidden when there is nothing to undo.
export default function UndoButton() {
  const { undoStack, undo } = useStore();
  if (!undoStack.length) return null;
  const last = undoStack[undoStack.length - 1];
  return (
    <button className="undo-btn" onClick={undo} title={t('undo.title', { what: t(last.label), n: undoStack.length })} aria-label={t('undo.btn')}>
      <UndoIcon width={15} height={15} />
      <span>{undoStack.length}</span>
    </button>
  );
}
