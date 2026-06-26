import Link from "next/link"
import { getJobs } from "../lib/api"
import JobCard from "../components/job/JobCard"
import HeroIllustration from "../components/ui/HeroIllustration"
import { ArrowIcon, CheckIcon, EuroIcon, LayersIcon } from "../components/ui/icons"

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
