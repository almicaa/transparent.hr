import Link from "next/link"
import HeroSearch from "../components/home/HeroSearch"
import HeroIllustration from "../components/ui/HeroIllustration"
import { ArrowIcon } from "../components/ui/icons"
import { getFilters, getJobs, getStats } from "../lib/api"

export const revalidate = 300

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
  const withSalary = listedTotal ?? stats?.salary_shown ?? 0
  const portals = stats?.sources?.length || 2

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
          <div className="why-tile why-tile--cta">
            <svg className="why-tile__mark" width="34" height="34" viewBox="0 0 38 38" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="20" height="20" rx="6" stroke="#085050" strokeWidth="2.4" />
              <rect x="13" y="13" width="20" height="20" rx="6" fill="#F08A24" fillOpacity="0.7" />
            </svg>
            <p>Zanima te koliko se plaća u tvojoj struci? Pregledaj oglase po grani, gradu i plaći.</p>
            <Link href="/jobs" className="why-tile__button">
              Pregledaj oglase
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
