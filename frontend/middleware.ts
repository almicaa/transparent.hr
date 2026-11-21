import { NextRequest, NextResponse } from "next/server"
import { DEFAULT_LOCALE, internalPath, LOCALE_COOKIE, localePath } from "./lib/i18n"

/** Marks a request this middleware already rewrote onto an app/[lang]/ folder. */
const REWRITTEN_HEADER = "x-locale-rewritten"

// Public URLs → app/[lang]/ folders:
//   /jobs        → /hr/jobs         (Croatian has no prefix)
//   /en/about    → /en/o-nama       (English slugs map onto the Croatian folders)
//   /hr/jobs     → 308 to /jobs     (one URL per page)
//   /en/o-nama   → 308 to /en/about
// A visitor who picked English in the switcher is sent from Croatian URLs to
// the English ones. Nobody is redirected on Accept-Language alone: search
// engines crawl without it and would only ever see one language.
export function middleware(req: NextRequest) {
  // `next start` runs middleware again on the rewritten path; without this,
  // /o-nama → /hr/o-nama would hit the /hr redirect below and loop forever.
  if (req.headers.has(REWRITTEN_HEADER)) return NextResponse.next()

  const { pathname } = req.nextUrl

  // Share images: Next links them by the internal path (/hr/jobs/1/opengraph-image).
  if (pathname.endsWith("/opengraph-image") && (pathname.startsWith("/hr/") || pathname.startsWith("/en/"))) {
    return NextResponse.next()
  }

  if (pathname === "/hr" || pathname.startsWith("/hr/")) {
    return redirect(req, pathname.slice(3) || "/")
  }

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const internal = internalPath(pathname)
    const canonical = localePath("en", internal)
    if (canonical !== pathname) return redirect(req, canonical)
    return rewrite(req, `/en${internal === "/" ? "" : internal}`)
  }

  if (req.cookies.get(LOCALE_COOKIE)?.value === "en") {
    return redirect(req, localePath("en", pathname), 307)
  }
  return rewrite(req, `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`)
}

function redirect(req: NextRequest, pathname: string, status = 308) {
  const url = req.nextUrl.clone()
  url.pathname = pathname
  return NextResponse.redirect(url, status)
}

function rewrite(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone()
  url.pathname = pathname
  const headers = new Headers(req.headers)
  headers.set(REWRITTEN_HEADER, "1")
  return NextResponse.rewrite(url, { request: { headers } })
}

export const config = {
  // Pages only: not Next's own files, the API proxy, or anything with an
  // extension (icon.png, sitemap.xml, robots.txt, fonts).
  matcher: ["/((?!_next/|api/|.*\\.).*)"],
}
