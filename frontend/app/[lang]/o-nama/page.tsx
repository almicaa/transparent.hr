import Link from "next/link"
import HeroIllustration from "../../../components/ui/HeroIllustration"
import { ArrowIcon } from "../../../components/ui/icons"
import { getAllPosts, getPost } from "../../../lib/blog"
import { LangProps, localePath } from "../../../lib/i18n"
import { CONTACT_EMAIL, pageMetadata } from "../../../lib/seo"

// The founding story in full lives on the blog; link it once it's published.
const STORY_SLUG = "sedam-sati-selekcije"

const COPY = {
  hr: {
    title: "O nama",
    description: "Transparent.hr skuplja oglase za posao u kojima je plaća navedena. Zašto je nastao i kako radi.",
    eyebrow: "O nama",
    headingStart: "Samo oglasi za posao",
    headingAccent: "u kojima piše plaća.",
    whyTitle: "Zašto postojimo",
    whyText1:
      "Beskrajno scrollanje portala, opisi posla detaljni, popisi uvjeta dugački, a plaće nigdje. Onda sedam sati selekcije: priprema prijave, uzimanje godišnjeg za odlazak na tehnički ispit, testovi i razgovori.",
    quote: "Koja je najniža plaća za koju biste pristali raditi?",
    quoteCaption: "je bilo pitanje nakon 7 sati testova i razgovora",
    whyText2:
      "Plaća bi trebala biti prva stavka u oglasu, odmah uz lokaciju. Kad je poznata od početka, kandidat zna isplati li se prijaviti, a poslodavac ne troši vrijeme na razgovore koji ne vode nikamo.",
    storyLink: "Cijelu priču pročitaj na blogu",
    stepsTitle: "Kako radimo",
    steps: [
      { title: "Skupljamo", text: "Redovno skupljamo oglase s najpoznatijih platformi." },
      { title: "Filtriramo", text: "Prikazujemo samo oglase u kojima je plaća navedena." },
      { title: "Ti biraš", text: "Filtriraj po grani, gradu i iznosu plaće, a za bruto oglase odmah izračunaj neto." },
      { title: "Bez zamki", text: "Bez registracije i bez newslettera." },
    ],
    contactTitle: "Javi nam se",
    contactText:
      "Imaš svoju priču iz selekcije? Poslodavac si koji već objavljuje plaće? Upravo takve oglase želimo vidjeti više.",
    browse: "Pregledaj oglase",
  },
  en: {
    title: "About us",
    description: "Transparent.hr collects job ads in Croatia that list the salary. Why it exists and how it works.",
    eyebrow: "About us",
    headingStart: "Only job ads",
    headingAccent: "that tell you the pay.",
    whyTitle: "Why we exist",
    whyText1:
      "Endless scrolling through job sites: detailed job descriptions, long lists of requirements, and no salary anywhere. Then seven hours of selection: preparing the application, taking a day off for a technical test, more tests and interviews.",
    quote: "What is the lowest salary you would accept?",
    quoteCaption: "was the question after 7 hours of tests and interviews",
    whyText2:
      "The salary should be the first thing in a job ad, right next to the location. When it's known from the start, candidates know whether it's worth applying, and employers don't waste time on interviews that go nowhere.",
    storyLink: "Read the whole story on the blog",
    stepsTitle: "How it works",
    steps: [
      { title: "We collect", text: "We regularly collect job ads from the best-known job sites." },
      { title: "We filter", text: "We only show ads that list the salary." },
      { title: "You choose", text: "Filter by sector, city and salary, and work out the net pay of gross ads right away." },
      { title: "No catch", text: "No sign-up and no newsletter." },
    ],
    contactTitle: "Get in touch",
    contactText:
      "Have your own story from a hiring process? Are you an employer who already publishes salaries? Those are exactly the ads we want to see more of.",
    browse: "Browse jobs",
  },
}

export function generateMetadata({ params }: LangProps) {
  const t = COPY[params.lang]
  return pageMetadata({ locale: params.lang, title: t.title, description: t.description, path: "/o-nama" })
}

export default function AboutPage({ params }: LangProps) {
  const locale = params.lang
  const t = COPY[locale]
  // The story in this language: the Croatian post, or its translation.
  const story =
    locale === "hr" ? getPost("hr", STORY_SLUG) : getAllPosts(locale).find((p) => p.hrSlug === STORY_SLUG) ?? null

  return (
    <main>
      <section className="about-hero hero-surface">
        <HeroIllustration />
        <span className="about-hero__eyebrow">{t.eyebrow}</span>
        <h1>
          {t.headingStart} <span className="hero__title-accent">{t.headingAccent}</span>
        </h1>
      </section>

      <section className="about-story">
        <h2>{t.whyTitle}</h2>
        <p>{t.whyText1}</p>
        <figure className="about-quote">
          <blockquote>{t.quote}</blockquote>
          <figcaption>{t.quoteCaption}</figcaption>
        </figure>
        <p>{t.whyText2}</p>
        {story ? (
          <Link href={localePath(locale, `/blog/${story.slug}`)} className="link-with-icon about-story__link">
            {t.storyLink}
            <ArrowIcon />
          </Link>
        ) : null}
      </section>

      <section className="about-steps">
        <h2>{t.stepsTitle}</h2>
        <ol className="about-steps__grid">
          {t.steps.map((s, i) => (
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
          <h2>{t.contactTitle}</h2>
          <p>{t.contactText}</p>
        </div>
        <div className="about-contact__actions">
          <a href={`mailto:${CONTACT_EMAIL}`} className="about-contact__mail">
            {CONTACT_EMAIL}
          </a>
          <Link href={localePath(locale, "/jobs")} className="about-contact__jobs link-with-icon">
            {t.browse}
            <ArrowIcon />
          </Link>
        </div>
      </section>
    </main>
  )
}
