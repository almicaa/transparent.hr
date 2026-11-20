"use client"

import { useState } from "react"
import Link from "next/link"
import Logo from "../ui/Logo"
import LanguageSwitcher from "./LanguageSwitcher"
import { useLocale } from "../i18n/LocaleProvider"
import { useSavedJobs } from "../../lib/savedJobs"
import { localePath } from "../../lib/i18n"

const COPY = {
  hr: {
    closeMenu: "Zatvori meni",
    openMenu: "Otvori meni",
    jobs: "Oglasi",
    smartSearch: "Pametna pretraga",
    about: "O nama",
    analytics: "Analitika",
    saved: "Spremljeno",
  },
  en: {
    closeMenu: "Close menu",
    openMenu: "Open menu",
    jobs: "Jobs",
    smartSearch: "Smart search",
    about: "About",
    analytics: "Analytics",
    saved: "Saved",
  },
}

/** `showBlog`: only link the blog once it has a published post. */
export default function Header({ showBlog = false }: { showBlog?: boolean }) {
  const locale = useLocale()
  const t = COPY[locale]
  const href = (path: string) => localePath(locale, path)
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  // Only shown once something is saved, so the nav stays short for everyone else.
  const savedCount = useSavedJobs().length

  return (
    <header className="site-nav">
      <div className="container site-nav__inner">
        <Link href={href("/")} className="site-nav__brand" onClick={close}>
          <Logo />
        </Link>

        <nav className={`site-nav__links ${open ? "site-nav__links--open" : ""}`}>
          <Link href={href("/jobs")} onClick={close}>
            {t.jobs}
          </Link>
          <Link href={href("/cv")} onClick={close}>
            {t.smartSearch}
          </Link>
          <Link href={href("/o-nama")} onClick={close}>
            {t.about}
          </Link>
          <Link href={href("/analitika")} onClick={close}>
            {t.analytics}
          </Link>
          {showBlog ? (
            <Link href={href("/blog")} onClick={close}>
              Blog
            </Link>
          ) : null}
          {savedCount ? (
            <Link href={href("/spremljeno")} className="site-nav__saved" onClick={close}>
              <span aria-hidden="true">♥</span> {t.saved} <span className="site-nav__count">{savedCount}</span>
            </Link>
          ) : null}
        </nav>

        <div className="site-nav__tools">
          <LanguageSwitcher />
          <button
            className={`site-nav__toggle ${open ? "site-nav__toggle--open" : ""}`}
            aria-label={open ? t.closeMenu : t.openMenu}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  )
}
