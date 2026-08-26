import { Button, Icon, Modal } from '@/reg-ui';

/**
 * ClearDraftModal — confirmation dialog before wiping the draft.
 */
export default function ClearDraftModal({ open, onCancel, onConfirm, clearing }) {
  return (
    <Modal open={open} onClose={onCancel} labelledBy="clear-draft-title">
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'var(--error-50)',
          color: 'var(--error-600)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Icon name="trash-2" size={24} />
      </div>
      <h3
        id="clear-draft-title"
        style={{
          fontSize: 'var(--text-xl)',
          fontWeight: 800,
          color: 'var(--text-heading)',
          margin: '0 0 8px',
        }}
      >
        Clear this draft?
      </h3>
      <p
        style={{
          fontSize: 'var(--text-base)',
          color: 'var(--text-muted)',
          margin: '0 0 24px',
          lineHeight: 1.5,
        }}
      >
        This erases everything you&apos;ve entered and starts a blank form. This can&apos;t be undone.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onCancel} disabled={clearing}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={clearing}>
          Yes, clear it
        </Button>
      </div>
    </Modal>
  );
}
