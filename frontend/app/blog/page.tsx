import BlogCard from "../../components/blog/BlogCard"
import { getAllPosts } from "../../lib/blog"
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
            <BlogCard key={p.slug} post={p} />
          ))}
        </div>
      )}
    </main>
  )
}
