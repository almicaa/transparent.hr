import Link from "next/link"
import BlogCard from "../components/blog/BlogCard"
import HeroSearch from "../components/home/HeroSearch"
import HeroIllustration from "../components/ui/HeroIllustration"
import { ArrowIcon } from "../components/ui/icons"
import { getFilters, getJobs, getStats } from "../lib/api"
import { getAllPosts } from "../lib/blog"
import { HOME_DESCRIPTION, HOME_TITLE, pageMetadata } from "../lib/seo"

export const revalidate = 300

// Colour of each home-page blog card, in order.
const BLOG_TONES = ["dark", "orange", "mint"]

export const metadata = pageMetadata({ title: HOME_TITLE, description: HOME_DESCRIPTION, path: "/", titleTemplate: false })

async function getHomeData() {
  const [stats, filterData, listed] = await Promise.all([
    getStats({ revalidate: 300 }).catch(() => null),
    getFilters({ revalidate: 300 }).catch(() => undefined),
    // Same count the job list shows: ads posted once per location count once.
    getJobs({ page: 1, per_page: 1, salary_shown: "yes" }, { revalidate: 300 }).catch(() => null),
  ])
  return { stats, filterData, listedTotal: listed?.total ?? null }
}

export default async function HomePage() {
  const { stats, filterData, listedTotal } = await getHomeData()
  // Only the job list's own count: stats.salary_shown counts every ad, before
  // per-location duplicates are grouped, so it never matches /jobs. Without
  // it the tile says "100 %" and the button has no number.
  const withSalary = listedTotal ?? 0
  const portals = stats?.sources?.length || 3
  const latestPosts = getAllPosts().slice(0, 3)

  const tiles = [
    {
      value: withSalary ? withSalary.toLocaleString("hr-HR") : "100 %",
      label: "oglasa s vidljivom plaćom",
      title: "Samo oglasi koji pričaju.",
      text: "Svaki oglas ovdje ima broj. Jer \"po dogovoru\" nije odgovor.",
      tone: "teal",
    },
    {
      value: String(portals),
      label: "portala, jedna pretraga",
      title: "Skupljeno s cijele scene.",
      text: "Posao.hr, MojPosao i ostali — mi filtriramo, ti biraš.",
      tone: "mint",
    },
    {
      value: "0",
      label: "registracija i newslettera",
      title: "Otvori, filtriraj, apliciraj.",
      text: "Bez registracije. Bez newslettera. Bez ičega suvišnog.",
      tone: "orange",
    },
  ]

  return (
    <main>
      <section className="hero hero--home hero-surface">
        <HeroIllustration />
        <h1>
          Oglasi za posao s{" "}
          <span className="hero__title-accent">transparentnom plaćom</span>
        </h1>
        <p className="hero__lead">
          Vrijeme je za ne gubiti više vremena na oglase bez jasno vidljive plaće.
        </p>
        <div className="hero__search">
          <HeroSearch filterData={filterData} />
        </div>
        <Link href="/jobs" className="hero__all link-with-icon">
          {withSalary ? `Pogledaj svih ${withSalary.toLocaleString("hr-HR")} oglasa` : "Pogledaj sve oglase"}
          <ArrowIcon />
        </Link>
      </section>

      <section className="home-section">
        <h2>Zašto transparent.hr</h2>
        <div className="why-grid">
          {tiles.map((t) => (
            <div key={t.title} className="why-tile">
              <div className={`why-tile__block why-tile__block--${t.tone}`}>
                <span className="why-tile__value">{t.value}</span>
                <span className="why-tile__label">{t.label}</span>
              </div>
              <div className="why-tile__body">
                <h3>{t.title}</h3>
                <p>{t.text}</p>
              </div>
            </div>
          ))}
          <div className="why-tile why-tile--cta why-tile--smart">
            <span className="why-tile__badge">Novo · Pametna pretraga</span>
            <h3>Ne znaš što tražiti? Učitaj CV.</h3>
            <p>
              AI pročita sve oglase s plaćom, usporedi ih s tvojim iskustvom i za svaki posao napiše zašto ti paše.
              Bez registracije, a CV ne spremamo.
            </p>
            <Link href="/cv" className="why-tile__button">
              Isprobaj pametnu pretragu
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>

      {latestPosts.length ? (
        <section className="home-section">
          <div className="home-section__header">
            <h2>Iz bloga</h2>
            <Link href="/blog" className="link-with-icon">
              Svi članci
              <ArrowIcon />
            </Link>
          </div>
          <div className="blog-list blog-list--home">
            {latestPosts.map((p, i) => (
              <BlogCard key={p.slug} post={p} headingLevel={3} className={`blog-card--${BLOG_TONES[i % BLOG_TONES.length]}`} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}
