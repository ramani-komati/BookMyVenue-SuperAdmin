import { useAdmin } from '../../context/AdminContext.jsx'
import useViewport from '../../hooks/useViewport.js'
import { fmt, initials } from '../../data/mockData.js'
import Badge from '../../components/ui/Badge.jsx'

const KYC_META = { verified: ['success', 'Verified'], pending: ['warning', 'Pending'], rejected: ['error', 'Rejected'] }
const ACC_META = { active: ['success', 'Active'], suspended: ['error', 'Suspended'] }

const GRID = { display: 'grid', gridTemplateColumns: '1.6fr 1.1fr 1.4fr 90px 120px 110px 130px 115px', minWidth: 1100, gap: 10 }

export default function VendorsPage() {
  const { vendors, openDrawer } = useAdmin()
  const { width } = useViewport()
  const compact = width < 768

  if (compact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {vendors.map((p) => (
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
              <span style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{fmt(p.earningsNum)}</span>
              <span style={{ color: 'var(--text-muted)' }}>since {p.joined}</span>
              <span style={{ flex: 1 }} />
              <Badge status={KYC_META[p.kyc][0]} size="sm">{'KYC ' + KYC_META[p.kyc][1]}</Badge>
              <Badge status={ACC_META[p.acc][0]} size="sm">{ACC_META[p.acc][1]}</Badge>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card" style={{ padding: '8px 20px 16px', display: 'flex', flexDirection: 'column', overflowX: 'auto' }}>
        <div style={{ ...GRID, padding: '14px 12px 10px', fontSize: 13.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>Vendor</div><div>Phone</div><div>Email</div><div>Venues</div><div>Earnings</div><div>Joined</div><div>KYC</div><div>Account</div>
        </div>
        {vendors.map((p) => (
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
            <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{fmt(p.earningsNum)}</div>
            <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>{p.joined}</div>
            <div><Badge status={KYC_META[p.kyc][0]} size="sm">{KYC_META[p.kyc][1]}</Badge></div>
            <div><Badge status={ACC_META[p.acc][0]} size="sm">{ACC_META[p.acc][1]}</Badge></div>
          </div>
        ))}
      </div>
    </div>
  )
}
