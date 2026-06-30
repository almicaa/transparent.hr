import Link from "next/link"
import type { Metadata } from "next"
import { getStats, getTransparencyStats } from "../../lib/api"
import { ArrowIcon } from "../../components/ui/icons"
import { SOURCE_LABELS } from "../../lib/sourceLabels"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Analitika",
}

const SOURCE_ORDER = ["posao", "mojposao"]

export default async function AnalyticsPage() {
  const [stats, transparency] = await Promise.all([getStats(), getTransparencyStats()])
  const estimates = stats?.market_estimates ?? []

  // Group by date for the table
  const dates = [...new Set(transparency.map((r) => r.date))].sort().reverse()
  const byDateSource = Object.fromEntries(
    transparency.map((r) => [`${r.date}__${r.source}`, r])
  )

  return (
    <main className="hero">
      <h1>Analitika</h1>
      <p className="hero__lead">Dnevni podaci o transparentnosti plaća po portalu.</p>

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

      {dates.length > 0 && (
        <div className="transparency-history">
          <h2>Postotak oglasa s plaćom — dnevno</h2>
          <p className="meta">Graf dolazi kad nakupimo više dana podataka. Za sada, tablica:</p>
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
        </div>
      )}
    </main>
  )
}
