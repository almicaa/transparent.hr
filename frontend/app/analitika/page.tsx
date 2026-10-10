import type { Metadata } from "next"
import { getStats, getTransparencyStats } from "../../lib/api"
import { SOURCE_LABELS } from "../../lib/sourceLabels"
import TransparencyChart from "../../components/ui/TransparencyChart"

// Stats only change once per scraper run (every few hours).
export const revalidate = 600

export const metadata: Metadata = {
  title: "Analitika",
}

const SOURCE_ORDER = ["posao", "mojposao"]

// Rows before this date used posao.hr's old, broken page-count estimate
// (see commit f41321e — it counted the same ~135 ads up to 17x over, 33%+
// instead of the real ~5%). Filtering them out here keeps the fixed
// per-link-count method's history from 24.9. onward clean of that false
// overnight cliff, in both the chart and the table below.
const POSAO_VALID_FROM = "2026-09-24"

export default async function AnalyticsPage() {
  const [stats, rawTransparency] = await Promise.all([getStats({ revalidate: 600 }), getTransparencyStats({ revalidate: 600 })])
  const transparency = rawTransparency.filter((r) => r.source !== "posao" || r.date >= POSAO_VALID_FROM)

  // Group by date for the table
  const dates = [...new Set(transparency.map((r) => r.date))].sort().reverse()
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
        <div className="stat">
          <div className="stat__value">{stats?.sources?.length ?? "-"}</div>
          <div className="meta">Broj portala</div>
        </div>
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
