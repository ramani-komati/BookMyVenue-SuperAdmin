import { STEPS } from '@/constants/venue';
import { Icon, ProgressCircle } from '@/reg-ui';
import { useVenueDraftContext } from '../context/VenueDraftContext';

/**
 * FormSidebar — shows overall completion (radial %) and the step navigation
 * with active / done / locked states. Locked steps can't be jumped to until
 * the preceding steps are valid.
 */
export default function FormSidebar() {
  const { step, completion, goStep, stepValid, canReach } = useVenueDraftContext();

  return (
    <aside className="rv-side">
      <div
        style={{
          fontSize: 'var(--text-base)',
          fontWeight: 'var(--fw-bold)',
          color: 'var(--text-heading)',
          marginBottom: 10,
        }}
      >
        Form completion
      </div>

      <ProgressCircle value={completion} />

      <div
        style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--text-muted)',
          marginTop: 12,
          paddingBottom: 20,
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        Your progress is saved automatically.
      </div>

      <nav
        aria-label="Registration steps"
        style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 20 }}
      >
        {STEPS.map((s, i) => {
          const active = i === step;
          const done = i < step && stepValid(i);
          const locked = i > step && !canReach(i);
          return (
            <button
              key={s.key}
              type="button"
              className="rv-nav-item"
              data-active={active}
              data-done={done}
              data-locked={locked}
              aria-current={active ? 'step' : undefined}
              disabled={locked}
              onClick={() => goStep(i)}
            >
              <span className="rv-nav-ic">
                <Icon name={done ? 'check' : s.icon} size={19} />
              </span>
              <span className="rv-nav-lbl">{s.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
