import { useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { useAdmin } from '../../context/AdminContext.jsx'
import { saveBlob } from '../../utils/download.js'
import { exportErrorMessage } from '../../utils/exports.js'
import Button from './Button.jsx'

/**
 * ExportButton — the panel's one "Export Excel" control.
 *
 * `fetchFile` resolves to the .xlsx Blob (built by the backend from the page's
 * own filters); `count` is how many rows the page shows for those filters.
 * While a file is being built the button reads "Exporting…" and ignores
 * further clicks, so a slow export can't be downloaded twice. With nothing to
 * export it says so instead of downloading an empty sheet. Success and
 * failure both surface as the panel's toast.
 */
export default function ExportButton({
  fetchFile, filename, count, noun = 'rows', what, label = 'Export Excel',
  disabled = false, title, style,
}) {
  const { showToast } = useAdmin()
  const [exporting, setExporting] = useState(false)
  const busy = useRef(false)

  const run = () => {
    if (busy.current || disabled) return
    if (count === 0) {
      showToast(`Nothing to export — no ${noun} match the current filters.`)
      return
    }
    busy.current = true
    setExporting(true)
    Promise.resolve()
      .then(fetchFile)
      .then((blob) => {
        saveBlob(blob, filename)
        showToast(count != null
          ? `Exported ${count.toLocaleString('en-IN')} ${noun} to Excel`
          : `Downloaded ${filename}`)
      })
      .catch((err) => showToast(exportErrorMessage(err, what || noun)))
      .finally(() => {
        busy.current = false
        setExporting(false)
      })
  }

  return (
    <span title={title} style={{ display: 'inline-flex' }}>
      <Button
        variant="secondary" size="sm" onClick={run} disabled={disabled || exporting}
        style={{ minHeight: 40, whiteSpace: 'nowrap', ...style }}
      >
        <Download size={17} strokeWidth={2.2} aria-hidden="true" />
        <span aria-live="polite">{exporting ? 'Exporting…' : label}</span>
      </Button>
    </span>
  )
}
