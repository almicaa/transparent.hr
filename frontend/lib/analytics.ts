/**
 * Send a Google Analytics event. gtag is loaded in the root layout with
 * consent mode, so this respects the cookie banner choice on its own; it's a
 * no-op when gtag isn't there (blocked, dev without network, server render).
 *
 * Event and parameter names show up as-is in GA. Custom parameters need a
 * custom dimension (Admin → Custom definitions) before reports can use them.
 */
export function trackEvent(name: string, params: Record<string, string | number | undefined> = {}) {
  if (typeof window === "undefined") return
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
  if (!gtag) return
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ""))
  gtag("event", name, clean)
}
