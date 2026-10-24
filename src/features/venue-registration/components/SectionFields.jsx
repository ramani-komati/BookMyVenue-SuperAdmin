import { TextField, Select } from '@/reg-ui';
import { useVenueDraftContext } from '../context/VenueDraftContext';

/**
 * SectionTextField / SectionSelect — inputs pre-wired to a draft section.
 * They read the value from context, update local state on change (with an
 * optional `sanitize` transform to restrict typing), autosave-on-blur, and
 * surface the section's inline validation error when the step reports errors.
 */

export function SectionTextField({ section, name, sanitize, onValue, ...props }) {
  const { draft, setField, flushNow, currentErrors, currentSection } = useVenueDraftContext();
  const value = draft[section]?.[name] ?? '';
  const error = currentSection === section ? currentErrors[name] : undefined;

  return (
    <TextField
      value={value}
      error={error}
      onChange={(e) => {
        const raw = e.target.value;
        const next = sanitize ? sanitize(raw) : raw;
        setField(section, name, next);
        onValue?.(next);
      }}
      onBlur={flushNow}
      {...props}
    />
  );
}

export function SectionSelect({ section, name, onValue, ...props }) {
  const { draft, setField, flushNow, currentErrors, currentSection } = useVenueDraftContext();
  const value = draft[section]?.[name] ?? '';
  const error = currentSection === section ? currentErrors[name] : undefined;

  return (
    <Select
      value={value}
      error={error}
      onChange={(e) => {
        setField(section, name, e.target.value);
        onValue?.(e.target.value);
      }}
      onBlur={flushNow}
      {...props}
    />
  );
}
