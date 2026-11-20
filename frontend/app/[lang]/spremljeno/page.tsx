import { LangProps } from "../../../lib/i18n"
import { pageMetadata } from "../../../lib/seo"
import SavedJobs from "../../../components/job/SavedJobs"

const COPY = {
  hr: {
    title: "Spremljeni oglasi",
    description: "Oglasi koje si spremio u ovom pregledniku, bez registracije.",
    lead: "Spremljeni su samo u ovom pregledniku, bez registracije.",
  },
  en: {
    title: "Saved jobs",
    description: "Jobs you saved in this browser, no sign-up needed.",
    lead: "They're saved in this browser only, no sign-up needed.",
  },
}

// Per-visitor list from browser storage; nothing here for search engines.
export function generateMetadata({ params }: LangProps) {
  const t = COPY[params.lang]
  return pageMetadata({ locale: params.lang, title: t.title, description: t.description, path: "/spremljeno", index: false })
}

export default function SavedPage({ params }: LangProps) {
  const t = COPY[params.lang]
  return (
    <main>
      <section className="blog-hero hero-surface">
        <h1>{t.title}</h1>
        <p>{t.lead}</p>
      </section>
      <SavedJobs />
    </main>
  )
}
