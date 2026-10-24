import { useAdmin } from '../../context/AdminContext.jsx'
import Icon from '../ui/Icon.jsx'

export default function Toast() {
  const { toast } = useAdmin()
  if (!toast) return null
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 70, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--navy-800)', color: '#fff', padding: '14px 20px', borderRadius: 14, boxShadow: 'var(--shadow-lg)', fontSize: 15.5, fontWeight: 600, maxWidth: 'min(420px, calc(100vw - 48px))' }}>
      <span style={{ color: 'var(--success-500)', display: 'flex' }}>
        <Icon name="check-circle" size={20} />
      </span>
      {toast}
    </div>
  )
}
