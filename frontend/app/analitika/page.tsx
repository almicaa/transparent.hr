import Link from "next/link"
import type { Metadata } from "next"
import { getStats, getTransparencyStats } from "../../lib/api"
import { ArrowIcon } from "../../components/ui/icons"
import { SOURCE_LABELS } from "../../lib/sourceLabels"
import TransparencyChart from "../../components/ui/TransparencyChart"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Analitika",
}

// posao.hr is excluded here too — see the comment in TransparencyChart.tsx.
// Its salary_stats and market_estimates numbers both come from page-count
// extrapolation methods that disagree with each other by ~7x on the same
// day, so neither is trustworthy until the counting method is fixed.
const SOURCE_ORDER = ["mojposao"]

export default async function AnalyticsPage() {
  const [stats, transparency] = await Promise.all([getStats(), getTransparencyStats()])

  // Group by date for the table
  const dates = [...new Set(transparency.filter((r) => r.source === "mojposao").map((r) => r.date))]
    .sort()
    .reverse()
  const byDateSource = Object.fromEntries(
    transparency.map((r) => [`${r.date}__${r.source}`, r])
  )

  return (
    <main className="hero">
      <h1>Analitika</h1>

      <div className="stats">
        <div className="stat">
          <div className="stat__value">{stats?.salary_shown ?? "-"}</div>
          <div className="meta">Oglasa s plaćom u bazi</div>
        </div>
        <Link href="/izvori" className="stat">
          <div className="stat__value">{stats?.sources?.length ?? "-"}</div>
          <div className="meta meta--link">
            Broj portala <ArrowIcon />
          </div>
        </Link>
      </div>

      {dates.length > 0 && (
        <div className="transparency-history">
          <h2>Postotak oglasa s plaćom — kroz vrijeme</h2>
          <p className="meta">Udio oglasa na svakom portalu koji prikazuju plaću, mjereno dnevno.</p>
          <TransparencyChart data={transparency} />

          <details style={{ marginTop: 20 }}>
            <summary className="meta" style={{ cursor: "pointer" }}>
              Prikaži tablicu s točnim brojevima
            </summary>
            <table className="transparency-table">
              <thead>
                <tr>
                  <th>Datum</th>
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
                              <span className="meta"> ({row.jobs_with_salary.toLocaleString()} / {row.total_jobs.toLocaleString()})</span>
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
