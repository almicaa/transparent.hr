import Link from "next/link"
import Logo from "../ui/Logo"
import { CONTACT_EMAIL } from "../../lib/seo"
import { Locale, localePath } from "../../lib/i18n"

const COPY = {
  hr: {
    tagline: "Vrijeme je ne gubiti vrijeme.",
    about: "O nama",
    contact: "Kontakt",
    privacy: "Politika privatnosti",
    terms: "Uvjeti korištenja",
  },
  en: {
    tagline: "Time to stop wasting time.",
    about: "About",
    contact: "Contact",
    privacy: "Privacy policy",
    terms: "Terms of use",
  },
}

export default function Footer({ locale }: { locale: Locale }) {
  const t = COPY[locale]
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <Logo size={20} />
        <span className="meta">
          © {new Date().getFullYear()} transparent.hr — {t.tagline}
        </span>
        <div className="footer__legal-links">
          <Link href={localePath(locale, "/o-nama")}>{t.about}</Link>
          <a href={`mailto:${CONTACT_EMAIL}`}>{t.contact}</a>
          <Link href={localePath(locale, "/privatnost")}>{t.privacy}</Link>
          <Link href={localePath(locale, "/uvjeti-koristenja")}>{t.terms}</Link>
        </div>
      </div>
    </footer>
  )
}
