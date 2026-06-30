import type { Metadata } from "next"
import { getStats } from "../../lib/api"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Izvori",
  description: "Portali koje transparent.hr prati i metodologija prikupljanja oglasa.",
}

const SOURCES = [
  {
    key: "posao",
    label: "posao.hr",
    url: "https://www.posao.hr",
    description:
      "Jedan od najvećih hrvatskih portala za zapošljavanje, aktivan od 1998. Scraper provjerava samo oglase označene s 'Plaća u oglasu' — ako oglas nema vidljivu plaću, ne ulazi u bazu.",
    method: "Playwright (headless Chromium) za listanje + httpx za detalje",
    frequency: "Svaki dan u 01:00 UTC",
  },
  {
    key: "mojposao",
    label: "mojposao.hr",
    url: "https://www.mojposao.hr",
    description:
      "Drugi veliki hrvatski job board, dio Alma Career grupe. Podaci se dohvaćaju direktno iz internog JSON API-ja koji stranica koristi za učitavanje oglasa, što daje strukturirane podatke o plaći (iznos, valuta, bruto/neto) kada ih poslodavac unese.",
    method: "httpx (JSON API /api/proxy/jobs/search) za listanje + httpx za detalje",
    frequency: "Svaki dan u 01:00 UTC",
  },
]

export default async function SourcesPage() {
  const stats = await getStats()
  const counts = Object.fromEntries((stats?.sources ?? []).map((s) => [s.source, s.cnt]))
  const estimates = Object.fromEntries((stats?.market_estimates ?? []).map((e) => [e.source, e.estimated_pct]))

  return (
    <main className="container" style={{ padding: "48px 16px", maxWidth: 760 }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Izvori</h1>
      <p className="meta" style={{ marginBottom: 40 }}>
        transparent.hr ne kreira oglase — automatski ih prikuplja s postojećih portala i prikazuje samo one s vidljivom plaćom.
      </p>

      <div className="sources-cards">
        {SOURCES.map((s) => (
          <div key={s.key} className="source-card">
            <div className="source-card__header">
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="source-card__name">
                {s.label} ↗
              </a>
              {counts[s.key] != null && (
                <span className="source-card__badge">{counts[s.key]} oglasa u bazi</span>
              )}
            </div>
            <p className="source-card__desc">{s.description}</p>
            <dl className="source-card__meta">
              <div>
                <dt>Metoda</dt>
                <dd>{s.method}</dd>
              </div>
              <div>
                <dt>Učestalost</dt>
                <dd>{s.frequency}</dd>
              </div>
              {estimates[s.key] != null && (
                <div>
                  <dt>Procjena udjela oglasa s plaćom</dt>
                  <dd>~{estimates[s.key]}% svih oglasa na portalu</dd>
                </div>
              )}
            </dl>
          </div>
        ))}
      </div>

      <div className="source-note">
        <h2>Metodologija</h2>
        <p>
          Scraper posjećuje portale svaki dan. Za svaki oglas provjerava postoji li vidljiva plaća — strukturirani iznos ili tekst koji sadrži konkretnu brojku u eurima. Oglasi bez plaće se ne spremaju. Duplikati se prepoznaju po vanjskom ID-u oglasa i ne upisuju se dvaput.
        </p>
        <p>
          Postotak transparentnosti (koliko % svih oglasa prikazuje plaću) mjeri se dnevno i bilježi na stranici <a href="/analitika">Analitika</a>.
        </p>
      </div>
    </main>
  )
}
