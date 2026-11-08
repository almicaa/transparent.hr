import { pageMetadata } from "../../lib/seo"
import CvMatcher from "../../components/cv/CvMatcher"

export const metadata = pageMetadata({
  title: "Pametna pretraga po tvom CV-u",
  description: "Učitaj životopis i AI će među oglasima s plaćom izabrati one koji ti najbolje odgovaraju. CV ne spremamo.",
  path: "/cv",
})

export default function CvPage() {
  return (
    <main>
      <section className="blog-hero hero-surface">
        <h1>Pametna pretraga po tvom CV-u</h1>
        <p>Učitaj životopis, a AI će među svim oglasima s plaćom izabrati one koji ti najbolje odgovaraju.</p>
      </section>
      <CvMatcher />
    </main>
  )
}
