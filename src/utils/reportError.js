/**
 * reportError — single funnel for unexpected/background errors so nothing is
 * silently swallowed. Wire a real reporting service (Sentry, etc.) here; until
 * then failures are at least visible in the dev console.
 */
export function reportError(error, context = '') {
  // TODO: forward to an error-reporting service (Sentry, etc.).
  if (import.meta.env.DEV) {
    console.error(context ? `[bmv] ${context}:` : '[bmv]', error);
  }
}

/**
 * installGlobalErrorHandlers — last-resort net for errors that escape every
 * try/catch: unhandled promise rejections and uncaught synchronous throws.
 * Call once at startup (see main.jsx).
 */
export function installGlobalErrorHandlers() {
  if (typeof window === 'undefined') return;
  window.addEventListener('unhandledrejection', (event) => {
    reportError(event.reason, 'Unhandled promise rejection');
  });
  window.addEventListener('error', (event) => {
    reportError(event.error ?? event.message, 'Uncaught error');
  });
}
