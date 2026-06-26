import Link from "next/link"
import { getJobs } from "../lib/api"
import JobCard from "../components/job/JobCard"
import HeroIllustration from "../components/ui/HeroIllustration"
import { ArrowIcon, CheckIcon, EuroIcon, LayersIcon } from "../components/ui/icons"

export const dynamic = "force-dynamic"

const FEATURES = [
  {
    title: "Samo oglasi koji pričaju.",
    text: "Svaki oglas ovdje ima broj. Jer \"po dogovoru\" nije odgovor.",
    Icon: EuroIcon,
  },
  {
    title: "Skupljeno s cijele scene.",
    text: "Posao.hr, MojPosao i ostali — mi filtriramo, ti biraš.",
    Icon: LayersIcon,
  },
  {
    title: "Otvori, filtriraj, apliciraj.",
    text: "Bez registracije. Bez newslettera. Bez ičega suvišnog.",
    Icon: CheckIcon,
  },
]

export default async function HomePage() {
  const featured = await getJobs({ sort: "salary_desc", salary_shown: "yes", per_page: 4 }).catch(() => null)
  const featuredJobs = featured?.jobs ?? []

  return (
    <main>
      <section className="hero">
        <HeroIllustration />
        <h1>Plaća prvo. Prijava poslije.</h1>
        <p className="hero__lead">Filtrirali smo sve ostale. Ostalo je ono što vrijedi tvoje vrijeme.</p>

        <div className="hero__manifesto">
          <span className="hero__manifesto-line hero__manifesto-line--struck">"Po dogovoru" nije odgovor.</span>
          <span className="hero__manifesto-line">Transparentnost nije luksuz.</span>
          <span className="hero__manifesto-line hero__manifesto-line--strong">Samo stvarne brojke.</span>
        </div>

        <Link className="cta" href="/jobs">
          Pogledaj oglase <ArrowIcon />
        </Link>
      </section>

      {featuredJobs.length > 0 ? (
        <section className="home-section">
          <div className="home-section__header">
            <h2>Istaknute objave</h2>
            <Link href="/jobs" className="link-with-icon">
              Svi oglasi <ArrowIcon />
            </Link>
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
