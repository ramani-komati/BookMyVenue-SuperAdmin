import { useNavigate } from 'react-router-dom';
import { Button, Icon } from '@/reg-ui';
import { useVenueDraftContext } from '../context/VenueDraftContext';

/**
 * SubmittedState — success screen. In the admin flow the venue goes LIVE
 * immediately (no approval queue), so the copy reflects that.
 */
export default function SubmittedState() {
  const { draft, clear } = useVenueDraftContext();
  const navigate = useNavigate();
  const name = draft.basics.venueName || 'your venue';

  return (
    <div
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        padding: '56px 40px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'var(--success-50)',
          color: 'var(--success-600)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}
      >
        <Icon name="check-circle" size={38} />
      </div>
      <h2
        style={{
          fontSize: 'var(--text-2xl)',
          fontWeight: 800,
          color: 'var(--text-heading)',
          margin: '0 0 8px',
        }}
      >
        Venue is live 🎉
      </h2>
      <p
        style={{
          fontSize: 'var(--text-base)',
          color: 'var(--text-muted)',
          maxWidth: 440,
          margin: '0 auto 24px',
        }}
      >
        <strong style={{ color: 'var(--text-heading)' }}>{name}</strong> is now live on
        TheBookMyVenues and open for bookings — no approval needed. It appears in Live venues.
      </p>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button
          variant="primary"
          size="lg"
          iconRight={<Icon name="arrow-right" size={18} />}
          onClick={() => navigate('/venues')}
        >
          Go to Live venues
        </Button>
        <Button variant="secondary" size="lg" onClick={clear}>
          Register another venue
        </Button>
      </div>
    </div>
  );
}
