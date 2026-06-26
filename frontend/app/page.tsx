import Link from "next/link"
import { getJobs, getStats } from "../lib/api"
import SourcesBreakdown from "../components/ui/SourcesBreakdown"
import JobCard from "../components/job/JobCard"
import HeroIllustration from "../components/ui/HeroIllustration"
import { CheckIcon, EuroIcon, LayersIcon } from "../components/ui/icons"
import { SOURCE_LABELS } from "../lib/sourceLabels"

export const dynamic = "force-dynamic"

const FEATURES = [
  {
    title: "Samo plaća u EUR",
    text: "Svaki oglas koji vidiš već otkriva iznos — nema pogađanja, nema 'po dogovoru'.",
    Icon: EuroIcon,
  },
  {
    title: "Sakupljeno s više portala",
    text: "Provjeravamo oglase s hrvatskih job portala i izdvajamo samo one koji prikazuju plaću.",
    Icon: LayersIcon,
  },
  {
    title: "Bez registracije",
    text: "Pretraži, filtriraj po gradu i kategoriji, klikni na originalni oglas. Gotovo.",
    Icon: CheckIcon,
  },
]

export default async function HomePage() {
  const [stats, featured] = await Promise.all([
    getStats(),
    getJobs({ sort: "salary_desc", salary_shown: "yes", per_page: 4 }).catch(() => null),
  ])
  const estimates = stats?.market_estimates ?? []
  const featuredJobs = featured?.jobs ?? []

  return (
    <main>
      <section className="hero">
        <HeroIllustration />
        <h1>Transparent.hr</h1>
        <p className="hero__lead">Pronađi posao u Hrvatskoj s vidljivom plaćom u EUR.</p>

        <div className="stats">
          <div className="stat">
            <div className="stat__value">{stats?.salary_shown ?? "-"}</div>
            <div className="meta">Oglasa s plaćom u bazi</div>
          </div>
          {stats ? <SourcesBreakdown sources={stats.sources} /> : null}
        </div>

        {estimates.length > 0 ? (
          <div className="market-estimate">
            <p className="meta">Procjena udjela oglasa s plaćom po portalu:</p>
            <ul>
              {estimates.map((e) => (
                <li key={e.source}>
                  {SOURCE_LABELS[e.source] || e.source}: <strong>~{e.estimated_pct}%</strong>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <Link className="cta" href="/jobs">
          Pogledaj oglase →
        </Link>
      </section>

      {featuredJobs.length > 0 ? (
        <section className="home-section">
          <div className="home-section__header">
            <h2>Istaknute objave</h2>
            <Link href="/jobs">Svi oglasi →</Link>
          </div>
          <div className="grid">
            {featuredJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="home-section">
        <h2>Zašto transparent.hr</h2>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card">
              <f.Icon />
              <h3>{f.title}</h3>
              <p className="meta">{f.text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
