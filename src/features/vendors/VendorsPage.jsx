import { useAdmin } from '../../context/AdminContext.jsx'
import { fmt, initials } from '../../data/mockData.js'
import Badge from '../../components/ui/Badge.jsx'

const KYC_META = { verified: ['success', 'Verified'], pending: ['warning', 'Pending'], rejected: ['error', 'Rejected'] }
const ACC_META = { active: ['success', 'Active'], suspended: ['error', 'Suspended'] }

const GRID = { display: 'grid', gridTemplateColumns: '1.6fr 1.1fr 1.4fr 90px 120px 110px 130px 115px', minWidth: 1100, gap: 10 }

export default function VendorsPage() {
  const { vendors, openDrawer } = useAdmin()

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
