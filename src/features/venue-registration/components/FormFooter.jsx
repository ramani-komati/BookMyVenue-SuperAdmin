import { useState } from 'react';
import { Button, Icon } from '@/reg-ui';
import { useVenueDraftContext } from '../context/VenueDraftContext';
import ClearDraftModal from './ClearDraftModal';

/**
 * FormFooter — sticky action bar: missing-fields hint, clear-draft, and the
 * Back / Continue (or Submit) controls. Owns the clear-draft confirmation.
 * The primary action (and its error message) live in the page, shared with the
 * surrounding Form so Enter behaves exactly like clicking Continue/Submit.
 */
export default function FormFooter({ onPrimary, submitError }) {
  const {
    step,
    isLastStep,
    continueDisabled,
    showErrors,
    missing,
    back,
    submitting,
    clear,
  } = useVenueDraftContext();

  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const showMissing = showErrors && continueDisabled && missing.length > 0;

  const onConfirmClear = async () => {
    setClearing(true);
    try {
      await clear();
      setConfirmClear(false);
    } finally {
      setClearing(false);
    }
  };

  return (
    <>
      <div
        style={{
          position: 'sticky',
          bottom: 16,
          zIndex: 5,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          marginTop: 20,
          padding: '16px 20px',
          background: 'rgba(255,255,255,.92)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {submitError && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--error-50)',
              border: '1px solid rgba(217,45,32,.25)',
              fontSize: 'var(--text-sm)',
              color: 'var(--error-700)',
              lineHeight: 1.5,
            }}
          >
            <Icon name="info" size={18} />
            {submitError}
          </div>
        )}
        {showMissing && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--warning-50)',
              border: '1px solid rgba(247,144,9,.28)',
            }}
          >
            <span style={{ color: 'var(--warning-600)', display: 'inline-flex', flex: '0 0 auto', marginTop: 1 }}>
              <Icon name="info" size={18} />
            </span>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--navy-700)', lineHeight: 1.5 }}>
              Complete this step to continue. Still needed: <strong>{missing.join(', ')}</strong>
            </span>
          </div>
        )}

        {/* flexWrap: on narrow phones "Clear draft" + Back + "Submit for
            approval" don't fit one row — the actions wrap instead of clipping. */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <button type="button" className="rv-link-btn" onClick={() => setConfirmClear(true)} disabled={submitting}>
            <Icon name="trash-2" size={17} />
            Clear draft
          </button>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              onClick={back}
              disabled={step === 0 || submitting}
              iconLeft={<Icon name="arrow-left" size={18} />}
            >
              Back
            </Button>
            {isLastStep ? (
              <Button
                variant="primary"
                onClick={onPrimary}
                loading={submitting}
                iconRight={<Icon name="check" size={18} />}
              >
                Submit for approval
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={onPrimary}
                iconRight={<Icon name="arrow-right" size={18} />}
              >
                Continue
              </Button>
            )}
          </div>
        </div>
      </div>

      <ClearDraftModal
        open={confirmClear}
        clearing={clearing}
        onCancel={() => setConfirmClear(false)}
        onConfirm={onConfirmClear}
      />
    </>
  );
}
