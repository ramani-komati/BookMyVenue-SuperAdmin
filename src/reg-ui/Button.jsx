import Icon from './Icon';

/**
 * Button — design-system button primitive.
 * variant: primary | secondary | navy | ghost | danger
 * size: sm | md | lg
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  block = false,
  loading = false,
  disabled = false,
  iconLeft,
  iconRight,
  type = 'button',
  className = '',
  ...rest
}) {
  const cls = [
    'bmv-btn',
    `bmv-btn--${variant}`,
    `bmv-btn--${size}`,
    block ? 'bmv-btn--block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Icon name="loader" size={18} className="bmv-btn__spinner animate-spin" />}
      {!loading && iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  );
}
