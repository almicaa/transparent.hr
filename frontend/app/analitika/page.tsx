import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Analitika",
}

export default function AnalyticsPage() {
  return (
    <main className="hero">
      <h1>Analitika</h1>
      <p className="hero__lead">
        Uskoro: grafovi i trendovi plaća po gradu, kategoriji i portalu — na temelju oglasa koje indeksiramo.
      </p>
    </main>
  )
}
