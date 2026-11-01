import { useState } from 'react'
import { catalogApi } from '../../services/catalogApi.js'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'
import {
  PIN_STATUS, coordinateLink, distanceKm, effectivePin, inIndia, linkPin, parsePastedPin, pinChanged,
  pinConflict, pinKey, typedPin, SAME_PLACE_KM,
} from './venueEdit.js'

const six = (n) => String(Math.round(Number(n) * 1e6) / 1e6)
const pointText = (p) => `${six(p.lat)}, ${six(p.lng)}`
const embed = (p) => `https://www.google.com/maps?q=${encodeURIComponent(`${p.lat},${p.lng}`)}&output=embed`

const SOURCE = {
  link: 'from the Google Maps link',
  resolved: 'from the Google Maps short link',
  pin: 'from the confirmed map location',
}

const card = { padding: '14px 16px', border: '1px solid var(--border-subtle)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10 }
const note = (tone) => ({
  display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, fontSize: 14, lineHeight: 1.5,
  background: tone === 'error' ? 'var(--error-50)' : tone === 'warning' ? 'var(--warning-50)' : 'var(--surface-sunken, #f4f5f7)',
  color: tone === 'error' ? 'var(--error-700)' : 'var(--text-heading)',
})
const input = {
  flex: '1 1 240px', minWidth: 0, minHeight: 40, padding: '0 12px', fontSize: 14.5, fontFamily: 'var(--font-body)',
  border: '1px solid var(--border-default)', borderRadius: 10, background: 'var(--surface-card)', color: 'var(--text-heading)',
}

function MapFrame({ point, title }) {
  return (
    <iframe
      title={title}
      src={embed(point)}
      style={{ width: '100%', height: 240, border: '1px solid var(--border-subtle)', borderRadius: 10, display: 'block' }}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  )
}

/**
 * The super admin's location check on All venues → Edit → Location. Shows
 * where the venue is on the map NOW (the pin customers' distances use),
 * lets the admin search for the right place or paste exact coordinates,
 * previews any candidate on the map before it is used, and — when the save
 * would add, move or remove the pin — asks for an explicit confirmation
 * (the server refuses an unconfirmed move: LOCATION_UNCONFIRMED).
 *
 * Nothing here ever invents a coordinate: a point comes only from a search
 * result the admin picked, coordinates they pasted, or the maps link.
 */
export default function AdminLocationPanel({ saved, venueName, location, onPatch, confirmedKey, onConfirm }) {
  const [query, setQuery] = useState(() => saved?.placeText
    || [venueName, location.area, location.city, location.stateName].filter(Boolean).join(', '))
  const [results, setResults] = useState([])
  const [search, setSearch] = useState({ state: 'idle', message: '' })   // idle | busy | done | error
  const [pasted, setPasted] = useState('')
  const [candidate, setCandidate] = useState(null)                        // { lat, lng, label }
  const [candidateError, setCandidateError] = useState('')

  const status = PIN_STATUS[saved?.pinStatus] || PIN_STATUS.missing
  const savedPoint = saved?.coordinates || null
  const current = effectivePin(location)
  const changed = pinChanged(savedPoint, location)
  const conflict = pinConflict(location)
  const fromLink = linkPin(location.mapsLink)
  const key = pinKey(location)
  const confirmed = confirmedKey === key

  const runSearch = async () => {
    const q = query.trim()
    if (q.length < 3) {
      setSearch({ state: 'error', message: 'Type the venue name and area to search.' })
      return
    }
    setSearch({ state: 'busy', message: 'Searching…' })
    setResults([])
    try {
      const rows = await catalogApi.searchPlaces(q.slice(0, 100), { state: location.stateName, district: location.district })
      const found = rows.filter((r) => r.lat != null && r.lng != null).slice(0, 6)
      setResults(found)
      setSearch(found.length
        ? { state: 'done', message: '' }
        : { state: 'error', message: 'No places found. Try the venue’s name with its locality, or paste exact coordinates below.' })
    } catch (err) {
      setSearch({
        state: 'error',
        message: err?.status === 503
          ? 'Map search isn’t switched on for this server (no geocoding provider). Paste exact coordinates below instead.'
          : 'Map search failed right now. Try again, or paste exact coordinates below.',
      })
    }
  }

  const preview = (point, label) => {
    setCandidateError('')
    if (!inIndia(point)) {
      setCandidate(null)
      setCandidateError('That point is outside India — check that the latitude and longitude aren’t swapped.')
      return
    }
    setCandidate({ ...point, label })
  }

  const previewPasted = () => {
    const point = parsePastedPin(pasted)
    if (!point) {
      setCandidate(null)
      setCandidateError('Paste coordinates like “17.9689, 79.5941” or a Google Maps link that has a pin (a maps.app.goo.gl short link doesn’t).')
      return
    }
    preview(point, 'Pasted coordinates')
  }

  const useCandidate = () => {
    const p = candidate
    // A link whose own pin is somewhere else would override this point — the
    // conflict notice below offers to replace it; it is never done silently.
    onPatch((prev) => ({ ...prev, latitude: six(p.lat), longitude: six(p.lng) }))
    setCandidate(null)
    setResults([])
  }

  const replaceLink = () => {
    const p = typedPin(location)
    if (p) onPatch((prev) => ({ ...prev, mapsLink: coordinateLink(p) }))
  }
  const clearTyped = () => onPatch((prev) => ({ ...prev, latitude: '', longitude: '' }))

  return (
    <div className="card" style={{ ...card, borderColor: saved?.pinStatus === 'ok' ? 'var(--border-subtle)' : 'var(--warning-500, #f59e0b)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Icon name="map-pin" size={18} />
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-heading)', flex: 1 }}>Map location check</div>
        <Badge status={status.tone} size="sm">{status.label}</Badge>
      </div>

      <div style={note(saved?.pinStatus === 'ok' ? '' : saved?.pinStatus === 'outside_india' ? 'error' : 'warning')}>
        <span>
          {saved?.pinStatus === 'ok' && savedPoint && <>Saved pin <b>{pointText(savedPoint)}</b> {SOURCE[saved.pinSource] || ''}. Customers’ distances and the “Nearby” radius use this point.</>}
          {saved?.pinStatus === 'outside_india' && savedPoint && <>The saved pin <b>{pointText(savedPoint)}</b> is outside India — almost certainly wrong. Set the correct location below.</>}
          {(!saved || saved.pinStatus === 'missing') && <>This venue has <b>no map location</b>. Customers see it under “Distance unknown” and it never appears in “Nearby” results. Find and confirm the right place below.</>}
        </span>
      </div>
      {savedPoint && <MapFrame point={savedPoint} title="Saved venue location" />}

      <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-heading)' }}>1 · Search for the venue</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          className="bmva" type="search" value={query} style={input} aria-label="Search for the venue on the map"
          placeholder="Venue name, locality, city"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runSearch() } }}
        />
        <Button variant="secondary" size="sm" onClick={runSearch} disabled={search.state === 'busy'}>
          <Icon name="search" size={15} /> {search.state === 'busy' ? 'Searching…' : 'Search'}
        </Button>
      </div>
      {search.message && search.state !== 'busy' && <div role="alert" style={note('warning')}>{search.message}</div>}
      {results.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {results.map((r, i) => (
            <li key={`${r.lat},${r.lng},${i}`} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px', border: '1px solid var(--border-subtle)', borderRadius: 10, flexWrap: 'wrap' }}>
              <span style={{ flex: '1 1 220px', minWidth: 0, fontSize: 14 }}>
                <b style={{ color: 'var(--text-heading)' }}>{r.label || r.formattedAddress}</b>
                <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: 13 }}>
                  {r.formattedAddress && r.formattedAddress !== r.label ? `${r.formattedAddress} · ` : ''}{pointText(r)}
                </span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => preview({ lat: Number(r.lat), lng: Number(r.lng) }, r.label || r.formattedAddress)}>Preview</Button>
            </li>
          ))}
        </ul>
      )}

      <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-heading)' }}>…or paste exact coordinates</div>
      <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
        In Google Maps, right-click the venue’s exact spot and click the coordinates at the top of the menu to copy them.
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          className="bmva" value={pasted} style={input} aria-label="Paste coordinates or a Google Maps link"
          placeholder="17.9689, 79.5941  or a full Google Maps link"
          onChange={(e) => setPasted(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); previewPasted() } }}
        />
        <Button variant="secondary" size="sm" onClick={previewPasted}>Preview</Button>
      </div>
      {candidateError && <div role="alert" style={note('error')}>{candidateError}</div>}

      {candidate && (
        <div style={{ ...card, background: 'var(--surface-sunken, #f7f8fa)' }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-heading)' }}>
            2 · Preview: {candidate.label} ({pointText(candidate)})
            {savedPoint && <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}> — {distanceKm(savedPoint, candidate).toFixed(2)} km from the saved pin</span>}
          </div>
          <MapFrame point={candidate} title="Candidate venue location" />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button size="sm" onClick={useCandidate}>Use this location</Button>
            <Button variant="ghost" size="sm" onClick={() => setCandidate(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {conflict && (
        <div role="alert" style={{ ...note('error'), flexDirection: 'column' }}>
          <span>
            The Google Maps link pins <b>{pointText(fromLink)}</b>, but the coordinates are <b>{pointText(typedPin(location))}</b>
            {' '}({distanceKm(fromLink, typedPin(location)).toFixed(2)} km apart). The link’s pin is what customers would see.
          </span>
          <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button size="sm" onClick={replaceLink}>Replace the link with the coordinates’ map link</Button>
            <Button variant="ghost" size="sm" onClick={clearTyped}>Keep the link, clear the coordinates</Button>
          </span>
        </div>
      )}

      {changed && !conflict && (
        <div style={{ ...card, borderColor: confirmed ? 'var(--success-600, #16a34a)' : 'var(--warning-500, #f59e0b)' }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-heading)' }}>
            3 · Confirm the new location
          </div>
          {current ? (
            <>
              <div style={{ fontSize: 14 }}>
                After saving, customers will find this venue at <b>{pointText(current)}</b>
                {fromLink && distanceKm(fromLink, current) <= SAME_PLACE_KM ? ' (the Google Maps link’s pin)' : ''}
                {savedPoint ? ` — ${distanceKm(savedPoint, current).toFixed(2)} km from the saved pin.` : '.'}
              </div>
              <MapFrame point={current} title="New venue location" />
            </>
          ) : (
            <div style={{ fontSize: 14 }}>
              Saving <b>removes</b> the map location: the venue will show under “Distance unknown” and drop out of “Nearby” results.
            </div>
          )}
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14.5, fontWeight: 700, color: 'var(--text-heading)', cursor: 'pointer' }}>
            <input
              type="checkbox" checked={confirmed} style={{ width: 18, height: 18, marginTop: 2, accentColor: '#F1252E' }}
              onChange={(e) => onConfirm(e.target.checked ? key : null)}
            />
            {current
              ? 'I checked the map — this is the venue’s correct location.'
              : 'Yes, remove this venue’s map location.'}
          </label>
        </div>
      )}
    </div>
  )
}
