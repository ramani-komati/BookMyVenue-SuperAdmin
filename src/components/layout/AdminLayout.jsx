import { useEffect, useRef, useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext.jsx'
import useViewport from '../../hooks/useViewport.js'
import Icon from '../ui/Icon.jsx'
import ConfirmModal from '../overlays/ConfirmModal.jsx'
import DetailDrawer from '../overlays/DetailDrawer.jsx'
import Toast from '../overlays/Toast.jsx'
import DataErrorCard from '../DataErrorCard.jsx'
import { adminApi } from '../../services/adminApi.js'
import { lockBodyScroll, unlockBodyScroll } from '../../utils/scrollLock.js'

const NAV_ITEMS = [
  { key: 'dashboard', path: '/', label: 'Dashboard', icon: 'layout-dashboard' },
  { key: 'approvals', path: '/approvals', label: 'Approvals', icon: 'check-circle', badge: true },
  { key: 'venues', path: '/venues', label: 'Live venues', icon: 'building-2' },
  { key: 'all-venues', path: '/all-venues', label: 'All venues', icon: 'archive' },
  { key: 'deletion-requests', path: '/deletion-requests', label: 'Deletion requests', icon: 'inbox', badge: 'deletions' },
  { key: 'vendors', path: '/vendors', label: 'Vendors', icon: 'briefcase' },
  { key: 'users', path: '/users', label: 'Users', icon: 'users' },
  { key: 'bookings', path: '/bookings', label: 'Bookings', icon: 'calendar-check' },
  { key: 'payouts', path: '/payouts', label: 'Payouts', icon: 'wallet' },
  { key: 'refunds', path: '/refunds', label: 'Refunds', icon: 'inbox' },
  { key: 'reviews', path: '/reviews', label: 'Reviews', icon: 'star' },
  { key: 'settings', path: '/settings', label: 'Platform Settings', icon: 'settings' },
  { key: 'audit', path: '/audit', label: 'Audit Log', icon: 'file-text' },
]

const TITLES = {
  '/': 'Dashboard', '/approvals': 'Venue approvals', '/venues': 'Live venues', '/all-venues': 'All venues', '/vendors': 'Vendors',
  '/users': 'Users', '/bookings': 'Bookings', '/payouts': 'Payouts', '/refunds': 'Refunds', '/reviews': 'Reviews moderation',
  '/all-venues': 'All venues', '/deletion-requests': 'Deletion requests',
  '/settings': 'Platform settings', '/audit': 'Audit log',
}

function LoadingSkeleton() {
  return (
    <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[1, 2, 3, 4, 5, 6].map((k) => (
        <div key={k} style={{ display: 'flex', gap: 14, alignItems: 'center', animation: 'bmvShimmer 1.2s ease infinite' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--neutral-100)', flex: '0 0 auto' }} />
          <div style={{ flex: 2, height: 14, borderRadius: 6, background: 'var(--neutral-100)' }} />
          <div style={{ flex: 1, height: 14, borderRadius: 6, background: 'var(--neutral-100)' }} />
          <div style={{ width: 90, height: 24, borderRadius: 999, background: 'var(--neutral-100)' }} />
        </div>
      ))}
    </div>
  )
}

export default function AdminLayout() {
  const { authed, setAuthed, admin, pendingApprovals, approvals, venues, dataStatus, retryLoad } = useAdmin()
  const { isMobile, isNarrow: viewportNarrow } = useViewport()
  const location = useLocation()
  const navigate = useNavigate()

  const [collapsed, setCollapsed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const loadTimer = useRef(null)
  const firstRender = useRef(true)
  const menuRef = useRef(null)

  const basePath = '/' + (location.pathname.split('/')[1] || '')

  // Close the profile menu on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    setMenuOpen(false)
    setNavOpen(false)
    setLoading(true)
    clearTimeout(loadTimer.current)
    loadTimer.current = setTimeout(() => setLoading(false), 420)
    return () => clearTimeout(loadTimer.current)
  }, [basePath])

  // Mobile nav drawer: Escape closes, body scroll locked while open (ref-counted)
  useEffect(() => {
    if (!navOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setNavOpen(false) }
    document.addEventListener('keydown', onKey)
    lockBodyScroll()
    return () => {
      document.removeEventListener('keydown', onKey)
      unlockBodyScroll()
    }
  }, [navOpen])

  if (!authed) return <Navigate to="/login" replace />

  const isNarrow = !isMobile && (collapsed || viewportNarrow)
  const pendingCount = pendingApprovals.length
  const deletionCount = (venues || []).filter((v) => v.status === 'deletion_requested').length

  // Approval detail gets a contextual title. Ids are UUID strings from the
  // real API — match any non-slash segment and compare as strings.
  let pageTitle = TITLES[basePath] || 'Dashboard'
  const approvalIdMatch = location.pathname.match(/^\/approvals\/([^/]+)$/)
  if (approvalIdMatch) {
    const sel = approvals.find((a) => String(a.id) === decodeURIComponent(approvalIdMatch[1]))
    if (sel) pageTitle = 'Review: ' + sel.name
  }

  const signOut = () => {
    setMenuOpen(false)
    setAuthed(false)
    adminApi.logout().catch(() => { /* session already gone locally */ })
    navigate('/login')
  }

  const navList = (compact) => NAV_ITEMS.map((it) => {
    const isActive = it.path === '/' ? location.pathname === '/' : basePath === it.path
    const badgeCount = it.badge === 'deletions' ? deletionCount : it.badge ? pendingCount : 0
    return (
      <button
        key={it.key}
        onClick={() => { setNavOpen(false); navigate(it.path) }}
        title={it.label}
        className={isActive ? undefined : 'sidebar-item'}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, height: 44, padding: '0 12px 0 9px',
          border: 'none', borderLeft: `3px solid ${isActive ? 'var(--brand-accent)' : 'transparent'}`,
          background: isActive ? 'rgba(255,255,255,.1)' : 'transparent',
          color: isActive ? '#fff' : 'var(--neutral-300)',
          fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, cursor: 'pointer',
          width: '100%', textAlign: 'left', borderRadius: '0 10px 10px 0', flex: '0 0 auto',
        }}
      >
        <span style={{ display: 'flex', flex: '0 0 auto' }}>
          <Icon name={it.icon} size={20} />
        </span>
        {!compact && (
          <>
            <span style={{ flex: '1 1 auto', whiteSpace: 'nowrap', overflow: 'hidden' }}>{it.label}</span>
            {badgeCount > 0 && (
              <span style={{ background: 'var(--brand-accent)', color: '#fff', fontSize: 12.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999 }}>{badgeCount}</span>
            )}
          </>
        )}
      </button>
    )
  })

  const navProfile = (compact) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,.1)', marginTop: 6, flex: '0 0 auto' }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--red-500)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, flex: '0 0 auto' }}>{admin.initials}</div>
      {!compact && (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{admin.name}</div>
          <div style={{ fontSize: 15.5, color: 'var(--navy-300)' }}>{admin.role}</div>
        </div>
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface-page)', fontFamily: 'var(--font-body)', color: 'var(--text-body)' }}>
      {/* Sidebar (desktop / tablet) */}
      {!isMobile && (
        <aside style={{ width: isNarrow ? 68 : 250, flex: '0 0 auto', background: 'var(--navy-800)', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '20px 12px 16px', gap: 2, transition: 'width .2s ease' }}>
          <button
            onClick={() => navigate('/')}
            title="BookMyVenues home"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0 20px', minHeight: 48, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {isNarrow ? (
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800, color: '#fff' }}>B<span style={{ color: 'var(--red-500)' }}>M</span>V</div>
            ) : (
              <img src="/assets/logo-sidenav.svg" alt="BookMyVenues" style={{ height: 60, width: 'auto', maxWidth: '100%', objectFit: 'contain' }} />
            )}
          </button>

          {navList(isNarrow)}

          <div style={{ flex: '1 1 auto' }} />

          <button
            onClick={() => setCollapsed((c) => !c)}
            title="Collapse"
            className="sidebar-item"
            style={{ display: 'flex', alignItems: 'center', gap: 12, height: 44, padding: '0 12px', border: 'none', background: 'none', color: 'var(--neutral-300)', fontFamily: 'var(--font-body)', fontSize: 15.5, fontWeight: 600, cursor: 'pointer', borderRadius: 10 }}
          >
            <span style={{ display: 'flex', transform: isNarrow ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease' }}>
              <Icon name="chevrons-left" size={20} />
            </span>
            {!isNarrow && <span>Collapse</span>}
          </button>

          {navProfile(isNarrow)}
        </aside>
      )}

      {/* Mobile slide-in nav */}
      {isMobile && navOpen && (
        <>
          <div onClick={() => setNavOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(6,21,44,.5)', zIndex: 50 }} />
          <aside style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 264, maxWidth: '85vw', background: 'var(--navy-800)', zIndex: 51, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '18px 12px 16px', gap: 2, boxShadow: 'var(--shadow-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 16px' }}>
              <img src="/assets/logo-sidenav.svg" alt="BookMyVenues" style={{ height: 48, width: 'auto', objectFit: 'contain' }} />
              <button onClick={() => setNavOpen(false)} aria-label="Close menu" style={{ width: 38, height: 38, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,.1)', color: '#fff', cursor: 'pointer', fontSize: 17, fontWeight: 800, flex: '0 0 auto' }}>×</button>
            </div>
            {navList(false)}
            <div style={{ flex: '1 1 auto' }} />
            {navProfile(false)}
          </aside>
        </>
      )}

      {/* Main column */}
      <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <header style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16, minHeight: 68, padding: `10px ${isMobile ? 14 : 28}px`, flexWrap: 'wrap', background: 'var(--surface-card)', borderBottom: '1px solid var(--border-subtle)', position: 'relative', zIndex: 20 }}>
          {isMobile && (
            <button
              onClick={() => setNavOpen(true)}
              aria-label="Open menu"
              className="hover-wash"
              style={{ width: 44, height: 44, borderRadius: 12, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}
            >
              <Icon name="menu" size={24} />
            </button>
          )}
          <div style={{ flex: '1 1 auto' }} />
          {!isMobile && (
            <span style={{ fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--success-700)', background: 'var(--success-50)', padding: '5px 11px', borderRadius: 999 }}>Production</span>
          )}

          <button
            onClick={() => navigate('/approvals')}
            aria-label="Notifications"
            className="hover-wash"
            style={{ width: 44, height: 44, borderRadius: 12, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
          >
            <Icon name="bell" size={22} />
            {pendingCount > 0 && (
              <span style={{ position: 'absolute', top: 2, right: 2, background: 'var(--brand-accent)', color: '#fff', fontSize: 10.5, fontWeight: 800, minWidth: 18, height: 18, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surface-card)' }}>{pendingCount}</span>
            )}
          </button>

          <div ref={menuRef} style={{ position: 'relative' }}>
            <button onClick={() => setMenuOpen((o) => !o)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: isMobile ? 6 : '6px 10px 6px 6px', borderRadius: 999, background: '#F4EAE5', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              <span style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--navy-800)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>{admin.initials}</span>
              {!isMobile && <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)' }}>{admin.shortName}</span>}
            </button>
            {menuOpen && (
              <div style={{ position: 'absolute', top: 52, right: 0, width: 230, background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, boxShadow: 'var(--shadow-lg)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, zIndex: 30 }}>
                <div>
                  <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text-heading)' }}>{admin.name}</div>
                  <div style={{ fontSize: 14, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{admin.email}</div>
                </div>
                <span style={{ alignSelf: 'flex-start', fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: '#fff', background: 'var(--navy-800)', padding: '4px 10px', borderRadius: 999 }}>{admin.role}</span>
                <button onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: 'var(--error-600)', background: 'var(--error-50)', border: 'none', borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}>Sign out</button>
              </div>
            )}
          </div>
        </header>

        <main style={{ flex: '1 1 auto', padding: isMobile ? '18px 14px 56px' : '26px 28px 60px', display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? 22 : 27, fontWeight: 800, color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>{pageTitle}</div>
          </div>
          {loading || dataStatus === 'loading' || dataStatus === 'idle'
            ? <LoadingSkeleton />
            : dataStatus === 'error'
              ? <DataErrorCard onRetry={retryLoad} />
              : <Outlet />}
        </main>
      </div>

      <DetailDrawer />
      <ConfirmModal />
      <Toast />
    </div>
  )
}
