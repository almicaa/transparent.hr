import BlogCard from "../../../components/blog/BlogCard"
import { getAllPosts } from "../../../lib/blog"
import { LangProps } from "../../../lib/i18n"
import { pageMetadata } from "../../../lib/seo"

const COPY = {
  hr: {
    description: "Bez uljepšavanja o zapošljavanju, plaćama, pravima radnika i nepravdama na tržištu rada u Hrvatskoj.",
    lead: "Bez uljepšavanja o zapošljavanju, plaćama i pravima radnika.",
    empty: "Prvi članci stižu uskoro.",
  },
  en: {
    description: "Straight talk about hiring, pay, workers' rights and what's unfair in Croatia's job market.",
    lead: "Straight talk about hiring, pay and workers' rights in Croatia.",
    empty: "The first articles are coming soon.",
  },
}

export function generateMetadata({ params }: LangProps) {
  return pageMetadata({ locale: params.lang, title: "Blog", description: COPY[params.lang].description, path: "/blog" })
}

export default function BlogPage({ params }: LangProps) {
  const t = COPY[params.lang]
  const posts = getAllPosts(params.lang)

  return (
    <main>
      <section className="blog-hero hero-surface">
        <h1>Blog</h1>
        <p>{t.lead}</p>
      </section>

      {posts.length === 0 ? (
        <p className="blog-empty">{t.empty}</p>
      ) : (
        <div className="blog-list">
          {posts.map((p) => (
            <BlogCard key={p.slug} post={p} />
          ))}
        </div>
      )}
    </main>
  )
}
