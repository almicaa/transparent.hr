import Link from "next/link"
import Logo from "../ui/Logo"
import { CONTACT_EMAIL } from "../../lib/seo"

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <Logo size={20} />
        <span className="meta">© {new Date().getFullYear()} transparent.hr — Vrijeme je ne gubiti vrijeme.</span>
        <div className="footer__legal-links">
          <Link href="/o-nama">O nama</Link>
          <a href={`mailto:${CONTACT_EMAIL}`}>Kontakt</a>
          <Link href="/privatnost">Politika privatnosti</Link>
          <Link href="/uvjeti-koristenja">Uvjeti korištenja</Link>
        </div>
      </div>
    </footer>
  )
}
