"use client"

import { useEffect, useId, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useLocale } from "../i18n/LocaleProvider"
import { Locale, LOCALE_COOKIE, LOCALES, switchLocalePath } from "../../lib/i18n"

const NAMES: Record<Locale, string> = { hr: "Hrvatski", en: "English" }

/** Where this page lives in `target`: its hreflang link when it has one (a blog
 * post's translation has its own slug), otherwise worked out from the path. */
function targetPath(pathname: string, target: Locale): string {
  const link = document.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${target}"]`)
  if (link) {
    try {
      return new URL(link.href).pathname
    } catch {}
  }
  return switchLocalePath(pathname, target)
}

export default function LanguageSwitcher() {
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()
  const label = locale === "en" ? "Language" : "Jezik"

  useEffect(() => {
    if (!open) return
    listRef.current?.focus({ preventScroll: true })
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  function show() {
    setActive(LOCALES.indexOf(locale))
    setOpen(true)
  }

  function hide() {
    setOpen(false)
    buttonRef.current?.focus()
  }

  function change(target: Locale) {
    hide()
    if (target === locale) return
    // Remembered so links to Croatian URLs (shared, bookmarked) open in English for this visitor.
    document.cookie = `${LOCALE_COOKIE}=${target}; path=/; max-age=31536000; samesite=lax`
    // Keep the job list's filters (?grana=…).
    router.push(targetPath(pathname, target) + window.location.search)
  }

  function onButtonKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      show()
    }
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    const last = LOCALES.length - 1
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((i) => (i === last ? 0 : i + 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((i) => (i === 0 ? last : i - 1))
    } else if (e.key === "Home") {
      e.preventDefault()
      setActive(0)
    } else if (e.key === "End") {
      e.preventDefault()
      setActive(last)
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      change(LOCALES[active])
    } else if (e.key === "Escape") {
      e.preventDefault()
      hide()
    } else if (e.key === "Tab") {
      // Back on the button first, so Tab carries on from there as the list unmounts.
      hide()
    }
  }

  return (
    <div className={`lang-switch ${open ? "is-open" : ""}`} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="lang-switch__button"
        aria-label={`${label}: ${NAMES[locale]}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        // Keeps focus in the open list, so a second click simply closes it.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (open ? hide() : show())}
        onKeyDown={onButtonKeyDown}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        <span>{locale.toUpperCase()}</span>
        <svg className="lang-switch__chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={listId}
          className="lang-switch__menu"
          role="listbox"
          aria-label={label}
          aria-activedescendant={`${listId}-${LOCALES[active]}`}
          tabIndex={-1}
          onKeyDown={onListKeyDown}
        >
          {LOCALES.map((l, i) => (
            <li
              key={l}
              id={`${listId}-${l}`}
              role="option"
              lang={l}
              aria-selected={l === locale}
              className={`lang-switch__option ${i === active ? "is-active" : ""}`}
              onPointerEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => change(l)}
            >
              <span className="lang-switch__badge" aria-hidden="true">
                {l.toUpperCase()}
              </span>
              <span className="lang-switch__name">{NAMES[l]}</span>
              {l === locale ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
