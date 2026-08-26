import { useCallback, useEffect, useRef } from 'react';

/**
 * useDebouncedCallback — returns a stable debounced version of `callback`.
 * The returned function also exposes `.flush()` to run any pending call
 * immediately and `.cancel()` to drop it (used for blur-vs-debounce autosave).
 */
export default function useDebouncedCallback(callback, delay = 800) {
  const cbRef = useRef(callback);
  const timerRef = useRef(null);
  const pendingArgs = useRef(null);

  // Always call the latest callback without re-creating the debounced fn.
  useEffect(() => {
    cbRef.current = callback;
  }, [callback]);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const debounced = useCallback(
    (...args) => {
      pendingArgs.current = args;
      clear();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const a = pendingArgs.current;
        pendingArgs.current = null;
        cbRef.current(...a);
      }, delay);
    },
    [delay, clear],
  );

  debounced.flush = useCallback(() => {
    if (timerRef.current && pendingArgs.current) {
      clear();
      const a = pendingArgs.current;
      pendingArgs.current = null;
      cbRef.current(...a);
    }
  }, [clear]);

  debounced.cancel = useCallback(() => {
    clear();
    pendingArgs.current = null;
  }, [clear]);

  // Clean up on unmount.
  useEffect(() => clear, [clear]);

  return debounced;
}
