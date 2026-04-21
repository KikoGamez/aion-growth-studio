/**
 * GA4 event helper — thin wrapper around gtag('event', ...).
 *
 * Usage from any client-side <script>:
 *   import { trackEvent } from '../../lib/analytics/gtag';
 *   trackEvent('cta_diagnostico_click', { page: '/es' });
 *
 * Or directly from inline scripts (gtag is global):
 *   if (typeof gtag === 'function') gtag('event', 'cta_diagnostico_click');
 *
 * Does nothing on localhost / preview deploys (gtag not loaded).
 */

declare global {
  // eslint-disable-next-line no-var
  var gtag: ((...args: any[]) => void) | undefined;
}

export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
): void {
  if (typeof globalThis.gtag === 'function') {
    globalThis.gtag('event', name, params);
  }
}
