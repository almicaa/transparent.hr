import type { Metadata } from "next"
import Link from "next/link"
import { getPost } from "../../lib/blog"
import { CONTACT_EMAIL, SITE_URL } from "../../lib/seo"

export const metadata: Metadata = {
  title: "O nama",
  description: "Transparent.hr skuplja oglase za posao u kojima je plaća navedena. Zašto je nastao i kako radi.",
  alternates: { canonical: `${SITE_URL}/o-nama` },
}

// The founding story in full lives on the blog; link it once it's published.
const STORY_SLUG = "sedam-sati-selekcije"

export default function AboutPage() {
  const story = getPost(STORY_SLUG)

  return (
    <main className="blog-post">
      <header className="blog-post__header">
        <h1>O nama</h1>
        <p className="blog-post__lead">Transparent.hr skuplja oglase za posao u kojima je plaća navedena. Samo njih.</p>
      </header>

      <div className="prose">
        <p>
          Ideja je nastala iz frustracije. Beskrajno scrollanje portala, opisi posla detaljni, popisi uvjeta dugački, a
          plaće nigdje. Onda sedam sati selekcije: priprema prijave, slobodan dan za tehnički ispit, testovi i razgovori. Na
          samom kraju pitanje: koja je najniža plaća za koju bih pristala raditi?
        </p>
        <p>
          Plaća bi trebala biti prva stavka u oglasu, odmah uz lokaciju. Kad je poznata od početka, kandidat zna isplati li
          se prijaviti, a poslodavac ne troši vrijeme na razgovore koji ne vode nikamo.
        </p>

        <h2>Kako radimo</h2>
        <ul>
          <li>Redovno skupljamo oglase s najpoznatijih platformi.</li>
          <li>Prikazujemo samo oglase u kojima je plaća navedena.</li>
          <li>Možeš ih filtrirati po grani, gradu i iznosu plaće.</li>
          <li>Za bruto oglase odmah izračunaš neto.</li>
          <li>Bez registracije i bez newslettera.</li>
        </ul>

        {story ? (
          <p>
            <Link href={`/blog/${story.slug}`}>Cijelu priču pročitaj na blogu →</Link>
          </p>
        ) : null}

        <h2 id="kontakt">Kontakt</h2>
        <p>
          Imaš svoju priču iz selekcije? Poslodavac si koji već objavljuje plaće? Javi nam se na{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </div>

      <aside className="blog-post__cta">
        <p>Tražiš posao s jasno navedenom plaćom?</p>
        <Link href="/jobs" className="why-tile__button">
          Pregledaj oglase →
        </Link>
      </aside>
    </main>
  )
}
