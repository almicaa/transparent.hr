import { pageMetadata } from "../../lib/seo"
import SavedJobs from "../../components/job/SavedJobs"

// Per-visitor list from browser storage; nothing here for search engines.
export const metadata = pageMetadata({
  title: "Spremljeni oglasi",
  description: "Oglasi koje si spremio u ovom pregledniku, bez registracije.",
  path: "/spremljeno",
  index: false,
})

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
