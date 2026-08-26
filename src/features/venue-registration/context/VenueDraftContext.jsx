import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { STEPS } from '@/constants/venue';
import useVenueDraft from '../useVenueDraft';
import { canReach, fieldErrors, missingFor, stepValid } from '../validation/venueValidation';

const VenueDraftContext = createContext(null);

/**
 * VenueDraftProvider — combines the draft lifecycle (useVenueDraft) with wizard
 * navigation and validation surfacing, so step components stay presentational.
 */
export function VenueDraftProvider({ children }) {
  const draftApi = useVenueDraft();
  const { draft } = draftApi;

  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);

  const goStep = useCallback(
    (i) => {
      if (i > step && !canReach(i, draft)) {
        setShowErrors(true);
        return;
      }
      setShowErrors(false);
      setStep(i);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [step, draft],
  );

  const next = useCallback(() => {
    if (!stepValid(step, draft)) {
      setShowErrors(true);
      return;
    }
    if (step >= STEPS.length - 1) return; // final submit handled by the footer
    goStep(step + 1);
  }, [step, draft, goStep]);

  const back = useCallback(() => {
    if (step > 0) goStep(step - 1);
  }, [step, goStep]);

  // Inline errors for the current step's section, shown only after a failed
  // advance attempt (showErrors) so the form doesn't scold users mid-typing.
  const currentSection = STEPS[step]?.section;
  const currentErrors = useMemo(() => {
    if (!showErrors || !currentSection || currentSection === 'photos') return {};
    return fieldErrors(currentSection, draft[currentSection]);
  }, [showErrors, currentSection, draft]);

  const value = useMemo(
    () => ({
      ...draftApi,
      step,
      setStep: goStep,
      goStep,
      next,
      back,
      isLastStep: step === STEPS.length - 1,
      showErrors,
      currentErrors,
      currentSection,
      stepValid: (i) => stepValid(i, draft),
      canReach: (i) => canReach(i, draft),
      missing: missingFor(step, draft),
      continueDisabled: !stepValid(step, draft),
    }),
    [draftApi, step, goStep, next, back, showErrors, currentErrors, currentSection, draft],
  );

  return <VenueDraftContext.Provider value={value}>{children}</VenueDraftContext.Provider>;
}

export function useVenueDraftContext() {
  const ctx = useContext(VenueDraftContext);
  if (!ctx) throw new Error('useVenueDraftContext must be used within VenueDraftProvider');
  return ctx;
}
