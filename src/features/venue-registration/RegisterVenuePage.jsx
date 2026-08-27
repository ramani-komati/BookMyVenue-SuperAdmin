import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BackButton, Button, Form, Icon, SaveIndicator, TextField } from '@/reg-ui';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import { adminApi } from '@/services/adminApi';
import { setVendorToken } from '@/services/registerApi';
import { toUserMessage } from '@/services/errors';
import { VenueDraftProvider, useVenueDraftContext } from './context/VenueDraftContext';
import FormSidebar from './components/FormSidebar';
import FormFooter from './components/FormFooter';
import SubmittedState from './components/SubmittedState';
import BasicInfoStep from './steps/BasicInfoStep';
import LocationStep from './steps/LocationStep';
import PhotosStep from './steps/PhotosStep';
import DetailsStep from './steps/DetailsStep';
import PayoutStep from './steps/PayoutStep';
import '@/reg-ui/reg-components.css';
import './venue-registration.css';

const STEP_COMPONENTS = [BasicInfoStep, LocationStep, PhotosStep, DetailsStep, PayoutStep];
const digitsOf = (v) => String(v ?? '').replace(/\D/g, '');

function formatSavedAt(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return null;
  }
}

function PageHeader({ owner }) {
  const { saveStatus, saveError, savedAt } = useVenueDraftContext();
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 50 }}>
      <header
        className="rv-topbar"
        style={{
          background: 'var(--surface-card)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '14px 40px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <BackButton fallback="/" />
        <img src="/assets/logo-full.png" alt="TheBookMyVenues" style={{ height: 60, display: 'block' }} />
      </header>
      <div
        className="rv-savebar"
        style={{
          background: 'var(--surface-card)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '16px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          Registering for owner{' '}
          <b style={{ color: 'var(--text-heading)' }}>+91 {owner?.vendor?.phone || ''}</b>
          {owner?.created ? ' · new vendor' : ''}
        </span>
        <SaveIndicator status={saveStatus} savedAtLabel={formatSavedAt(savedAt)} errorDetail={saveError} />
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div
      style={{
        minHeight: '50vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        color: 'var(--text-muted)',
      }}
    >
      <Icon name="loader" size={32} className="animate-spin" style={{ color: 'var(--brand-accent)' }} />
      <span style={{ fontSize: 'var(--text-base)' }}>Preparing the form…</span>
    </div>
  );
}

function RegisterVenueInner({ owner }) {
  const { step, submitted, loadState, isLastStep, continueDisabled, next, submit, submitting, saveError } =
    useVenueDraftContext();
  const StepComponent = STEP_COMPONENTS[step] || BasicInfoStep;
  const isDetails = step === 3;

  const [submitError, setSubmitError] = useState('');

  // The wizard's primary action — fired by the footer's Continue/Submit button
  // AND by pressing Enter in any field (the whole step is wrapped in a Form).
  const onPrimary = async () => {
    if (isLastStep) {
      if (continueDisabled) {
        next(); // surfaces validation errors
        return;
      }
      setSubmitError('');
      const res = await submit();
      if (!res?.ok) {
        if (res?.reason === 'publish-blocked') {
          setSubmitError(res.message || 'This change is blocked by upcoming bookings.');
        } else if (res?.reason === 'save-failed') {
          const why = res.message || saveError;
          setSubmitError(
            why
              ? `Couldn't save your latest changes — ${why}`
              : "Couldn't save your latest changes. Check your connection and try again.",
          );
        } else {
          setSubmitError(
            res?.error ? toUserMessage(res.error) : 'Could not register the venue. Check your connection and try again.',
          );
        }
      }
    } else {
      next();
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PageHeader owner={owner} />

      <main style={{ flex: 1, padding: '36px 40px 16px' }} className="rv-main">
        {loadState === 'loading' ? (
          <LoadingState />
        ) : (
          <div className="rv-shell">
            <FormSidebar />

            <section style={{ minWidth: 0 }}>
              <h1
                style={{
                  fontSize: 'var(--text-4xl)',
                  fontWeight: 800,
                  color: 'var(--text-heading)',
                  letterSpacing: '-.02em',
                  margin: '0 0 8px',
                }}
                className="rv-title"
              >
                Register a venue
              </h1>
              <p
                style={{
                  fontSize: 'var(--text-base)',
                  color: 'var(--text-muted)',
                  margin: '0 0 24px',
                  maxWidth: 760,
                }}
              >
                Fill in the details below. Progress is saved automatically. On submit the venue goes
                live immediately — no approval queue.
              </p>

              {submitted ? (
                <SubmittedState />
              ) : (
                <Form onSubmit={onPrimary} disabled={submitting}>
                  <div className="rv-formcard" data-bare={isDetails}>
                    <StepComponent />
                  </div>
                  <FormFooter onPrimary={onPrimary} submitError={submitError} />
                </Form>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * OwnerGate — step 0 of the admin flow (the vendor wizard has no equivalent):
 * resolve the owner by phone → mint a vendor impersonation token → drop into the
 * exact same registration wizard the vendor uses.
 */
function OwnerGate({ onResolved }) {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const resolve = async () => {
    const p = digitsOf(phone);
    setError('');
    if (p.length !== 10) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    setBusy(true);
    try {
      const res = await adminApi.impersonateVendor({ phone: p, name: name.trim() || undefined });
      setVendorToken(res?.token || null);
      onResolved({ vendor: res?.vendor || { phone: p }, created: Boolean(res?.created) });
    } catch (err) {
      console.error('register-venue: resolveOwner failed', err?.status, err);
      setError(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          background: 'var(--surface-card)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '14px 40px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <BackButton fallback="/" />
        <img src="/assets/logo-full.png" alt="TheBookMyVenues" style={{ height: 60, display: 'block' }} />
      </header>
      <main style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 20px' }}>
        <div className="rv-formcard" style={{ width: '100%', maxWidth: 480 }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-heading)', margin: '0 0 6px' }}>
            Register a venue for an owner
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: '0 0 20px' }}>
            Enter the owner&apos;s mobile number. If they already have a vendor account it&apos;s attached,
            otherwise a new one is created. Then fill the same form the vendor uses.
          </p>
          <Form onSubmit={resolve} disabled={busy}>
            <TextField
              label="Owner mobile number"
              prefix="+91"
              inputMode="numeric"
              placeholder="Enter mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={error}
            />
            <div style={{ height: 14 }} />
            <TextField
              label="Owner name (optional)"
              hint="Used only if a new vendor is created."
              placeholder="Owner's full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
              <Button variant="ghost" onClick={() => navigate('/')} disabled={busy}>
                Cancel
              </Button>
              <Button variant="primary" block loading={busy} onClick={resolve} iconRight={<Icon name="arrow-right" size={18} />}>
                Continue
              </Button>
            </div>
          </Form>
        </div>
      </main>
    </div>
  );
}

/**
 * RegisterVenuePage — admin entry for registering a venue on an owner's behalf.
 * Renders full-screen (over the admin chrome) so it's identical to the vendor
 * wizard, gated by an owner-phone step that mints the impersonation token.
 */
export default function RegisterVenuePage() {
  useDocumentTitle('Register a venue · TheBookMyVenues');
  const [owner, setOwner] = useState(null);
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        overflow: 'auto',
        background: 'var(--surface-page, #fff)',
      }}
    >
      {owner ? (
        <VenueDraftProvider>
          <RegisterVenueInner owner={owner} />
        </VenueDraftProvider>
      ) : (
        <OwnerGate onResolved={setOwner} />
      )}
    </div>
  );
}
