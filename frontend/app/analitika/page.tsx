import Link from "next/link"
import type { Metadata } from "next"
import { getStats } from "../../lib/api"
import { ArrowIcon } from "../../components/ui/icons"
import { SOURCE_LABELS } from "../../lib/sourceLabels"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Analitika",
}

export default async function AnalyticsPage() {
  const stats = await getStats()
  const estimates = stats?.market_estimates ?? []

  return (
    <main className="hero">
      <h1>Analitika</h1>
      <p className="hero__lead">
        Uskoro: grafovi i trendovi plaća po gradu, kategoriji i portalu — na temelju oglasa koje indeksiramo.
      </p>

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
    </main>
  )
}
