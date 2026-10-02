/**
 * Registers the generated service worker (scripts/pwa-plugin.ts emits sw.js).
 *
 * Guarded three ways so it never interferes with dev or tests:
 *  - only in a production build (`import.meta.env.PROD`), so Vite's dev HMR
 *    websocket is never shadowed by a cache-first SW,
 *  - only when the browser supports it,
 *  - path is base-aware (`import.meta.env.BASE_URL`) so it resolves under
 *    '/hobbyist/' on GitHub Pages and '/' everywhere else, matching the SW's
 *    own scope.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL || '/'
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {
      // A failed registration must never break the app — the site works fine
      // without the SW, you just lose offline open + installability polish.
    })
  })
}
