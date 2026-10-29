import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { adminApi } from '../services/adminApi.js'
import { auditNow } from '../utils/format.js'

// Empty settings shape shown until the real settings arrive with bootstrap.
const BLANK_SETTINGS = { fee: '', feeDate: '', commission: '', categories: [], cities: [], amenities: [], banners: [] }

const AdminContext = createContext(null)

const AUTH_KEY = 'bmv-admin-authed' // stores the session expiry epoch (ms)
const EMAIL_KEY = 'bmv-admin-email'
// Keep the admin signed in for 30 days after a successful login (matches the
// backend session cookie / JWT lifetime — the server must expire on the same
// horizon; a 401 before then still clears this and returns to sign-in).
const AUTH_TTL_MS = 30 * 24 * 60 * 60 * 1000

// Is a stored 30-day session still valid (not past its expiry)?
const sessionValid = () => {
  try { return Number(localStorage.getItem(AUTH_KEY)) > Date.now() } catch { return false }
}

export function AdminProvider({ children }) {
  // Persists across refreshes AND browser restarts for 30 days; cleared on
  // sign-out or session expiry (401).
  const [authed, setAuthedState] = useState(sessionValid)
  const [adminEmail, setAdminEmail] = useState(() => {
    try { return (sessionValid() && localStorage.getItem(EMAIL_KEY)) || '' } catch { return '' }
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
        localStorage.setItem(AUTH_KEY, String(Date.now() + AUTH_TTL_MS))
        if (email) localStorage.setItem(EMAIL_KEY, email)
      } else {
        localStorage.removeItem(AUTH_KEY)
        localStorage.removeItem(EMAIL_KEY)
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
  // Ticketed events. CREATED AND OWNED here — the admin is the only role
  // that can list, edit, publish or retire one.
  const [events, setEvents] = useState([])
  // Event ticket orders across ALL events, for the main Bookings page. Kept
  // apart from `bookings` (venue only) because the dashboard, drawers and
  // payouts sum `bookings` as venue revenue.
  const [eventOrders, setEventOrders] = useState([])
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
      // Tolerate a backend that predates events — an older deploy simply
      // omits the key, and the Events page then shows its empty state
      // instead of the whole panel failing to load.
      setEvents(Array.isArray(d.events) ? d.events : [])
      // Same tolerance for a backend that predates the unified Bookings list.
      setEventOrders(Array.isArray(d.eventOrders) ? d.eventOrders : [])
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
    const entry = { time: auditNow(), admin: admin.auditName, action, target, change }
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
  // ---------- events: server-first, NOT optimistic ----------
  // Every other entity here is patched locally and synced in the background,
  // which is fine for a status flip. Events are different: create mints a
  // row only the server can build (id, slug, ticket-type rows), and a write
  // can be REFUSED for reasons only the server knows — a date that already
  // has tickets sold cannot shrink, an incomplete event cannot be published.
  // Painting those changes locally first would show the admin an event that
  // does not exist. So these await the response and return its error, and
  // the page surfaces it instead of a "saved locally" toast that lies.
  const applyEventRow = useCallback((row) => {
    if (!row?.id) return
    setEvents((prev) => {
      const exists = prev.some((e) => e.id === row.id)
      return exists ? prev.map((e) => (e.id === row.id ? row : e)) : [row, ...prev]
    })
  }, [])

  const createEvent = useCallback(async (payload) => {
    const res = await adminApi.createEvent(payload)
    applyEventRow(res?.event)
    return res?.event
  }, [applyEventRow])

  const updateEvent = useCallback(async (id, patch) => {
    const res = await adminApi.updateEvent(id, patch)
    applyEventRow(res?.event)
    return res?.event
  }, [applyEventRow])

  const deleteEvent = useCallback(async (id) => {
    try {
      await adminApi.deleteEvent(id)
      setEvents((prev) => prev.filter((e) => e.id !== id))
      return { deleted: true }
    } catch (err) {
      // Refused because tickets are sold: the server unpublished it instead
      // and hands back the updated row. Reflect THAT, not the delete.
      if (err.code === 'HAS_SALES' && err.detail?.event) applyEventRow(err.detail.event)
      throw err
    }
  }, [applyEventRow])

  // Server-first like the other event writes: the backend decides whether
  // the order may go (unpaid only — paid/refunded/mid-checkout are refused
  // with 409), so the row leaves the list only once the server agrees. The
  // backend writes its own audit entry; none is added here.
  const removeEventOrder = useCallback(async (order, reason) => {
    await adminApi.removeEventOrder(order.eventId, order.id, reason)
    setEventOrders((prev) => prev.filter((o) => o.id !== order.id))
  }, [])

  // Delete one row from the main Bookings page — venue booking or event
  // order. Server-first: the row leaves the list (and the count) only once
  // the backend has accepted the delete; a refusal or network error throws
  // and nothing changes locally. The backend writes the audit entry.
  const deleteBooking = useCallback(async (row, reason) => {
    if (row.kind === 'event') {
      await adminApi.deleteEventOrder(row.id, reason)
      setEventOrders((prev) => prev.filter((o) => o.id !== row.id))
    } else {
      await adminApi.deleteBooking(row.id, reason)
      setBookings((prev) => prev.filter((b) => b.id !== row.id))
    }
  }, [])

  const refreshEvents = useCallback(async () => {
    const res = await adminApi.listEvents()
    if (Array.isArray(res?.events)) setEvents(res.events)
  }, [])
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
    // Banners are NOT sent: the Homepage page saves them one at a time, and
    // resending this page's (possibly stale) copy would overwrite another
    // admin's banner edits.
    const { banners: _banners, ...rest } = settingsRef.current
    sync(adminApi.saveSettings(rest))
  }, [sync])
  const discardSettings = useCallback(() => {
    setSettings(savedSettingsRef.current)
    setSettingsDirty(false)
  }, [])

  const pendingApprovals = approvals.filter((a) => a.status === 'pending')
  const pendingEvents = events.filter((e) => e.status === 'pending')

  const value = {
    authed, setAuthed, admin,
    dataStatus, dataError, retryLoad: loadAll,
    approvals, updateApproval, pendingApprovals,
    venues, setVenues, updateVenue,
    vendors, updateVendor,
    users, updateUser,
    bookings, updateBooking,
    eventOrders, removeEventOrder, deleteBooking,
    events, createEvent, updateEvent, deleteEvent, refreshEvents, pendingEvents,
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
