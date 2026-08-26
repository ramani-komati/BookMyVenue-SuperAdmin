import { Button, Icon, Select, TextField } from '@/reg-ui';
import { sanitizeAmount, sanitizeDigitsMax, sanitizeUpperAlnum } from '@/utils/validation';
import { OFFER_TYPES, normalizeOffer, offerSummary } from '@/utils/offers';
import useDetails from './useDetails';

/**
 * Offers panel — the vendor posts discount coupons/offers for this venue.
 * Each offer is a percent or flat-rupee discount, with an optional coupon code,
 * minimum spend and expiry. Customers see active offers on the venue page and
 * can apply one during checkout (the discount comes off slots + add-ons).
 */
export default function OffersPanel() {
  const { details, addOffer, removeOffer, updateOffer, flushNow } = useDetails();
  const offers = details.offers || [];

  return (
    <div className="rv-panel">
      <div className="rv-panel-h">Offers &amp; coupons (optional)</div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 16 }}>
        Run a discount to attract bookings. The discount applies to the slot &amp; add-on total (not
        the ₹20 booking fee). Leave the code blank for an offer that applies to anyone; add a code to
        share it privately.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
        {offers.map((o, i) => {
          const norm = normalizeOffer(o, i);
          return (
            <div className="rv-pkg" key={i}>
              <div className="rv-pkg-grid">
                <TextField
                  label="Offer title"
                  placeholder="Weekend Special"
                  value={o.title}
                  onChange={(e) => updateOffer(i, 'title', e.target.value)}
                  onBlur={flushNow}
                />
                <TextField
                  label="Coupon code (optional)"
                  placeholder="SAVE10"
                  value={o.code}
                  onChange={(e) => updateOffer(i, 'code', sanitizeUpperAlnum(e.target.value, 12))}
                  onBlur={flushNow}
                />
                <Select
                  label="Discount type"
                  options={OFFER_TYPES}
                  value={o.type || 'percent'}
                  onChange={(e) => updateOffer(i, 'type', e.target.value)}
                  onBlur={flushNow}
                />
                <TextField
                  label={o.type === 'flat' ? 'Amount off (₹)' : 'Percent off (%)'}
                  prefix={o.type === 'flat' ? '₹' : undefined}
                  suffix={o.type === 'flat' ? undefined : '%'}
                  inputMode="numeric"
                  value={o.value}
                  onChange={(e) =>
                    updateOffer(i, 'value', o.type === 'flat' ? sanitizeAmount(e.target.value) : sanitizeDigitsMax(e.target.value, 2))
                  }
                  onBlur={flushNow}
                />
                <TextField
                  label="Min booking (₹, optional)"
                  prefix="₹"
                  inputMode="numeric"
                  placeholder="e.g. 500"
                  value={o.minAmount}
                  onChange={(e) => updateOffer(i, 'minAmount', sanitizeAmount(e.target.value))}
                  onBlur={flushNow}
                />
                {o.type !== 'flat' && (
                  <TextField
                    label="Max discount (₹, optional)"
                    prefix="₹"
                    inputMode="numeric"
                    placeholder="cap, e.g. 300"
                    value={o.maxDiscount}
                    onChange={(e) => updateOffer(i, 'maxDiscount', sanitizeAmount(e.target.value))}
                    onBlur={flushNow}
                  />
                )}
                <TextField
                  label="Expires on (optional)"
                  type="date"
                  value={o.expiry}
                  onChange={(e) => updateOffer(i, 'expiry', e.target.value)}
                  onBlur={flushNow}
                />
                <button
                  type="button"
                  className="rv-trash"
                  aria-label="Remove offer"
                  onClick={() => removeOffer(i)}
                >
                  <Icon name="trash-2" size={18} />
                </button>
              </div>
              {norm && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--brand-accent)' }}>
                  <Icon name="ticket-percent" size={15} />
                  {offerSummary(norm)}
                  {norm.code ? ` · code ${norm.code}` : ''}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button variant="secondary" size="sm" onClick={addOffer} iconLeft={<Icon name="plus" size={17} />}>
        Add offer
      </Button>
    </div>
  );
}
