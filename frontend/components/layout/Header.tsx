import Link from "next/link"
import Logo from "../ui/Logo"

export default function Header() {
  return (
    <header className="site-nav">
      <div className="container site-nav__inner">
        <Link href="/" className="site-nav__brand">
          <Logo />
        </Link>
        <nav className="site-nav__links">
          <Link href="/jobs">Oglasi</Link>
          <Link href="/analitika">Analitika</Link>
        </nav>
      </div>
    </header>
  )
}
