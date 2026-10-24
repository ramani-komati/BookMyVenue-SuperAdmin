/**
 * ProgressCircle — radial completion indicator used in the form sidebar.
 * `value` is a 0–100 percentage.
 */
export default function ProgressCircle({ value = 0, size = 150, stroke = 16 }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const r = size / 2 - stroke / 2 - 4;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct / 100);
  const center = size / 2;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 4px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Colors must be set via `style` — var() does not resolve inside
              SVG presentation attributes, so it would fall back to black. */}
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            strokeWidth={stroke}
            style={{ stroke: 'var(--neutral-100)' }}
          />
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ stroke: 'var(--brand-accent)', transition: 'stroke-dashoffset .4s ease' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontSize: 46,
              fontWeight: 800,
              lineHeight: 1,
              color: 'var(--text-heading)',
              letterSpacing: '-.02em',
            }}
          >
            {pct}
          </span>
          <span
            style={{
              fontSize: 19,
              fontWeight: 'var(--fw-bold)',
              color: 'var(--text-muted)',
              marginLeft: 2,
              lineHeight: 1,
              position: 'relative',
              top: -11,
            }}
          >
            %
          </span>
        </div>
      </div>
    </div>
  );
}
