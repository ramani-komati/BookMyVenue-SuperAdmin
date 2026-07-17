import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext.jsx'
import { adminApi } from '../../services/adminApi.js'
import Button from '../../components/ui/Button.jsx'
import Toast from '../../components/overlays/Toast.jsx'

const inputStyle = {
  fontFamily: 'var(--font-body)', fontSize: 17, color: 'var(--text-heading)', minHeight: 52,
  padding: '0 18px', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 12,
}

export default function LoginPage() {
  const { authed, setAuthed, showToast } = useAdmin()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [err, setErr] = useState('')
  const [pending, setPending] = useState(false)

  if (authed) return <Navigate to="/" replace />

  const submitLogin = async () => {
    if (pending) return
    const cleaned = email.trim()
    if (!/^\S+@\S+\.\S+$/.test(cleaned)) return setErr('Enter a valid work email.')
    if (password.length < 4) return setErr('Enter your password.')
    setEmail(cleaned)
    setErr('')
    setPending(true)
    try {
      await adminApi.login({ email: cleaned, password })
      setStep(2)
    } catch (e) {
      setErr(e.message || 'Could not sign in — try again in a moment.')
    } finally {
      setPending(false)
    }
  }

  const submitOtp = async () => {
    if (pending) return
    if (otp.length < 6) return setErr('Enter the 6-digit code.')
    setErr('')
    setPending(true)
    try {
      await adminApi.verifyOtp({ email, otp })
      setAuthed(true)
      showToast('Welcome back, Anita 👋')
      navigate('/')
    } catch (e) {
      setErr(e.message || 'Could not verify the code — try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy-800)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, fontFamily: 'var(--font-body)', padding: 24 }}>
      <img src="/assets/logo-sidenav.svg" alt="BookMyVenues" style={{ height: 100, width: 'auto' }} />

      <div style={{ background: 'var(--surface-card)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', padding: 48, width: 520, maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>Admin sign in</div>
          <div style={{ fontSize: 15.5, color: 'var(--text-muted)', marginTop: 6 }}>For BookMyVenues staff only. Vendors and customers sign in on the app.</div>
        </div>

        {step === 1 && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading)' }}>Work email</label>
              <input
                className="bmva" type="email" placeholder="you@bookmyvenues.in" value={email}
                onChange={(e) => { setEmail(e.target.value); setErr('') }}
                onKeyDown={(e) => e.key === 'Enter' && submitLogin()}
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading)' }}>Password</label>
              <input
                className="bmva" type="password" placeholder="••••••••" value={password}
                onChange={(e) => { setPassword(e.target.value); setErr('') }}
                onKeyDown={(e) => e.key === 'Enter' && submitLogin()}
                style={inputStyle}
              />
            </div>
            {err && (
              <div style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--error-600)', background: 'var(--error-50)', padding: '10px 14px', borderRadius: 10 }}>{err}</div>
            )}
            <Button variant="primary" block onClick={submitLogin} disabled={pending}>{pending ? 'Checking…' : 'Continue'}</Button>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ fontSize: 15.5, color: 'var(--text-body)' }}>
              We sent a 6-digit code to <strong style={{ color: 'var(--text-heading)' }}>{email}</strong>. Enter it to finish signing in.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading)' }}>One-time code</label>
              <input
                className="bmva" type="text" inputMode="numeric" maxLength={6} placeholder="••••••" value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr('') }}
                onKeyDown={(e) => e.key === 'Enter' && submitOtp()}
                style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, letterSpacing: 12, textAlign: 'center', color: 'var(--text-heading)', minHeight: 62, padding: '0 16px', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 12 }}
              />
              <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Demo code: <strong>246810</strong></div>
            </div>
            {err && (
              <div style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--error-600)', background: 'var(--error-50)', padding: '10px 14px', borderRadius: 10 }}>{err}</div>
            )}
            <Button variant="primary" block onClick={submitOtp} disabled={pending}>{pending ? 'Verifying…' : 'Verify & sign in'}</Button>
            <button
              onClick={() => { setStep(1); setOtp(''); setErr('') }}
              style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, fontWeight: 700, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              Back
            </button>
          </>
        )}
      </div>

      <div style={{ fontSize: 15, color: 'var(--navy-300)' }}>Protected area · admin actions are recorded in the audit log</div>
      <Toast />
    </div>
  )
}
