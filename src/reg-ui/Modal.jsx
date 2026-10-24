import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Modal — accessible centered dialog with backdrop.
 * Closes on Escape and backdrop click, restores focus on unmount, and traps
 * initial focus inside the panel. Render `null` by not mounting it (see `open`).
 */
export default function Modal({ open, onClose, labelledBy, children, maxWidth = 420 }) {
  const panelRef = useRef(null);
  const lastFocused = useRef(null);

  // onClose via ref so the focus/mount effect depends ONLY on `open` — a new
  // onClose identity from a parent re-render must not re-run it and steal the
  // caret out of a field the user is typing in.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;
    lastFocused.current = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current?.();
        return;
      }
      // Trap Tab focus inside the panel so keyboard users can't reach the
      // backdrop page behind the dialog.
      if (e.key === 'Tab') {
        const panel = panelRef.current;
        if (!panel) return;
        const focusable = panel.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) {
          e.preventDefault();
          panel.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    // Focus the panel for keyboard users.
    panelRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (lastFocused.current instanceof HTMLElement) lastFocused.current.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="bmv-modal__backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'rgba(6,21,44,.45)',
        backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="bmv-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        style={{
          width: '100%',
          maxWidth,
          background: 'var(--surface-card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          padding: 28,
          outline: 'none',
          // A tall dialog (e.g. the walk-in slot grid) must scroll inside itself
          // so its bottom actions stay reachable instead of overflowing off-screen.
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
