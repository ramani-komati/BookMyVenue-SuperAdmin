import { useEffect } from 'react'
import { useAdmin } from '../../context/AdminContext.jsx'
import Button from '../ui/Button.jsx'

export default function ConfirmModal() {
  const { modal, setModal, closeModal, showToast } = useAdmin()

  // Escape closes; lock body scroll while open
  useEffect(() => {
    if (!modal) return
    const onKey = (e) => { if (e.key === 'Escape') closeModal() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [modal, closeModal])

  if (!modal) return null

  const needsReason = !!modal.needsReason
  const reasonInvalid = needsReason && (!modal.reason || modal.reason.trim().length < 4)

  // hasAmountField is fixed at openModal time so the field never vanishes mid-edit
  const hasAmountField = !!modal.hasAmountField
  const amountNum = Number(modal.amount)
  const amountInvalid = hasAmountField && (
    modal.amount === '' || Number.isNaN(amountNum) || amountNum <= 0 ||
    (modal.maxAmount != null && amountNum > modal.maxAmount)
  )

  const confirmDisabled = reasonInvalid || amountInvalid

  const confirm = () => {
    if (confirmDisabled) return
    const { onConfirm, reason, amount } = modal
    closeModal()
    try {
      onConfirm?.(reason.trim(), amount)
    } catch (err) {
      console.error('Confirm action failed:', err)
      showToast('Something went wrong — please try again')
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,21,44,.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--surface-card)', borderRadius: 16, boxShadow: 'var(--shadow-xl)', width: 440, maxWidth: '100%', padding: 26, display: 'flex', flexDirection: 'column', gap: 16, fontFamily: 'var(--font-body)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-heading)' }}>{modal.title}</div>
        <div style={{ fontSize: 15.5, color: 'var(--text-body)', lineHeight: 1.5 }}>{modal.body}</div>

        {hasAmountField && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--text-heading)' }}>Refund amount (₹)</label>
            <input
              className="bmva" type="number" min="1" max={modal.maxAmount ?? undefined} value={modal.amount}
              onChange={(e) => setModal({ ...modal, amount: e.target.value })}
              style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-heading)', minHeight: 44, padding: '0 14px', background: 'var(--surface-card)', border: `1px solid ${amountInvalid ? 'var(--error-500)' : 'var(--border-default)'}`, borderRadius: 11 }}
            />
            {amountInvalid && (
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--error-600)' }}>
                {modal.amount === '' || Number.isNaN(amountNum)
                  ? 'Enter a refund amount.'
                  : amountNum <= 0
                    ? 'Amount must be more than ₹0.'
                    : `Can't refund more than ₹${modal.maxAmount.toLocaleString('en-IN')} (the amount paid).`}
              </div>
            )}
          </div>
        )}

        {needsReason && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--text-heading)' }}>Reason (required — recorded in the audit log)</label>
            <textarea
              className="bmva" placeholder="Type the reason…" value={modal.reason} rows={3}
              onChange={(e) => setModal({ ...modal, reason: e.target.value })}
              style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-heading)', padding: '10px 14px', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 11, resize: 'vertical' }}
            />
            {reasonInvalid && modal.reason.length > 0 && (
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-muted)' }}>At least 4 characters.</div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="sm" onClick={closeModal}>Cancel</Button>
          <Button variant={modal.danger ? 'danger' : 'primary'} size="sm" onClick={confirm} disabled={confirmDisabled}>
            {modal.confirmLabel || 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  )
}
