import JobBrowser from "../components/job/JobBrowser"
import HeroIllustration from "../components/ui/HeroIllustration"
import { CheckIcon, EuroIcon, LayersIcon } from "../components/ui/icons"
import { getFilters, getJobs } from "../lib/api"

export const revalidate = 300

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

async function getHomeData() {
  try {
    const [jobsRes, filtersRes] = await Promise.all([
      getJobs({ page: 1, per_page: 20, salary_shown: "yes", sort: "newest" }, { revalidate: 300 }),
      getFilters({ revalidate: 300 }),
    ])
    return { jobs: jobsRes.jobs, total: jobsRes.total, typical: jobsRes.typical_neto_salary, filterData: filtersRes }
  } catch {
    return { jobs: [], total: 0, typical: null, filterData: undefined }
  }
}

export default async function HomePage() {
  const { jobs, total, typical, filterData } = await getHomeData()

  return (
    <main>
      <section className="hero">
        <HeroIllustration />
        <h1>
          Oglasi za posao s{" "}
          <span className="hero__title-accent">transparentnom plaćom</span>
        </h1>
        <p className="hero__lead">
          Vrijeme je za ne gubiti više vremena na oglase bez jasno vidljive plaće.
        </p>
      </section>

      <section className="home-section">
        <JobBrowser
          initialJobs={jobs}
          initialTotal={total}
          initialFilterData={filterData}
          initialTypicalSalary={typical}
        />
      </section>

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
