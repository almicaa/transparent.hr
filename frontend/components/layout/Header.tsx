"use client"

import { useState } from "react"
import Link from "next/link"
import Logo from "../ui/Logo"

export default function Header() {
  const [open, setOpen] = useState(false)

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
          <Link href="/izvori" onClick={() => setOpen(false)}>
            Izvori
          </Link>
        </nav>
      </div>
    </header>
  )
}
