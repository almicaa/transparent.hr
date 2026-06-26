import type { Metadata } from "next"
import { getStats } from "../../lib/api"
import { SOURCE_LABELS } from "../../lib/sourceLabels"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Izvori",
}

export default async function SourcesPage() {
  const stats = await getStats()
  const sources = stats?.sources ?? []
  const estimates = stats?.market_estimates ?? []

  return (
    <main className="hero">
      <h1>Izvori</h1>
      <p className="hero__lead">Portali koje pratimo i koliko oglasa s plaćom imamo od svakog.</p>

      <div className="sources-list">
        {sources.map((s) => {
          const estimate = estimates.find((e) => e.source === s.source)
          return (
            <div key={s.source} className="sources-list__item">
              <div className="sources-list__name">{SOURCE_LABELS[s.source] || s.source}</div>
              <div className="sources-list__count">{s.cnt} oglasa u bazi</div>
              {estimate ? (
                <div className="meta">Procjena udjela oglasa s plaćom: ~{estimate.estimated_pct}%</div>
              ) : null}
            </div>
          )
        })}
        {sources.length === 0 ? <p className="meta">Nema podataka.</p> : null}
      </div>
    </main>
  )
}
