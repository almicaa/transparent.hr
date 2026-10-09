import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { formatPostDate, getAllPosts, getPost } from "../../../lib/blog"
import { SITE_NAME, SITE_URL } from "../../../lib/seo"

// Only the posts that exist at build time; anything else is a 404.
export const dynamicParams = false

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPost(params.slug)
  if (!post) return { title: "Članak nije pronađen" }
  const url = `${SITE_URL}/blog/${post.slug}`
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      siteName: SITE_NAME,
      type: "article",
      publishedTime: post.date,
    },
    twitter: { card: "summary", title: post.title, description: post.description },
    robots: post.draft ? { index: false } : undefined,
  }
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug)
  if (!post) notFound()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    inLanguage: "hr",
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  }

  return (
    <main className="blog-post">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/blog" className="blog-post__back">
        ← Svi članci
      </Link>
      <header className="blog-post__header">
        <div className="blog-card__meta">
          <time dateTime={post.date}>{formatPostDate(post.date)}</time>
          <span aria-hidden="true">·</span>
          <span>{post.readingMinutes} min čitanja</span>
          {post.draft ? <span className="blog-draft">Nacrt — ne vidi se na produkciji</span> : null}
        </div>
        <h1>{post.title}</h1>
        {post.description ? <p className="blog-post__lead">{post.description}</p> : null}
      </header>
      {/* Posts are our own Markdown files from the repo, not user input. */}
      <div className="prose" dangerouslySetInnerHTML={{ __html: post.html }} />
      <aside className="blog-post__cta">
        <p>Tražiš posao s jasno navedenom plaćom?</p>
        <Link href="/jobs" className="why-tile__button">
          Pregledaj oglase →
        </Link>
      </aside>
    </main>
  )
}
