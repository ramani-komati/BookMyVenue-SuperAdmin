import { useEffect, useMemo, useState } from 'react'
import { fetchEventCategories } from '../../services/catalogApi.js'
import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'
import EventPhotos from './EventPhotos.jsx'
import {
  blankEvent, eventToForm, slugKey, todayISO, toPayload, validateEvent,
} from './eventForm.js'

/**
 * EventFormModal — create or edit one ticketed event.
 *
 * Events are a super-admin product, so this is the ONLY event editor in the
 * product. It is a full-screen sheet rather than a centred dialog because the
 * form is long (dates and ticket rows grow), and a centred dialog on a phone
 * ends up a scrolling box inside a scrolling page.
 *
 * Validation runs locally for instant per-field feedback, but the SERVER is
 * the authority: its refusal (a date with sold tickets, an unpublishable
 * event) is shown verbatim at the top rather than being paraphrased.
 */

const label = {
  display: 'block', fontSize: 13.5, fontWeight: 700,
  color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '.01em',
}

const input = {
  fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-heading)',
  minHeight: 44, padding: '0 14px', background: 'var(--surface-card)',
  border: '1px solid var(--border-default)', borderRadius: 11, width: '100%',
  // Without this, a 100%-wide input inside a grid cell overflows its column
  // on narrow screens (padding + border sit OUTSIDE the 100%).
  boxSizing: 'border-box',
}

const errorInput = { ...input, borderColor: 'var(--error-500)' }

const textarea = { ...input, minHeight: 86, padding: '12px 14px', resize: 'vertical' }

const sectionTitle = {
  fontFamily: 'var(--font-display)', fontSize: 16.5, fontWeight: 700,
  color: 'var(--text-heading)', margin: '0 0 2px',
}

const fieldError = { fontSize: 13, color: 'var(--error-600)', fontWeight: 600, marginTop: 5 }

function Field({ title, error, hint, children, span }) {
  return (
    <div style={{ gridColumn: span ? '1 / -1' : undefined, minWidth: 0 }}>
      <label style={label}>{title}</label>
      {children}
      {hint && !error && (
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 5 }}>{hint}</div>
      )}
      {error && <div style={fieldError}>{error}</div>}
    </div>
  )
}

function Section({ title, sub, children }) {
  return (
    <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h3 style={sectionTitle}>{title}</h3>
        {sub && <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>{sub}</div>}
      </div>
      {children}
    </div>
  )
}

export default function EventFormModal({ event, onClose, onCreate, onUpdate, showToast }) {
  const editing = Boolean(event?.id)
  const [form, setForm] = useState(() => (editing ? eventToForm(event) : blankEvent()))
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [busy, setBusy] = useState(false)
  const [categories, setCategories] = useState([])
  const today = useMemo(todayISO, [])

  useEffect(() => {
    let alive = true
    fetchEventCategories().then((list) => {
      if (alive && list.length) setCategories(list)
    })
    return () => { alive = false }
  }, [])

  // Esc closes, and the page behind must not scroll while the sheet is open.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    // Clear this field's error as soon as it is touched — leaving a stale
    // red message under a field the admin just fixed reads as a bug.
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e))
  }

  // --- date rows ---
  const setDate = (index, patch) => {
    setForm((f) => ({
      ...f,
      dates: f.dates.map((d, i) => (i === index ? { ...d, ...patch } : d)),
    }))
    setErrors((e) => (e.dates ? { ...e, dates: undefined } : e))
  }
  const addDate = () => setForm((f) => ({
    ...f, dates: [...f.dates, { date: '', capacity: '', isAvailable: true }],
  }))
  const removeDate = (index) => setForm((f) => ({
    ...f,
    dates: f.dates.length > 1 ? f.dates.filter((_, i) => i !== index) : f.dates,
  }))

  // --- ticket rows ---
  const setTicket = (index, patch) => {
    setForm((f) => ({
      ...f,
      ticketTypes: f.ticketTypes.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    }))
    setErrors((e) => (e.ticketTypes ? { ...e, ticketTypes: undefined } : e))
  }
  const addTicket = () => setForm((f) => ({
    ...f,
    ticketTypes: [...f.ticketTypes, { key: '', label: '', price: '', seatsPerTicket: 1 }],
  }))
  const removeTicket = (index) => setForm((f) => ({
    ...f, ticketTypes: f.ticketTypes.filter((_, i) => i !== index),
  }))

  // Adult and child are required by the product, so their rows cannot be
  // removed or renamed away — only re-priced.
  const isRequiredTicket = (t) => ['adult', 'child'].includes(slugKey(t.key || t.label))

  const submit = async ({ publish }) => {
    setServerError('')
    const found = validateEvent(form)
    setErrors(found)
    if (Object.values(found).some(Boolean)) {
      setServerError('Please fix the highlighted fields.')
      return
    }
    setBusy(true)
    try {
      const payload = toPayload(form, { publish })
      if (editing) {
        await onUpdate(form.id, publish ? { ...payload, status: 'publish' } : payload)
        showToast?.(publish ? `${payload.name} is now live` : `${payload.name} saved`)
      } else {
        await onCreate(payload)
        showToast?.(publish ? `${payload.name} is now live` : `${payload.name} saved as a draft`)
      }
      onClose()
    } catch (err) {
      // The server refused. Its message names the real reason (a date with
      // tickets sold, nothing bookable to publish) — show it unchanged.
      setServerError(err.message || 'Could not save this event.')
      if (err.code === 'SAVED_AS_DRAFT') {
        showToast?.('Saved as a draft — it was not published')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editing ? `Edit ${event.name}` : 'Create an event'}
      style={{
        position: 'fixed', inset: 0, zIndex: 120,
        background: 'rgba(8, 15, 30, .45)',
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
        padding: 'max(12px, env(safe-area-inset-top)) 12px 12px',
        overflowY: 'auto', overscrollBehavior: 'contain',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: '#FBF6F4', borderRadius: 18, width: '100%', maxWidth: 820,
          boxShadow: 'var(--shadow-lg, 0 18px 50px rgba(8,15,30,.28))',
          display: 'flex', flexDirection: 'column', marginBottom: 24,
        }}
      >
        {/* Sticky header so Save is always reachable on a long form. */}
        <div
          style={{
            position: 'sticky', top: 0, zIndex: 2,
            background: 'var(--surface-card)',
            borderBottom: '1px solid var(--border-subtle)',
            borderRadius: '18px 18px 0 0',
            padding: '14px 18px', display: 'flex', alignItems: 'center',
            gap: 12, flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 800, color: 'var(--text-heading)' }}>
              {editing ? 'Edit event' : 'Create an event'}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
              {editing
                ? 'Changes go live immediately for a published event.'
                : 'Saved as a draft until you publish it.'}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {serverError && (
            <div
              role="alert"
              style={{
                background: 'var(--status-error-bg)', color: 'var(--status-error-fg)',
                border: '1px solid var(--error-500)', borderRadius: 12,
                padding: '12px 14px', fontSize: 14.5, fontWeight: 600,
              }}
            >
              {serverError}
            </div>
          )}

          <Section title="About the event">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
              <Field title="Event name *" error={errors.name}>
                <input
                  className="bmva" type="text" value={form.name}
                  placeholder="e.g. Kakatiya Navaratri Utsav"
                  onChange={(e) => set('name', e.target.value)}
                  style={errors.name ? errorInput : input}
                />
              </Field>
              <Field title="Category *" error={errors.category}>
                {categories.length > 0 ? (
                  <select
                    className="bmva" value={form.category}
                    onChange={(e) => set('category', e.target.value)}
                    style={errors.category ? errorInput : input}
                  >
                    <option value="">Select a category…</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <input
                    className="bmva" type="text" value={form.category}
                    placeholder="e.g. Navaratri"
                    onChange={(e) => set('category', e.target.value)}
                    style={errors.category ? errorInput : input}
                  />
                )}
              </Field>
              <Field title="Description" span>
                <textarea
                  className="bmva" value={form.description}
                  placeholder="What happens, who it suits, what to bring…"
                  onChange={(e) => set('description', e.target.value)}
                  style={textarea}
                />
              </Field>
            </div>
          </Section>

          <Section
            title="Photos"
            sub="The first photo is the banner on the event card and detail page; the rest run as a slideshow, exactly like a venue's gallery."
          >
            <EventPhotos
              photos={form.photos}
              onChange={(next) => set('photos', next)}
              disabled={busy}
            />
          </Section>

          <Section title="Where and when">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <Field title="Venue / grounds name *" error={errors.venueName}>
                <input
                  className="bmva" type="text" value={form.venueName}
                  placeholder="e.g. Warangal Fort Grounds"
                  onChange={(e) => set('venueName', e.target.value)}
                  style={errors.venueName ? errorInput : input}
                />
              </Field>
              <Field title="Locality" hint="Area customers search by, e.g. Hanamkonda.">
                <input
                  className="bmva" type="text" value={form.locality}
                  onChange={(e) => set('locality', e.target.value)} style={input}
                />
              </Field>
              <Field title="City" hint="e.g. Warangal. Hanamkonda / Kazipet events show under Warangal too.">
                <input
                  className="bmva" type="text" value={form.city}
                  onChange={(e) => set('city', e.target.value)} style={input}
                />
              </Field>
              <Field title="Address" span>
                <input
                  className="bmva" type="text" value={form.address}
                  onChange={(e) => set('address', e.target.value)} style={input}
                />
              </Field>
              <Field
                title="Google Maps link"
                error={errors.mapsLink}
                hint="Paste the Share link from Google Maps. Shown as a map on the event page."
              >
                <input
                  className="bmva" type="url" value={form.mapsLink}
                  onChange={(e) => set('mapsLink', e.target.value)}
                  style={errors.mapsLink ? errorInput : input}
                  placeholder="https://maps.app.goo.gl/…"
                />
              </Field>
              <Field title="Start time *" error={errors.startTime} hint="Applies to every date.">
                <input
                  className="bmva" type="time" value={form.startTime}
                  onChange={(e) => set('startTime', e.target.value)}
                  style={errors.startTime ? errorInput : input}
                />
              </Field>
              <Field title="End time *" error={errors.endTime}>
                <input
                  className="bmva" type="time" value={form.endTime}
                  onChange={(e) => set('endTime', e.target.value)}
                  style={errors.endTime ? errorInput : input}
                />
              </Field>
            </div>
          </Section>

          <Section
            title="Dates and capacity"
            sub="Capacity is per date — selling out one night must not close the others. Customers never see these numbers; they only stop a night being oversold."
          >
            {errors.dates && <div style={fieldError}>{errors.dates}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {form.dates.map((row, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end',
                    background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
                    borderRadius: 12, padding: 12,
                  }}
                >
                  <div style={{ flex: '1 1 170px', minWidth: 0 }}>
                    <label style={label}>Date</label>
                    <input
                      className="bmva" type="date" value={row.date}
                      // An EXISTING past night keeps its value (it already ran);
                      // a new row cannot be set before today.
                      min={row.existing ? undefined : today}
                      onChange={(e) => setDate(index, { date: e.target.value })}
                      style={input}
                    />
                  </div>
                  <div style={{ flex: '1 1 130px', minWidth: 0 }}>
                    <label style={label}>Capacity</label>
                    <input
                      className="bmva" type="number" min="1" value={row.unlimited ? '' : row.capacity}
                      placeholder={row.unlimited ? 'Unlimited' : ''} disabled={row.unlimited}
                      onChange={(e) => setDate(index, { capacity: e.target.value })}
                      style={input}
                    />
                  </div>
                  {/* Unlimited: any number of people can register for this date. */}
                  <label
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      fontSize: 14.5, fontWeight: 600, color: 'var(--text-heading)',
                      minHeight: 44, flex: '0 0 auto', cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox" checked={Boolean(row.unlimited)}
                      onChange={(e) => setDate(index, { unlimited: e.target.checked })}
                      style={{ width: 18, height: 18 }}
                    />
                    Unlimited
                  </label>
                  <label
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      fontSize: 14.5, fontWeight: 600, color: 'var(--text-heading)',
                      minHeight: 44, flex: '0 0 auto', cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox" checked={row.isAvailable !== false}
                      onChange={(e) => setDate(index, { isAvailable: e.target.checked })}
                      style={{ width: 18, height: 18 }}
                    />
                    On sale
                  </label>
                  {row.sold > 0 && (
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, flex: '0 0 auto' }}>
                      {row.sold} sold
                    </span>
                  )}
                  <Button
                    variant="ghost" size="sm"
                    disabled={form.dates.length === 1 || row.sold > 0}
                    onClick={() => removeDate(index)}
                    style={{ flex: '0 0 auto' }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="secondary" size="sm" onClick={addDate} style={{ alignSelf: 'flex-start' }}>
              <Icon name="plus" size={16} /> Add a date
            </Button>
          </Section>

          <Section
            title="Ticket types and prices"
            sub="Adult and child are required. Prices are in whole rupees."
          >
            {errors.ticketTypes && <div style={fieldError}>{errors.ticketTypes}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {form.ticketTypes.map((row, index) => {
                const locked = isRequiredTicket(row)
                return (
                  <div
                    key={index}
                    style={{
                      display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end',
                      background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
                      borderRadius: 12, padding: 12,
                    }}
                  >
                    <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                      <label style={label}>Name</label>
                      <input
                        className="bmva" type="text" value={row.label}
                        placeholder="e.g. VIP"
                        disabled={locked}
                        onChange={(e) => setTicket(index, { label: e.target.value, key: slugKey(e.target.value) })}
                        style={{ ...input, opacity: locked ? 0.7 : 1 }}
                      />
                    </div>
                    <div style={{ flex: '1 1 120px', minWidth: 0 }}>
                      <label style={label}>Price (₹)</label>
                      <input
                        className="bmva" type="number" min="0" value={row.price}
                        onChange={(e) => setTicket(index, { price: e.target.value })}
                        style={input}
                      />
                    </div>
                    <div style={{ flex: '1 1 120px', minWidth: 0 }}>
                      <label style={label}>Admits</label>
                      <input
                        className="bmva" type="number" min="1" max="20"
                        value={row.seatsPerTicket || 1}
                        onChange={(e) => setTicket(index, { seatsPerTicket: e.target.value })}
                        style={input}
                      />
                    </div>
                    <Button
                      variant="ghost" size="sm" disabled={locked}
                      onClick={() => removeTicket(index)} style={{ flex: '0 0 auto' }}
                    >
                      Remove
                    </Button>
                  </div>
                )
              })}
            </div>
            <Button variant="secondary" size="sm" onClick={addTicket} style={{ alignSelf: 'flex-start' }}>
              <Icon name="plus" size={16} /> Add a ticket type
            </Button>
          </Section>

          <Section
            title="Organiser and terms"
            sub="Recorded for your reference and the customer's contact line. No vendor account, bank details or payout setup is involved."
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <Field title="Organiser name">
                <input
                  className="bmva" type="text" value={form.organizerName}
                  placeholder="e.g. Kakatiya Cultural Trust"
                  onChange={(e) => set('organizerName', e.target.value)} style={input}
                />
              </Field>
              <Field title="Organiser phone" error={errors.organizerPhone}>
                <input
                  className="bmva" type="tel" inputMode="numeric" maxLength={10}
                  value={form.organizerPhone}
                  onChange={(e) => set('organizerPhone', e.target.value.replace(/\D/g, ''))}
                  style={errors.organizerPhone ? errorInput : input}
                />
              </Field>
              <Field title="Customer helpline" error={errors.contactPhone} hint="Shown on the event page.">
                <input
                  className="bmva" type="tel" inputMode="numeric" maxLength={10}
                  value={form.contactPhone}
                  onChange={(e) => set('contactPhone', e.target.value.replace(/\D/g, ''))}
                  style={errors.contactPhone ? errorInput : input}
                />
              </Field>
              <Field title="Booking opens on" hint="Optional — leave blank to sell immediately.">
                <input
                  className="bmva" type="date" value={form.bookingOpensOn || ''}
                  onChange={(e) => set('bookingOpensOn', e.target.value)} style={input}
                />
              </Field>
              <Field title="Booking closes on" error={errors.bookingClosesOn}>
                <input
                  className="bmva" type="date" value={form.bookingClosesOn || ''}
                  onChange={(e) => set('bookingClosesOn', e.target.value)}
                  style={errors.bookingClosesOn ? errorInput : input}
                />
              </Field>
              <Field title="Terms for ticket buyers" span>
                <textarea
                  className="bmva" value={form.terms}
                  placeholder="Entry rules, age limits, refund policy…"
                  onChange={(e) => set('terms', e.target.value)} style={textarea}
                />
              </Field>
            </div>
          </Section>
        </div>

        {/* Sticky footer: on a phone the form is several screens long. */}
        <div
          style={{
            position: 'sticky', bottom: 0, zIndex: 2,
            background: 'var(--surface-card)',
            borderTop: '1px solid var(--border-subtle)',
            borderRadius: '0 0 18px 18px',
            padding: '12px 16px', display: 'flex', gap: 10,
            flexWrap: 'wrap', justifyContent: 'flex-end',
          }}
        >
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => submit({ publish: false })}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Save as draft'}
          </Button>
          {form.status !== 'live' && (
            <Button variant="primary" size="sm" disabled={busy} onClick={() => submit({ publish: true })}>
              {busy ? 'Saving…' : 'Save & publish'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
