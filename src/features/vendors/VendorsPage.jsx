import { useState } from 'react'
import { useAdmin } from '../../context/AdminContext.jsx'
import useViewport from '../../hooks/useViewport.js'
import { adminApi } from '../../services/adminApi.js'
import { fmt, initials, statusMeta } from '../../utils/format.js'
import { exportFileName } from '../../utils/exports.js'
import { vendorEarnings } from '../../utils/revenue.js'
import { localTodayISO } from '../../utils/slots.js'
import Badge from '../../components/ui/Badge.jsx'
import ExportButton from '../../components/ui/ExportButton.jsx'
import { countStyle, searchStyle, selectStyle } from '../../components/ui/filterStyles.js'
import { ACCOUNT_OPTIONS, KYC_OPTIONS, filterVendors, vendorExportParams } from './vendorFilters.js'

const ACC_META = { active: ['success', 'Active'], suspended: ['error', 'Suspended'] }

const GRID = { display: 'grid', gridTemplateColumns: '1.6fr 1.1fr 1.4fr 90px 1.7fr 120px 110px 115px', minWidth: 1180, gap: 10 }

export default function VendorsPage() {
  const { vendors, venues, bookings, settings, openDrawer } = useAdmin()
  const { width } = useViewport()
  const compact = width < 768
  const [query, setQuery] = useState('')
  const [acc, setAcc] = useState('All')
  const [kyc, setKyc] = useState('All')
  const filters = { query, acc, kyc }
  const shown = filterVendors(vendors, filters)
  const filtering = shown.length !== vendors.length
  // The vendor's actual money: Σ (amount − booking-time frozen platform fee)
  // across their venues' kept bookings — not gross turnover.
  const earningsOf = (p) => fmt(vendorEarnings(p.name, venues, bookings, Number(settings?.fee) || 20))
  // The vendor's venues by NAME (distinct base names — per-unit listings like
  // "Arena — Pitch 2" collapse to their parent "Arena").
  const venueNamesOf = (p) => [
    ...new Set(
      venues
        .filter((v) => v.vendor === p.name)
        .map((v) => String(v.name || '').split(' — ')[0].trim())
        .filter(Boolean),
    ),
  ]

  // Search + account/KYC filters, and the export of exactly these vendors
  // (the server applies the same filters — see vendorFilters.js).
  const toolbar = (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <input
        className="bmva" type="search" placeholder="Search name, phone, email or ID…" value={query}
        onChange={(e) => setQuery(e.target.value)} style={searchStyle(compact)} aria-label="Search vendors"
      />
      <select value={acc} onChange={(e) => setAcc(e.target.value)} style={selectStyle} aria-label="Account status">
        {ACCOUNT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <select value={kyc} onChange={(e) => setKyc(e.target.value)} style={selectStyle} aria-label="KYC status">
        {KYC_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <div style={{ flex: 1 }} />
      <div style={countStyle}>
        {vendors.length === 0
          ? 'No vendors yet.'
          : `${filtering ? `${shown.length} of ` : ''}${vendors.length} vendor${vendors.length === 1 ? '' : 's'}`}
      </div>
      <ExportButton
        fetchFile={() => adminApi.exportReport('vendors', vendorExportParams(filters))}
        filename={exportFileName('admin_vendors', localTodayISO())}
        count={shown.length} noun={shown.length === 1 ? 'vendor' : 'vendors'} what="vendors"
        label={filtering ? 'Export matching vendors' : 'Export Excel'}
        title="Vendor details, venues, KYC and booking totals — never bank details or passwords"
      />
    </div>
  )
  const noMatch = vendors.length > 0 && shown.length === 0 && (
    <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 15 }}>
      No vendors match these filters.
    </div>
  )

  if (compact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {toolbar}
        {noMatch}
        {shown.map((p) => (
          <div key={p.id} onClick={() => openDrawer('vendor', p.id)} className="card hover-wash" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--navy-50)', color: 'var(--navy-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flex: '0 0 auto' }}>{initials(p.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>{p.name}</div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.phone} · {p.email}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 14.5 }}>
              <span style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{p.venues} venue{p.venues === 1 ? '' : 's'}</span>
              <span style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{earningsOf(p)}</span>
              <span style={{ color: 'var(--text-muted)' }}>since {p.joined}</span>
              <span style={{ flex: 1 }} />
              <Badge status={statusMeta(ACC_META, p.acc)[0]} size="sm">{statusMeta(ACC_META, p.acc)[1]}</Badge>
            </div>
            {venueNamesOf(p).length > 0 && (
              <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{venueNamesOf(p).join(', ')}</div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {toolbar}
      {noMatch || (
      <div className="card" style={{ padding: '8px 20px 16px', display: 'flex', flexDirection: 'column', overflowX: 'auto' }}>
        <div style={{ ...GRID, padding: '14px 12px 10px', fontSize: 13.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>Vendor</div><div>Phone</div><div>Email</div><div>Venues</div><div>Venue names</div><div>Earnings</div><div>Joined</div><div>Account</div>
        </div>
        {shown.map((p) => (
          <div
            key={p.id}
            onClick={() => openDrawer('vendor', p.id)}
            className="hover-row"
            style={{ ...GRID, padding: '16px 12px', fontSize: 16, alignItems: 'center', borderBottom: '1px solid var(--neutral-100)', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--navy-50)', color: 'var(--navy-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flex: '0 0 auto' }}>{initials(p.name)}</div>
              <div style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
            </div>
            <div style={{ fontSize: 16 }}>{p.phone}</div>
            <div style={{ fontSize: 15, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.email}</div>
            <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{p.venues}</div>
            {(() => { const names = venueNamesOf(p); const text = names.join(', '); return (
              <div title={text} style={{ fontSize: 15, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text || '—'}</div>
            ) })()}
            <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{earningsOf(p)}</div>
            <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>{p.joined}</div>
            <div><Badge status={statusMeta(ACC_META, p.acc)[0]} size="sm">{statusMeta(ACC_META, p.acc)[1]}</Badge></div>
          </div>
        ))}
      </div>
      )}
    </div>
  )
}
