import { pageMetadata } from "../../../lib/seo"
import { getJobs, getStats, getTransparencyStats } from "../../../lib/api"
import { formatNumber } from "../../../lib/format"
import { LangProps } from "../../../lib/i18n"
import { SOURCE_LABELS } from "../../../lib/sourceLabels"
import TransparencyChart from "../../../components/ui/TransparencyChart"

// Stats only change once per scraper run (every few hours).
export const revalidate = 3600

const COPY = {
  hr: {
    title: "Udio oglasa s plaćom po portalima",
    description:
      "Dnevno mjerenje udjela oglasa s navedenom plaćom na hrvatskim portalima za posao, uz broj oglasa s plaćom na Transparent.hr.",
    heading: "Analitika",
    withSalary: "Oglasa s plaćom",
    portals: "Broj portala",
    historyTitle: "Postotak oglasa s plaćom — kroz vrijeme",
    historyLead: "Udio oglasa na svakom portalu koji prikazuju plaću, mjereno dnevno.",
    showTable: "Prikaži tablicu s točnim brojevima",
    date: "Datum",
  },
  en: {
    title: "Share of job ads with a salary, by job site",
    description:
      "A daily count of how many job ads on Croatian job sites list the salary, plus the number of jobs with a salary on Transparent.hr.",
    heading: "Analytics",
    withSalary: "Jobs with a salary",
    portals: "Job sites",
    historyTitle: "Share of ads with a salary — over time",
    historyLead: "The share of ads on each job site that show the salary, measured daily.",
    showTable: "Show the table with exact numbers",
    date: "Date",
  },
}

export function generateMetadata({ params }: LangProps) {
  const t = COPY[params.lang]
  return pageMetadata({ locale: params.lang, title: t.title, description: t.description, path: "/analitika" })
}

const SOURCE_ORDER = ["posao", "mojposao"]

// Rows before this date used posao.hr's old, broken page-count estimate
// (see commit f41321e — it counted the same ~135 ads up to 17x over, 33%+
// instead of the real ~5%). Filtering them out here keeps the fixed
// per-link-count method's history from 24.9. onward clean of that false
// overnight cliff, in both the chart and the table below.
const POSAO_VALID_FROM = "2026-09-24"

export default async function AnalyticsPage({ params }: LangProps) {
  const locale = params.lang
  const t = COPY[locale]
  const [stats, rawTransparency, listed] = await Promise.all([
    getStats({ revalidate: 3600 }),
    getTransparencyStats({ revalidate: 3600 }),
    // The job list's own count (an ad posted per location counts once), so
    // this matches /jobs and the home page; stats.salary_shown counts every row.
    getJobs({ page: 1, per_page: 1, salary_shown: "yes" }, { revalidate: 3600 }).catch(() => null),
  ])
  const transparency = rawTransparency.filter((r) => r.source !== "posao" || r.date >= POSAO_VALID_FROM)

  // Group by date for the table
  const dates = [...new Set(transparency.map((r) => r.date))].sort().reverse()
  const byDateSource = Object.fromEntries(
    transparency.map((r) => [`${r.date}__${r.source}`, r])
  )

  return (
    <main className="hero">
      <h1>{t.heading}</h1>

      <div className="stats">
        <div className="stat">
          <div className="stat__value">{listed ? formatNumber(listed.total, locale) : "-"}</div>
          <div className="meta">{t.withSalary}</div>
        </div>
        <div className="stat">
          <div className="stat__value">{stats?.sources?.length || 3}</div>
          <div className="meta">{t.portals}</div>
        </div>
      </div>

      {dates.length > 0 && (
        <div className="transparency-history">
          <h2>{t.historyTitle}</h2>
          <p className="meta">{t.historyLead}</p>
          <TransparencyChart data={transparency} />

          <details style={{ marginTop: 20 }}>
            <summary className="meta" style={{ cursor: "pointer" }}>
              {t.showTable}
            </summary>
            <table className="transparency-table">
              <thead>
                <tr>
                  <th>{t.date}</th>
                  {SOURCE_ORDER.map((s) => (
                    <th key={s}>{SOURCE_LABELS[s] || s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dates.map((date) => (
                  <tr key={date}>
                    <td>{date}</td>
                    {SOURCE_ORDER.map((s) => {
                      const row = byDateSource[`${date}__${s}`]
                      return (
                        <td key={s}>
                          {row ? (
                            <>
                              <strong>{row.pct}%</strong>
                              <span className="meta"> ({formatNumber(row.jobs_with_salary, locale)} / {formatNumber(row.total_jobs, locale)})</span>
                            </>
                          ) : "—"}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      )}
    </main>
  )
}
