import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { adminApi } from '../services/adminApi.js'

// Empty settings shape shown until the real settings arrive with bootstrap.
const BLANK_SETTINGS = { fee: '', feeDate: '', commission: '', categories: [], cities: [], amenities: [], banners: [] }

const AdminContext = createContext(null)

const AUTH_KEY = 'bmv-admin-authed'
const EMAIL_KEY = 'bmv-admin-email'

export function AdminProvider({ children }) {
  // Survives page refreshes for the tab's lifetime; cleared on sign-out
  const [authed, setAuthedState] = useState(() => {
    try { return sessionStorage.getItem(AUTH_KEY) === '1' } catch { return false }
  })
  const [adminEmail, setAdminEmail] = useState(() => {
    try { return sessionStorage.getItem(EMAIL_KEY) || '' } catch { return '' }
  })
  // Sign-in passes the verified email so the header/profile/audit show the
  // REAL admin (there's no /me endpoint in the admin API — the email is the
  // identity we have). Sign-out / session expiry clears it.
  const setAuthed = useCallback((value, email) => {
    setAuthedState(value)
    if (value && email) setAdminEmail(email)
    if (!value) setAdminEmail('')
    try {
      if (value) {
        sessionStorage.setItem(AUTH_KEY, '1')
        if (email) sessionStorage.setItem(EMAIL_KEY, email)
      } else {
        sessionStorage.removeItem(AUTH_KEY)
        sessionStorage.removeItem(EMAIL_KEY)
      }
    } catch { /* storage unavailable (private mode) — auth stays in memory */ }
  }, [])

  // Display identity derived from the signed-in email ("ramani.komati@x.in"
  // → "Ramani Komati" / "RK"). Falls back to "Admin" pre-hydration.
  const admin = useMemo(() => {
    const words = (adminEmail.split('@')[0] || '')
      .split(/[._-]+/)
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1))
    const name = words.join(' ') || 'Admin'
    return {
      name,
      shortName: words[0] || 'Admin',
      initials: (words.map((w) => w[0]).join('').slice(0, 2) || 'AD').toUpperCase(),
      email: adminEmail,
      role: 'Super Admin',
      auditName: name,
    }
  }, [adminEmail])

  const [approvals, setApprovals] = useState([])
  const [venues, setVenues] = useState([])
  const [vendors, setVendors] = useState([])
  const [users, setUsers] = useState([])
  const [bookings, setBookings] = useState([])
  const [payoutsList, setPayoutsList] = useState([])
  const [reviews, setReviews] = useState([])
  const [audit, setAudit] = useState([])
  const [settings, setSettings] = useState(BLANK_SETTINGS)
  const [settingsDirty, setSettingsDirty] = useState(false)

  // Cross-cutting UI: toast, confirm modal, side drawer
  const [toast, setToast] = useState(null)
  const [modal, setModal] = useState(null)
  const [drawer, setDrawer] = useState(null)
  const toastTimer = useRef(null)

  const showToast = useCallback((msg) => {
    clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 2800)
  }, [])

  // Optimistic updates apply locally first; API failures surface as a toast.
  const sync = useCallback((promise) => {
    promise.catch((err) => {
      console.error('API sync failed:', err)
      showToast('Could not sync with the server — change saved locally')
    })
  }, [showToast])

  // ---------- data loading (idle → loading → ready | error) ----------
  const [dataStatus, setDataStatus] = useState('idle')
  const [dataError, setDataError] = useState(null)
  const savedSettingsRef = useRef(BLANK_SETTINGS)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const loadAll = useCallback(async () => {
    setDataStatus('loading')
    setDataError(null)
    try {
      const d = await adminApi.fetchAll()
      setApprovals(d.approvals)
      setVenues(d.venues)
      setVendors(d.vendors)
      setUsers(d.users)
      setBookings(d.bookings)
      setPayoutsList(d.payouts)
      setReviews(d.reviews)
      setAudit(d.audit)
      setSettings(d.settings)
      savedSettingsRef.current = d.settings
      setSettingsDirty(false)
      setDataStatus('ready')
    } catch (err) {
      // No/expired admin session (e.g. an auth flag left over from mock mode,
      // or the server session lapsed) — go back to the sign-in screen instead
      // of dead-ending on the error card. 'idle' makes the next successful
      // sign-in auto-load the data again.
      if (err.status === 401 || err.status === 403) {
        setAuthed(false)
        setDataStatus('idle')
        return
      }
      console.error('Data load failed:', err)
      setDataError(err.message || 'Request failed')
      setDataStatus('error')
    }
  }, [setAuthed])

  useEffect(() => {
    if (authed && dataStatus === 'idle') loadAll()
  }, [authed, dataStatus, loadAll])

  const logAudit = useCallback((action, target, change) => {
    const entry = { time: 'Just now', admin: admin.auditName, action, target, change }
    setAudit((prev) => [entry, ...prev])
    sync(adminApi.appendAudit(entry))
  }, [sync, admin])

  const openModal = useCallback((cfg) => {
    setModal({
      reason: '',
      amount: cfg.amount || '',
      // Frozen at open time so the field can't vanish while the user edits it
      hasAmountField: cfg.amount !== undefined && cfg.amount !== '',
      ...cfg,
    })
  }, [])
  const closeModal = useCallback(() => setModal(null), [])

  const openDrawer = useCallback((type, id) => setDrawer({ type, id }), [])
  const closeDrawer = useCallback(() => setDrawer(null), [])

  const updateApproval = useCallback((id, patch) => {
    setApprovals((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
    sync(adminApi.updateApproval(id, patch))
  }, [sync])
  const updateVenue = useCallback((id, patch) => {
    setVenues((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)))
    sync(adminApi.updateVenue(id, patch))
  }, [sync])
  const updateVendor = useCallback((id, patch) => {
    setVendors((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)))
    sync(adminApi.updateVendor(id, patch))
  }, [sync])
  const updateUser = useCallback((id, patch) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)))
    sync(adminApi.updateUser(id, patch))
  }, [sync])
  const updateBooking = useCallback((id, patch) => {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)))
    sync(adminApi.updateBooking(id, patch))
  }, [sync])
  const updatePayout = useCallback((id, patch) => {
    setPayoutsList((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    sync(adminApi.updatePayout(id, patch))
  }, [sync])
  const removeReview = useCallback((id, resolution = {}) => {
    setReviews((prev) => prev.filter((r) => r.id !== id))
    sync(adminApi.resolveReview(id, resolution))
  }, [sync])

  const markSettings = useCallback((patch) => {
    setSettings((prev) => ({ ...prev, ...patch }))
    setSettingsDirty(true)
  }, [])

  // Snapshot of the last-saved settings so Discard can genuinely revert
  const commitSettings = useCallback(() => {
    savedSettingsRef.current = settingsRef.current
    setSettingsDirty(false)
    sync(adminApi.saveSettings(settingsRef.current))
  }, [sync])
  const discardSettings = useCallback(() => {
    setSettings(savedSettingsRef.current)
    setSettingsDirty(false)
  }, [])

  const pendingApprovals = approvals.filter((a) => a.status === 'pending')

  const value = {
    authed, setAuthed, admin,
    dataStatus, dataError, retryLoad: loadAll,
    approvals, updateApproval, pendingApprovals,
    venues, setVenues, updateVenue,
    vendors, updateVendor,
    users, updateUser,
    bookings, updateBooking,
    payoutsList, updatePayout,
    reviews, removeReview,
    audit, logAudit,
    settings, markSettings, settingsDirty, setSettingsDirty, commitSettings, discardSettings,
    toast, showToast,
    modal, openModal, closeModal, setModal,
    drawer, openDrawer, closeDrawer,
  }

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdmin() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used inside AdminProvider')
  return ctx
}
