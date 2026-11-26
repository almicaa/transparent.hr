import Link from "next/link"
import BlogCard from "../../components/blog/BlogCard"
import HeroSearch from "../../components/home/HeroSearch"
import HeroIllustration from "../../components/ui/HeroIllustration"
import { ArrowIcon } from "../../components/ui/icons"
import { getFilters, getJobs, getStats } from "../../lib/api"
import { getAllPosts } from "../../lib/blog"
import { formatNumber } from "../../lib/format"
import { LangProps, localePath } from "../../lib/i18n"
import { HOME_DESCRIPTION, HOME_TITLE, pageMetadata } from "../../lib/seo"

export const revalidate = 3600

// Colour of each home-page blog card, in order.
const BLOG_TONES = ["dark", "orange", "mint"]

export function generateMetadata({ params }: LangProps) {
  return pageMetadata({
    locale: params.lang,
    title: HOME_TITLE[params.lang],
    description: HOME_DESCRIPTION[params.lang],
    path: "/",
    titleTemplate: false,
  })
}

const COPY = {
  hr: {
    tiles: [
      {
        label: "oglasa s vidljivom plaćom",
        title: "Samo oglasi koji pričaju.",
        text: "Svaki oglas ovdje ima broj. Jer \"po dogovoru\" nije odgovor.",
      },
      {
        label: "portala, jedna pretraga",
        title: "Skupljeno s cijele scene.",
        text: "Posao.hr, MojPosao i ostali — mi filtriramo, ti biraš.",
      },
      {
        label: "registracija i newslettera",
        title: "Otvori, filtriraj, apliciraj.",
        text: "Bez registracije. Bez newslettera. Bez ičega suvišnog.",
      },
    ],
    titleStart: "Oglasi za posao s",
    titleAccent: "transparentnom plaćom",
    lead: "Vrijeme je za ne gubiti više vremena na oglase bez jasno vidljive plaće.",
    seeAllCount: (n: string) => `Pogledaj svih ${n} oglasa`,
    seeAll: "Pogledaj sve oglase",
    why: "Zašto transparent.hr",
    ctaText: "Zanima te koliko se plaća u tvojoj struci? Pregledaj oglase po grani, gradu i plaći.",
    ctaButton: "Pregledaj oglase",
    smartBadge: "Novo · Pametna pretraga",
    smartTitle: "Ne znaš što tražiti? Učitaj CV.",
    smartText:
      "AI pročita sve oglase s plaćom, usporedi ih s tvojim iskustvom i za svaki posao napiše zašto ti paše. Bez registracije, a CV ne spremamo.",
    smartSteps: [
      "Učitaj CV u PDF-u ili Wordu",
      "AI usporedi tvoje iskustvo s uvjetima iz oglasa",
      "Dobiješ popis poslova i za svaki zašto ti paše",
    ],
    smartButton: "Isprobaj pametnu pretragu",
    fromBlog: "Iz bloga",
    allPosts: "Svi članci",
  },
  en: {
    tiles: [
      {
        label: "jobs with the salary shown",
        title: "Only ads that tell you.",
        text: "Every ad here has a number. Because \"negotiable\" is not an answer.",
      },
      {
        label: "job sites, one search",
        title: "Gathered from across the market.",
        text: "Posao.hr, MojPosao and others — we filter, you choose.",
      },
      {
        label: "sign-ups and newsletters",
        title: "Open, filter, apply.",
        text: "No sign-up. No newsletter. Nothing you don't need.",
      },
    ],
    titleStart: "Jobs in Croatia with",
    titleAccent: "the salary up front",
    lead: "Stop wasting time on job ads that won't tell you what they pay.",
    seeAllCount: (n: string) => `See all ${n} jobs`,
    seeAll: "See all jobs",
    why: "Why transparent.hr",
    ctaText: "Curious what your line of work pays? Browse jobs by sector, city and salary.",
    ctaButton: "Browse jobs",
    smartBadge: "New · Smart search",
    smartTitle: "Not sure what to look for? Upload your CV.",
    smartText:
      "AI reads every job with a salary, compares them with your experience and tells you why each one fits. No sign-up, and we don't keep your CV.",
    smartSteps: [
      "Upload your CV as a PDF or Word file",
      "AI compares your experience with what the ads ask for",
      "You get a list of jobs, each with why it fits you",
    ],
    smartButton: "Try smart search",
    fromBlog: "From the blog",
    allPosts: "All articles",
  },
}

const TILE_TONES = ["teal", "mint", "orange"]

async function getHomeData() {
  const [stats, filterData, listed] = await Promise.all([
    getStats({ revalidate: 3600 }).catch(() => null),
    getFilters({ revalidate: 3600 }).catch(() => undefined),
    // Same count the job list shows: ads posted once per location count once.
    getJobs({ page: 1, per_page: 1, salary_shown: "yes" }, { revalidate: 3600 }).catch(() => null),
  ])
  return { stats, filterData, listedTotal: listed?.total ?? null }
}

export default async function HomePage({ params }: LangProps) {
  const locale = params.lang
  const t = COPY[locale]
  const { stats, filterData, listedTotal } = await getHomeData()
  // Only the job list's own count: stats.salary_shown counts every ad, before
  // per-location duplicates are grouped, so it never matches /jobs. Without
  // it the tile says "100 %" and the button has no number.
  const withSalary = listedTotal ?? 0
  const portals = stats?.sources?.length || 3
  const latestPosts = getAllPosts(locale).slice(0, 3)

  const values = [withSalary ? formatNumber(withSalary, locale) : locale === "en" ? "100%" : "100 %", String(portals), "0"]
  const tiles = t.tiles.map((tile, i) => ({ ...tile, value: values[i], tone: TILE_TONES[i] }))

  return (
    <main>
      <section className="hero hero--home hero-surface">
        <HeroIllustration />
        <h1>
          {t.titleStart} <span className="hero__title-accent">{t.titleAccent}</span>
        </h1>
        <p className="hero__lead">{t.lead}</p>
        <div className="hero__search">
          <HeroSearch filterData={filterData} />
        </div>
        <Link href={localePath(locale, "/jobs")} className="hero__all link-with-icon">
          {withSalary ? t.seeAllCount(formatNumber(withSalary, locale)) : t.seeAll}
          <ArrowIcon />
        </Link>
      </section>

      <section className="home-section">
        <h2>{t.why}</h2>
        <div className="why-grid">
          {tiles.map((tile) => (
            <div key={tile.title} className="why-tile">
              <div className={`why-tile__block why-tile__block--${tile.tone}`}>
                <span className="why-tile__value">{tile.value}</span>
                <span className="why-tile__label">{tile.label}</span>
              </div>
              <div className="why-tile__body">
                <h3>{tile.title}</h3>
                <p>{tile.text}</p>
              </div>
            </div>
          ))}
          <div className="why-tile why-tile--cta">
            <svg className="why-tile__mark" width="34" height="34" viewBox="0 0 38 38" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="20" height="20" rx="6" stroke="#085050" strokeWidth="2.4" />
              <rect x="13" y="13" width="20" height="20" rx="6" fill="#F08A24" fillOpacity="0.7" />
            </svg>
            <p>{t.ctaText}</p>
            <Link href={localePath(locale, "/jobs")} className="why-tile__button">
              {t.ctaButton}
              <ArrowIcon />
            </Link>
          </div>
          <div className="why-tile why-tile--smart">
            <div className="why-smart__copy">
              <span className="why-tile__badge">{t.smartBadge}</span>
              <h3>{t.smartTitle}</h3>
              <p>{t.smartText}</p>
            </div>
            <div className="why-smart__action">
              <ol className="why-smart__steps">
                {t.smartSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <Link href={localePath(locale, "/cv")} className="why-tile__button">
                {t.smartButton}
                <ArrowIcon />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {latestPosts.length ? (
        <section className="home-section">
          <div className="home-section__header">
            <h2>{t.fromBlog}</h2>
            <Link href={localePath(locale, "/blog")} className="link-with-icon">
              {t.allPosts}
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
