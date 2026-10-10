import type { Metadata } from "next"
import SavedJobs from "../../components/job/SavedJobs"

export const metadata: Metadata = {
  title: "Spremljeni oglasi",
  // Per-visitor list from browser storage; nothing here for search engines.
  robots: { index: false },
}

export default function SavedPage() {
  return (
    <main>
      <section className="blog-hero hero-surface">
        <h1>Spremljeni oglasi</h1>
        <p>Spremljeni su samo u ovom pregledniku, bez registracije.</p>
      </section>
      <SavedJobs />
    </main>
  )
}
