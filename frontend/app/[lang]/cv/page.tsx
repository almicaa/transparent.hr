import { LangProps } from "../../../lib/i18n"
import { pageMetadata } from "../../../lib/seo"
import CvMatcher from "../../../components/cv/CvMatcher"

const COPY = {
  hr: {
    title: "Pametna pretraga po tvom CV-u",
    description: "Učitaj životopis i AI će među oglasima s plaćom izabrati one koji ti najbolje odgovaraju. CV ne spremamo.",
    lead: "Učitaj životopis, a AI će među svim oglasima s plaćom izabrati one koji ti najbolje odgovaraju.",
  },
  en: {
    title: "Smart search with your CV",
    description: "Upload your CV and AI picks the jobs with a listed salary that fit you best. We don't keep your CV.",
    lead: "Upload your CV and AI will pick, from every job with a listed salary, the ones that fit you best.",
  },
}

export function generateMetadata({ params }: LangProps) {
  const t = COPY[params.lang]
  return pageMetadata({ locale: params.lang, title: t.title, description: t.description, path: "/cv" })
}

export default function CvPage({ params }: LangProps) {
  const t = COPY[params.lang]
  return (
    <main>
      <section className="blog-hero hero-surface">
        <h1>{t.title}</h1>
        <p>{t.lead}</p>
      </section>
      <CvMatcher />
    </main>
  )
}
