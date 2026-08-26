/**
 * Form — wraps a screen's fields so pressing Enter runs its primary action,
 * exactly like clicking the primary button.
 *
 * `disabled` mirrors the primary button's disabled logic, so Enter can never
 * fire an action the button itself wouldn't allow. The hidden submit button
 * guarantees the browser's implicit submission works even when the visible
 * primary button is `type="button"` (or lives in a child component).
 *
 * Enter-safe by design: textareas insert newlines, selects never submit, and
 * inputs that handle Enter themselves (e.g. tag inputs) call preventDefault.
 */
export default function Form({ onSubmit, disabled = false, children, ...rest }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!disabled) onSubmit?.();
  };

  return (
    <form onSubmit={handleSubmit} noValidate {...rest}>
      {children}
      <button type="submit" hidden tabIndex={-1} aria-hidden="true" />
    </form>
  );
}
