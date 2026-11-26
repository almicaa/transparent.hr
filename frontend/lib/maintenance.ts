// "Back soon" page, served by middleware.ts for every page while
// MAINTENANCE_MODE=1 is set on Vercel (redeploy after changing it).
// MAINTENANCE_UNTIL=2026-12-01 (optional) shows the expected return date.
//
// 503 + Retry-After tells search engines the outage is temporary, so indexed
// pages are kept instead of being dropped as errors.

import type { Locale } from "./i18n"

export function maintenanceEnabled(): boolean {
  return process.env.MAINTENANCE_MODE === "1"
}

const COPY = {
  hr: {
    title: "Uskoro se vraćamo",
    body: "Stranica je privremeno nedostupna zbog održavanja baze podataka. Oglasi se vraćaju čim završimo.",
    until: (d: string) => `Očekujemo povratak ${d}.`,
    switchLabel: "English",
    switchHref: "/en",
  },
  en: {
    title: "Back soon",
    body: "The site is temporarily unavailable while we work on the database. Job ads will be back as soon as we're done.",
    until: (d: string) => `We expect to be back on ${d}.`,
    switchLabel: "Hrvatski",
    switchHref: "/",
  },
}

function untilDate(locale: Locale): { label: string; retryAfter: string } | null {
  const raw = process.env.MAINTENANCE_UNTIL
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const date = new Date(`${raw}T06:00:00Z`)
  if (Number.isNaN(date.getTime())) return null
  const label = date.toLocaleDateString(locale === "hr" ? "hr-HR" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Zagreb",
  })
  return { label, retryAfter: date.toUTCString() }
}

export function maintenanceResponse(locale: Locale): Response {
  const t = COPY[locale]
  const until = untilDate(locale)
  const html = `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${t.title} · transparent.hr</title>
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<style>
  @font-face{font-family:"Inter";font-weight:100 900;font-display:swap;src:url(/fonts/inter-latin-ext.woff2) format("woff2")}
  @font-face{font-family:"Inter";font-weight:100 900;font-display:swap;src:url(/fonts/inter-latin.woff2) format("woff2");unicode-range:U+0000-00FF,U+2000-206F,U+20AC}
  :root{--primary:#0FA9A0;--dark:#085050;--accent:#FF7F1F;--bg:#fafbfa;--card:#fff;--border:#e7e9e8;--text:#2b2f2e;--muted:#5f6864;--tint:#d9f2ec}
  @media (prefers-color-scheme: dark){:root{--bg:#0f1514;--card:#162020;--border:#243231;--text:#e6ecea;--muted:#a3b0ac;--tint:#123c39;--dark:#74d9cc}}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px 16px;background:var(--bg);color:var(--text);font-family:"Inter",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;line-height:1.55;-webkit-font-smoothing:antialiased}
  main{max-width:520px;width:100%;background:var(--card);border:1px solid var(--border);border-radius:16px;padding:40px 32px;text-align:center;box-shadow:0 8px 30px rgba(8,80,80,.06)}
  .logo{display:inline-flex;align-items:center;gap:8px;font-weight:600;font-size:18px;color:var(--text);margin-bottom:28px}
  .logo img{width:28px;height:28px}
  .dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--accent);margin-right:8px;animation:pulse 1.6s ease-in-out infinite}
  @keyframes pulse{50%{opacity:.35}}
  @media (prefers-reduced-motion: reduce){.dot{animation:none}}
  h1{font-size:28px;letter-spacing:-.02em;margin:0 0 12px;color:var(--dark)}
  p{margin:0 0 10px;color:var(--muted)}
  .until{display:inline-block;margin-top:14px;padding:6px 14px;border-radius:999px;background:var(--tint);color:var(--text);font-weight:500;font-size:15px}
  .switch{display:inline-block;margin-top:28px;font-size:14px;color:var(--muted)}
</style>
</head>
<body>
<main>
  <div class="logo"><img src="/icon.svg" alt="">transparent.hr</div>
  <h1><span class="dot" aria-hidden="true"></span>${t.title}</h1>
  <p>${t.body}</p>
  ${until ? `<span class="until">${t.until(until.label)}</span>` : ""}
  <div><a class="switch" href="${t.switchHref}">${t.switchLabel}</a></div>
</main>
</body>
</html>`

  const headers: Record<string, string> = {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "retry-after": until?.retryAfter ?? "3600",
  }
  return new Response(html, { status: 503, headers })
}
