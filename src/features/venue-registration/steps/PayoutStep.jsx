import { Checkbox } from '@/reg-ui';
import { sanitizeDigitsMax, sanitizeUpperAlnum } from '@/utils/validation';
import { SectionTextField } from '../components/SectionFields';
import { useVenueDraftContext } from '../context/VenueDraftContext';
import { offeringKindOf } from '../offerings/model';

/**
 * The Fitness / Resort / Big Screen Surprise forms ask the owner to accept
 * the platform commission and terms with their bank details (required for
 * those venue types — venueValidation + the server's submit gate).
 */
function TermsAgreement() {
  const { draft, setField, showErrors } = useVenueDraftContext();
  if (!offeringKindOf(draft.details?.primaryCategory)) return null;
  const agreed = draft.payout?.agreedToTerms === true;
  return (
    <div className="rv-subbox" style={{ marginTop: 4 }}>
      <Checkbox
        label="I agree to the platform commission and the TheBookMyVenues partner terms."
        checked={agreed}
        onChange={(e) => {
          setField('payout', 'agreedToTerms', e.target.checked);
          setField('payout', 'agreedAt', e.target.checked ? new Date().toISOString() : '');
        }}
      />
      {showErrors && !agreed && (
        <div role="alert" style={{ color: 'var(--error-700)', fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-semibold)', marginTop: 8 }}>
          Please accept the commission and terms to continue
        </div>
      )}
    </div>
  );
}

/**
 * Step 5 · Payout / Bank — settlement account details.
 * Inputs restrict typing to valid characters (digits, uppercase alphanumerics).
 */
export default function PayoutStep() {
  return (
    <div className="rv-panel">
      <div className="rv-panel-h" style={{ marginBottom: 6 }}>
        Payout / Bank account <span style={{ color: 'var(--brand-accent)' }}>*</span>
      </div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 18 }}>
        We collect customer payments and settle your share to this bank account. Double-check these,
        because wrong details mean failed transfers.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="rv-grid-2">
          <SectionTextField
            section="payout"
            name="acctHolder"
            label="Account holder name"
            required
            placeholder="As per bank records"
          />
          <SectionTextField section="payout" name="bankName" label="Bank name" required placeholder="HDFC Bank" />
        </div>

        <div className="rv-grid-2">
          <SectionTextField
            section="payout"
            name="acctNumber"
            label="Account number"
            required
            inputMode="numeric"
            placeholder="9–18 digits"
            sanitize={(v) => sanitizeDigitsMax(v, 18)}
          />
          <SectionTextField
            section="payout"
            name="ifsc"
            label="IFSC code"
            required
            placeholder="HDFC0001234"
            sanitize={(v) => sanitizeUpperAlnum(v, 11)}
          />
        </div>

        <div className="rv-grid-2">
          <SectionTextField
            section="payout"
            name="payoutPhone"
            label="Payout phone (UPI / notifications)"
            required
            inputMode="numeric"
            placeholder="10-digit mobile"
            sanitize={(v) => sanitizeDigitsMax(v, 10)}
          />
          <SectionTextField
            section="payout"
            name="upiId"
            label="UPI ID (optional, faster payouts)"
            placeholder="name@upi"
          />
        </div>

        <div className="rv-grid-2">
          <SectionTextField
            section="payout"
            name="pan"
            label="PAN (optional)"
            placeholder="ABCDE1234F"
            sanitize={(v) => sanitizeUpperAlnum(v, 10)}
          />
          <div />
        </div>

        <TermsAgreement />
      </div>
    </div>
  );
}
