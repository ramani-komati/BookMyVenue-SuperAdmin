import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext.jsx'
import { fmt, initials } from '../../data/mockData.js'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import useViewport from '../../hooks/useViewport.js'

const KYC_META = { verified: ['success', 'Verified'], pending: ['warning', 'Pending'], rejected: ['error', 'Rejected'] }
const USER_META = { active: ['success', 'Active'], blocked: ['error', 'Blocked'] }
const VENUE_META = { live: ['live', 'Live'], paused: ['warning', 'Paused'], rejected: ['rejected', 'Rejected'], draft: ['draft', 'Draft'] }

const sectionTitle = { fontSize: 13.5, fontWeight: 800, color: 'var(--text-heading)', textTransform: 'uppercase', letterSpacing: '.04em' }

function StatTile({ label, value }) {
  return (
    <div style={{ background: '#F4EAE5', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 800, color: 'var(--text-heading)', marginTop: 4 }}>{value}</div>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '11px 14px', border: '1px solid var(--border-subtle)', borderRadius: 11 }}>
      <span style={{ flex: '0 0 110px', fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.03em' }}>{label}</span>
      <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>{value}</span>
    </div>
  )
}

export default function DetailDrawer() {
  const {
    drawer, closeDrawer, openDrawer, vendors, users, venues, bookings,
    updateVendor, updateUser, updateVenue, openModal, logAudit, showToast,
  } = useAdmin()
  const { isMobile } = useViewport()
  const navigate = useNavigate()

  // Escape closes; lock body scroll while open
  useEffect(() => {
    if (!drawer) return
    const onKey = (e) => { if (e.key === 'Escape') closeDrawer() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [drawer, closeDrawer])

  if (!drawer) return null

  let header = null
  let body = null

  if (drawer.type === 'venue') {
    const v = venues.find((x) => x.id === drawer.id)
    if (!v) return null
    const [badge, statusLabel] = VENUE_META[v.status]
    const owner = vendors.find((x) => x.name === v.vendor)

    const togglePause = () => {
      if (v.status === 'paused') {
        updateVenue(v.id, { status: 'live' })
        logAudit('Unpaused venue', v.name, 'paused → live')
        showToast(v.name + ' is live again')
      } else {
        openModal({
          title: 'Pause ' + v.name + '?',
          body: 'The venue stops taking new bookings immediately. Existing bookings are not affected.',
          confirmLabel: 'Pause venue', danger: true, needsReason: true,
          onConfirm: (reason) => {
            updateVenue(v.id, { status: 'paused' })
            logAudit('Paused venue', v.name, 'reason: ' + reason)
            showToast(v.name + ' paused')
          },
        })
      }
    }

    const toggleFeature = () => {
      updateVenue(v.id, { featured: !v.featured })
      logAudit(v.featured ? 'Unfeatured venue' : 'Featured venue', v.name, 'homepage feature: ' + (v.featured ? 'off' : 'on'))
      showToast(v.featured ? v.name + ' removed from homepage' : v.name + ' featured on homepage')
    }

    header = (
      <>
        <div style={{ width: 72, height: 52, borderRadius: 10, flex: '0 0 auto', backgroundColor: 'var(--neutral-100)', backgroundImage: `url('${v.photo}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 800, color: 'var(--text-heading)' }}>{v.name}</div>
          <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>{v.category} · {v.area}, {v.city}</div>
        </div>
      </>
    )

    body = (
      <>
        <div style={{ height: 210, borderRadius: 12, backgroundColor: 'var(--neutral-100)', backgroundImage: `url('${v.photo.replace('w=480', 'w=900')}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Badge status={badge} size="md">{statusLabel}</Badge>
          <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--navy-600)', background: 'var(--navy-50)', padding: '5px 13px', borderRadius: 999 }}>{v.category}</span>
          {v.featured && <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--red-600)' }}>★ Featured on homepage</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <StatTile label="Price / hr" value={v.price} />
          <StatTile label="Rating" value={'★ ' + v.rating} />
          <StatTile label="Bookings" value={v.bookings} />
          <StatTile label="Total revenue" value={fmt(v.revenueNum)} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={sectionTitle}>Venue details</div>
          <DetailRow label="Location" value={v.area + ', ' + v.city} />
          <DetailRow label="Capacity" value={v.capacity} />
          <DetailRow label="Open hours" value={v.hours} />
          <DetailRow label="Packages" value={v.packages} />
          <DetailRow label="Listed since" value={v.addedOn} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={sectionTitle}>Amenities</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {v.amenities.map((am) => (
              <span key={am} style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--text-body)', background: '#F4EAE5', padding: '7px 14px', borderRadius: 999 }}>{am}</span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={sectionTitle}>Vendor</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--border-subtle)', borderRadius: 11 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--navy-50)', color: 'var(--navy-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flex: '0 0 auto' }}>{initials(v.vendor)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>{v.vendor}</div>
              {owner && <div style={{ fontSize: 14.5, color: 'var(--text-muted)' }}>{owner.phone}</div>}
            </div>
            {owner && (
              <Button variant="secondary" size="sm" onClick={() => openDrawer('vendor', owner.id)}>View vendor</Button>
            )}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button variant={v.status === 'paused' ? 'secondary' : 'danger'} size="sm" block onClick={togglePause}>
            {v.status === 'paused' ? 'Unpause venue' : 'Pause venue'}
          </Button>
          <Button variant="navy" size="sm" block onClick={toggleFeature}>
            {v.featured ? 'Remove from homepage' : 'Feature on homepage'}
          </Button>
        </div>
      </>
    )
  } else {
    let view
    if (drawer.type === 'vendor') {
      const p = vendors.find((x) => x.id === drawer.id)
      if (!p) return null
      const theirVenues = venues.filter((v) => v.vendor === p.name)
      view = {
        isVendor: true,
        name: p.name,
        initials: initials(p.name),
        sub: p.phone + ' · ' + p.email,
        stats: [
          { label: 'Venues', value: p.venues },
          { label: 'Total earnings', value: fmt(p.earningsNum) },
          { label: 'Joined', value: p.joined },
          { label: 'KYC', value: KYC_META[p.kyc][1] },
        ],
        items: theirVenues.map((v) => ({
          label: v.name,
          sub: v.city + ' · ' + VENUE_META[v.status][1],
          onClick: () => openDrawer('venue', v.id),
        })),
        payout: p.payout,
        kycBadge: KYC_META[p.kyc][0],
        kycLabel: KYC_META[p.kyc][1],
        canVerify: p.kyc === 'pending',
        verify: () => {
          updateVendor(p.id, { kyc: 'verified' })
          logAudit('Verified KYC', p.name, 'pending → verified')
          showToast(p.name + "'s KYC verified")
        },
        dangerVariant: p.acc === 'active' ? 'danger' : 'secondary',
        dangerLabel: p.acc === 'active' ? 'Suspend account' : 'Reactivate account',
        dangerAction: () => {
          if (p.acc === 'active') {
            openModal({
              title: 'Suspend ' + p.name + '?',
              body: 'All their venues stop taking bookings and payouts are held. They will be notified.',
              confirmLabel: 'Suspend', danger: true, needsReason: true,
              onConfirm: (reason) => {
                updateVendor(p.id, { acc: 'suspended' })
                closeDrawer()
                logAudit('Suspended vendor', p.name, 'reason: ' + reason)
                showToast(p.name + ' suspended')
              },
            })
          } else {
            updateVendor(p.id, { acc: 'active' })
            logAudit('Reactivated vendor', p.name, 'suspended → active')
            showToast(p.name + ' reactivated')
          }
        },
      }
    } else {
      const u = users.find((x) => x.id === drawer.id)
      if (!u) return null
      const theirBookings = bookings.filter((b) => b.customer === u.name)
      view = {
        isVendor: false,
        name: u.name,
        initials: initials(u.name),
        sub: u.phone,
        stats: [
          { label: 'Bookings', value: u.bookings },
          { label: 'Total spent', value: fmt(u.spentNum) },
          { label: 'Last active', value: u.lastActive },
          { label: 'Status', value: USER_META[u.status][1] },
        ],
        items: theirBookings.map((b) => ({
          label: b.id + ' · ' + b.venue,
          sub: fmt(b.amountNum),
          onClick: () => { closeDrawer(); navigate('/bookings', { state: { expandId: b.id } }) },
        })),
        dangerVariant: u.status === 'active' ? 'danger' : 'secondary',
        dangerLabel: u.status === 'active' ? 'Block user' : 'Unblock user',
        dangerAction: () => {
          if (u.status === 'active') {
            openModal({
              title: 'Block ' + u.name + '?',
              body: 'They will not be able to make new bookings. Existing bookings stay valid.',
              confirmLabel: 'Block user', danger: true, needsReason: true,
              onConfirm: (reason) => {
                updateUser(u.id, { status: 'blocked' })
                closeDrawer()
                logAudit('Blocked user', u.name, 'reason: ' + reason)
                showToast(u.name + ' blocked')
              },
            })
          } else {
            updateUser(u.id, { status: 'active' })
            logAudit('Unblocked user', u.name, 'blocked → active')
            showToast(u.name + ' unblocked')
          }
        },
      }
    }

    header = (
      <>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--navy-50)', color: 'var(--navy-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 17 }}>{view.initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 800, color: 'var(--text-heading)' }}>{view.name}</div>
          <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>{view.sub}</div>
        </div>
      </>
    )

    body = (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {view.stats.map((st) => <StatTile key={st.label} label={st.label} value={st.value} />)}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={sectionTitle}>
            {view.isVendor ? 'Their venues' : 'Booking history'}
          </div>
          {view.items.map((it, i) => (
            <button
              key={i}
              onClick={it.onClick}
              className="hover-wash"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: '1px solid var(--border-subtle)', borderRadius: 11, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left', width: '100%' }}
            >
              <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>{it.label}</span>
              <span style={{ fontSize: 15, color: 'var(--text-muted)' }}>{it.sub}</span>
            </button>
          ))}

          {view.isVendor && (
            <>
              <div style={{ ...sectionTitle, marginTop: 8 }}>Payout account</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: '1px solid var(--border-subtle)', borderRadius: 11 }}>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>{view.payout}</span>
                <Badge status={view.kycBadge} size="sm">{view.kycLabel}</Badge>
              </div>
              {view.canVerify && (
                <Button variant="navy" size="sm" block onClick={view.verify}>Verify KYC</Button>
              )}
            </>
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
          <Button variant={view.dangerVariant} size="sm" block onClick={view.dangerAction}>{view.dangerLabel}</Button>
        </div>
      </>
    )
  }

  return (
    <>
      <div onClick={closeDrawer} style={{ position: 'fixed', inset: 0, background: 'rgba(6,21,44,.45)', zIndex: 40 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: isMobile ? '100vw' : 500, maxWidth: '100vw', background: 'var(--surface-card)', boxShadow: 'var(--shadow-xl)', zIndex: 41, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: isMobile ? '18px 16px' : '26px 30px', borderBottom: '1px solid var(--border-subtle)' }}>
          {header}
          <button onClick={closeDrawer} aria-label="Close" style={{ width: 38, height: 38, borderRadius: 10, border: 'none', background: '#F4EAE5', color: 'var(--text-heading)', cursor: 'pointer', fontSize: 16, fontWeight: 800, flex: '0 0 auto' }}>×</button>
        </div>
        <div style={{ padding: isMobile ? '18px 16px' : '26px 30px', display: 'flex', flexDirection: 'column', gap: isMobile ? 20 : 24 }}>
          {body}
        </div>
      </div>
    </>
  )
}
