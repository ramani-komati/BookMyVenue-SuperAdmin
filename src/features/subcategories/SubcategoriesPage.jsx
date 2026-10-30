import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../../services/adminApi.js'
import { useAdmin } from '../../context/AdminContext.jsx'
import useViewport from '../../hooks/useViewport.js'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import { categoryDisplay } from '../../constants/categories.js'
import { subcategoryNameError, cleanSubcategoryName } from '../../constants/subcategories.js'
import { invalidateSubcategoryOptions } from '../venue-registration/steps/details/useSubcategoryOptions.js'
import { addedBy, listParams, spellingEditError, statusToast } from './subcategoryList.js'

const inputStyle = {
  fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-heading)', minHeight: 42,
  padding: '0 12px', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 11,
}
const STATUS_BADGE = { pending: 'pending', approved: 'live', rejected: 'rejected' }
const STATUS_LABEL = { pending: 'Pending approval', approved: 'Approved', rejected: 'Rejected' }

const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

/**
 * Sub-categories — the names vendors and admins add with the registration
 * wizards' "Others" option (Sports → "Cricket Nets"). ONE shared list
 * (backend venues/subcategories.py):
 *   - a vendor's new name waits here as PENDING — customers and other
 *     vendors don't see it until it is approved;
 *   - a name added here (or while registering / editing a venue) is
 *     approved at once and offered to every vendor;
 *   - a rejected name can't be submitted again by a vendor;
 *   - Edit only corrects a name's spelling — venues are matched to it by
 *     that spelling's key, so a different name is added instead.
 * Every change is audited server-side.
 */
export default function SubcategoriesPage() {
  const { openModal, showToast } = useAdmin()
  const { isMobile } = useViewport()
  const [status, setStatus] = useState('pending')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [rows, setRows] = useState([])
  const [categories, setCategories] = useState([])
  const [counts, setCounts] = useState({})
  const [state, setState] = useState('loading')
  const [form, setForm] = useState({ category: '', name: '' })
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  // The row being re-spelt: { id, name, error, saving }.
  const [editing, setEditing] = useState(null)

  const load = useCallback(async () => {
    setState('loading')
    try {
      const res = await adminApi.listSubcategories(listParams({ status, category: categoryFilter }))
      setRows(res.subCategories || [])
      setCategories(res.categories || [])
      setCounts(res.counts || {})
      setState('ready')
    } catch (err) {
      setState(err.status === 404 ? 'unavailable' : 'error')
    }
  }, [status, categoryFilter])
  useEffect(() => { load() }, [load])

  const changed = (message) => {
    invalidateSubcategoryOptions()
    showToast(message)
    load()
  }

  const setRowStatus = async (row, next, reason) => {
    try {
      await adminApi.updateSubcategory(row.id, { status: next, reason })
      changed(statusToast(row.name, next))
    } catch (err) {
      showToast(err.message)
    }
  }

  const saveSpelling = async (row) => {
    const problem = spellingEditError(row, editing.name)
    if (problem) { setEditing((e) => ({ ...e, error: problem })); return }
    setEditing((e) => ({ ...e, error: '', saving: true }))
    try {
      const res = await adminApi.updateSubcategory(row.id, { name: cleanSubcategoryName(editing.name) })
      setEditing(null)
      changed(`Renamed to “${res.subCategory.name}”`)
    } catch (err) {
      setEditing((e) => e && ({ ...e, error: err.message, saving: false }))
    }
  }
  const reject = (row) => openModal({
    title: `Reject “${row.name}”?`,
    body: 'Customers and other vendors won’t see it, and vendors can’t submit it again. Venues already using it keep the venue, but this name is hidden from customers.',
    confirmLabel: 'Reject', danger: true, needsReason: true,
    onConfirm: (reason) => setRowStatus(row, 'rejected', reason),
  })

  const add = async (e) => {
    e.preventDefault()
    if (!form.category) { setFormError('Choose a category.'); return }
    const problem = subcategoryNameError(form.name)
    if (problem) { setFormError(problem); return }
    setSaving(true)
    setFormError('')
    try {
      const res = await adminApi.addSubcategory({ category: form.category, name: cleanSubcategoryName(form.name) })
      setForm((f) => ({ ...f, name: '' }))
      changed(`“${res.subCategory.name}” added and approved`)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (state === 'unavailable') {
    return (
      <div className="card" style={{ padding: 22, color: 'var(--text-muted)' }}>
        Custom sub-categories need the latest backend. Deploy it, then reload this page.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <form onSubmit={add} className="card" style={{ padding: isMobile ? 16 : 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-heading)' }}>Add a sub-category</div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          Approved straight away and offered to every vendor registering under that category.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <select className="bmva" style={{ ...inputStyle, flex: '0 1 240px' }} value={form.category} aria-label="Category"
            onChange={(e) => { setForm((f) => ({ ...f, category: e.target.value })); setFormError('') }}>
            <option value="">Choose a category</option>
            {categories.map((c) => <option key={c} value={c}>{categoryDisplay(c)}</option>)}
          </select>
          <input className="bmva" style={{ ...inputStyle, flex: '1 1 220px' }} maxLength={40} placeholder="Enter subcategory name"
            aria-label="Subcategory name" value={form.name}
            onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setFormError('') }} />
          <Button disabled={saving}>{saving ? 'Adding…' : 'Add'}</Button>
        </div>
        {formError && <div role="alert" style={{ color: 'var(--error-600)', fontWeight: 600, fontSize: 14 }}>{formError}</div>}
      </form>

      <div className="card" style={{ padding: isMobile ? 16 : 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-heading)', flex: 1 }}>Custom sub-categories</div>
          <select className="bmva" style={{ ...inputStyle, ...(isMobile && { flex: '1 1 100%' }) }} value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Filter by category">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{categoryDisplay(c)}</option>)}
          </select>
          <select className="bmva" style={{ ...inputStyle, ...(isMobile && { flex: '1 1 100%' }) }} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="pending">Pending ({counts.pending ?? 0})</option>
            <option value="approved">Approved ({counts.approved ?? 0})</option>
            <option value="rejected">Rejected ({counts.rejected ?? 0})</option>
            <option value="all">All</option>
          </select>
        </div>

        {state === 'loading' && <div style={{ fontSize: 14.5, color: 'var(--text-muted)' }}>Loading…</div>}
        {state === 'error' && <div role="alert" style={{ color: 'var(--error-600)', fontWeight: 600 }}>Could not load sub-categories. <button type="button" onClick={load} style={{ background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer', fontWeight: 700 }}>Retry</button></div>}
        {state === 'ready' && rows.length === 0 && (
          <div style={{ fontSize: 14.5, color: 'var(--text-muted)' }}>
            {status === 'pending' && !categoryFilter ? 'Nothing waiting for approval.' : 'No sub-categories match these filters.'}
          </div>
        )}

        {state === 'ready' && rows.map((r) => {
          const isEditing = editing?.id === r.id
          return (
          <div key={r.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 14, display: 'flex', gap: 12, alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row' }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {isEditing ? (
                  <input className="bmva" style={{ ...inputStyle, flex: '1 1 200px', minWidth: 0 }} maxLength={40} autoFocus
                    aria-label={`New spelling for ${r.name}`} value={editing.name} disabled={editing.saving}
                    onChange={(e) => setEditing((x) => ({ ...x, name: e.target.value, error: '' }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); saveSpelling(r) }
                      if (e.key === 'Escape') setEditing(null)
                    }} />
                ) : (
                  <span style={{ fontWeight: 800, color: 'var(--text-heading)', overflowWrap: 'anywhere' }}>{r.name}</span>
                )}
                <Badge status="neutral">{categoryDisplay(r.category)}</Badge>
                <Badge status={STATUS_BADGE[r.status] || 'neutral'}>{STATUS_LABEL[r.status] || r.status}</Badge>
              </div>
              {isEditing ? (
                <div role={editing.error ? 'alert' : undefined} style={{ fontSize: 13.5, color: editing.error ? 'var(--error-600)' : 'var(--text-muted)', fontWeight: editing.error ? 600 : 400 }}>
                  {editing.error || 'Fix the spelling, capitals or punctuation. Venues already using this name show the new spelling.'}
                </div>
              ) : (
                <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
                  {[
                    addedBy(r),
                    fmt(r.createdAt),
                    r.reviewedBy && r.status !== 'pending' && `${r.status === 'approved' ? 'approved' : 'reviewed'} by ${r.reviewedBy} ${fmt(r.reviewedAt)}`,
                  ].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flex: '0 0 auto', flexWrap: 'wrap' }}>
              {isEditing ? (
                <>
                  <Button size="sm" disabled={editing.saving} onClick={() => saveSpelling(r)}>{editing.saving ? 'Saving…' : 'Save'}</Button>
                  <Button variant="secondary" size="sm" disabled={editing.saving} onClick={() => setEditing(null)}>Cancel</Button>
                </>
              ) : (
                <>
                  {r.status !== 'approved' && <Button size="sm" onClick={() => setRowStatus(r, 'approved')}>Approve</Button>}
                  {r.status !== 'rejected' && <Button variant="danger" size="sm" onClick={() => reject(r)}>Reject</Button>}
                  <Button variant="secondary" size="sm" onClick={() => setEditing({ id: r.id, name: r.name, error: '', saving: false })}>Edit</Button>
                </>
              )}
            </div>
          </div>
          )
        })}
      </div>
    </div>
  )
}
