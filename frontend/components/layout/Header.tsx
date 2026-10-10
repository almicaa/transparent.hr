"use client"

import { useState } from "react"
import Link from "next/link"
import Logo from "../ui/Logo"
import { useSavedJobs } from "../../lib/savedJobs"

/** `showBlog`: only link the blog once it has a published post. */
export default function Header({ showBlog = false }: { showBlog?: boolean }) {
  const [open, setOpen] = useState(false)
  // Only shown once something is saved, so the nav stays short for everyone else.
  const savedCount = useSavedJobs().length

  return (
    <header className="site-nav">
      <div className="container site-nav__inner">
        <Link href="/" className="site-nav__brand" onClick={() => setOpen(false)}>
          <Logo />
        </Link>

        <button
          className={`site-nav__toggle ${open ? "site-nav__toggle--open" : ""}`}
          aria-label={open ? "Zatvori meni" : "Otvori meni"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`site-nav__links ${open ? "site-nav__links--open" : ""}`}>
          <Link href="/jobs" onClick={() => setOpen(false)}>
            Oglasi
          </Link>
          <Link href="/analitika" onClick={() => setOpen(false)}>
            Analitika
          </Link>
          {showBlog ? (
            <Link href="/blog" onClick={() => setOpen(false)}>
              Blog
            </Link>
          ) : null}
          <Link href="/o-nama" onClick={() => setOpen(false)}>
            O nama
          </Link>
          {savedCount ? (
            <Link href="/spremljeno" className="site-nav__saved" onClick={() => setOpen(false)}>
              <span aria-hidden="true">♥</span> Spremljeno <span className="site-nav__count">{savedCount}</span>
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  )
}
