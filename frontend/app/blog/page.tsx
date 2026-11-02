import Link from "next/link"
import { formatPostDate, getAllPosts } from "../../lib/blog"
import { pageMetadata } from "../../lib/seo"

export const metadata = pageMetadata({
  title: "Blog",
  description: "Bez uljepšavanja o zapošljavanju, plaćama, pravima radnika i nepravdama na tržištu rada u Hrvatskoj.",
  path: "/blog",
})

export default function BlogPage() {
  const posts = getAllPosts()

  return (
    <main>
      <section className="blog-hero hero-surface">
        <h1>Blog</h1>
        <p>Bez uljepšavanja o zapošljavanju, plaćama i pravima radnika.</p>
      </section>

      {posts.length === 0 ? (
        <p className="blog-empty">Prvi članci stižu uskoro.</p>
      ) : (
        <div className="blog-list">
          {posts.map((p) => (
            <article key={p.slug} className="blog-card">
              <div className="blog-card__meta">
                <time dateTime={p.date}>{formatPostDate(p.date)}</time>
                <span aria-hidden="true">·</span>
                <span>{p.readingMinutes} min čitanja</span>
                {p.draft ? <span className="blog-draft">Nacrt</span> : null}
              </div>
              <h2 className="blog-card__title">
                {/* The link covers the whole card (see .blog-card__title a::after). */}
                <Link href={`/blog/${p.slug}`}>{p.title}</Link>
              </h2>
              {p.description ? <p className="blog-card__desc">{p.description}</p> : null}
              <span className="blog-card__more">Pročitaj →</span>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
