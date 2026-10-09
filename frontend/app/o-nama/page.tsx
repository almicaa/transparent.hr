import type { Metadata } from "next"
import Link from "next/link"
import HeroIllustration from "../../components/ui/HeroIllustration"
import { ArrowIcon } from "../../components/ui/icons"
import { getPost } from "../../lib/blog"
import { CONTACT_EMAIL, SITE_URL } from "../../lib/seo"

export const metadata: Metadata = {
  title: "O nama",
  description: "Transparent.hr skuplja oglase za posao u kojima je plaća navedena. Zašto je nastao i kako radi.",
  alternates: { canonical: `${SITE_URL}/o-nama` },
}

// The founding story in full lives on the blog; link it once it's published.
const STORY_SLUG = "sedam-sati-selekcije"

const STEPS = [
  { title: "Skupljamo", text: "Redovno skupljamo oglase s najpoznatijih platformi." },
  { title: "Filtriramo", text: "Prikazujemo samo oglase u kojima je plaća navedena." },
  { title: "Ti biraš", text: "Filtriraj po grani, gradu i iznosu plaće, a za bruto oglase odmah izračunaj neto." },
  { title: "Bez zamki", text: "Bez registracije i bez newslettera." },
]

export default function AboutPage() {
  const story = getPost(STORY_SLUG)

  return (
    <main>
      <section className="about-hero hero-surface">
        <HeroIllustration />
        <span className="about-hero__eyebrow">O nama</span>
        <h1>
          Oglasi za posao u kojima je plaća navedena. <span className="hero__title-accent">Samo njih.</span>
        </h1>
      </section>

      <section className="about-story">
        <div className="about-story__figure" aria-hidden="true">
          <span className="about-story__value">7 h</span>
          <span className="about-story__label">selekcije za jedno pitanje na kraju</span>
        </div>
        <div className="about-story__text">
          <h2>Zašto postojimo</h2>
          <p>
            Ideja je nastala iz frustracije. Beskrajno scrollanje portala, opisi posla detaljni, popisi uvjeta dugački, a
            plaće nigdje. Onda sedam sati selekcije: priprema prijave, slobodan dan za tehnički ispit, testovi i razgovori. Na
            samom kraju pitanje: koja je najniža plaća za koju bih pristala raditi?
          </p>
          <p>
            Plaća bi trebala biti prva stavka u oglasu, odmah uz lokaciju. Kad je poznata od početka, kandidat zna isplati li
            se prijaviti, a poslodavac ne troši vrijeme na razgovore koji ne vode nikamo.
          </p>
          {story ? (
            <Link href={`/blog/${story.slug}`} className="link-with-icon about-story__link">
              Cijelu priču pročitaj na blogu
              <ArrowIcon />
            </Link>
          ) : null}
        </div>
      </section>

      <section className="about-steps">
        <h2>Kako radimo</h2>
        <ol className="about-steps__grid">
          {STEPS.map((s, i) => (
            <li key={s.title} className="about-step">
              <span className="about-step__num">{String(i + 1).padStart(2, "0")}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="about-contact" id="kontakt">
        <div>
          <h2>Javi nam se</h2>
          <p>Imaš svoju priču iz selekcije? Poslodavac si koji već objavljuje plaće? Upravo takve oglase želimo vidjeti više.</p>
        </div>
        <div className="about-contact__actions">
          <a href={`mailto:${CONTACT_EMAIL}`} className="about-contact__mail">
            {CONTACT_EMAIL}
          </a>
          <Link href="/jobs" className="about-contact__jobs link-with-icon">
            Pregledaj oglase
            <ArrowIcon />
          </Link>
        </div>
      </section>
    </main>
  )
}
