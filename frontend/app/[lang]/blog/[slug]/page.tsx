import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { formatPostDate, getAllPosts, getPost, postPaths } from "../../../../lib/blog"
import { Locale, LOCALES, localePath } from "../../../../lib/i18n"
import { absoluteUrl, pageMetadata, SITE_NAME, SITE_URL } from "../../../../lib/seo"

// Only the posts that exist at build time; anything else is a 404.
export const dynamicParams = false

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => getAllPosts(lang).map((p) => ({ lang, slug: p.slug })))
}

type Props = { params: { lang: Locale; slug: string } }

const COPY = {
  hr: {
    notFound: "Članak nije pronađen",
    back: "← Svi članci",
    minutes: (n: number) => `${n} min čitanja`,
    draft: "Nacrt — ne vidi se na produkciji",
    cta: "Tražiš posao s jasno navedenom plaćom?",
    ctaButton: "Pregledaj oglase →",
  },
  en: {
    notFound: "Article not found",
    back: "← All articles",
    minutes: (n: number) => `${n} min read`,
    draft: "Draft — not shown in production",
    cta: "Looking for a job with the salary clearly listed?",
    ctaButton: "Browse jobs →",
  },
}

export function generateMetadata({ params }: Props): Metadata {
  const post = getPost(params.lang, params.slug)
  if (!post) return { title: COPY[params.lang].notFound }
  return pageMetadata({
    locale: params.lang,
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    paths: postPaths(post),
    type: "article",
    publishedTime: post.date,
    index: !post.draft,
  })
}

export default function BlogPostPage({ params }: Props) {
  const locale = params.lang
  const t = COPY[locale]
  const post = getPost(locale, params.slug)
  if (!post) notFound()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    inLanguage: locale,
    mainEntityOfPage: absoluteUrl(localePath(locale, `/blog/${post.slug}`)),
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  }

  return (
    <main className="blog-post">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href={localePath(locale, "/blog")} className="blog-post__back">
        {t.back}
      </Link>
      <header className="blog-post__header">
        <div className="blog-card__meta">
          <time dateTime={post.date}>{formatPostDate(post.date, locale)}</time>
          <span aria-hidden="true">·</span>
          <span>{t.minutes(post.readingMinutes)}</span>
          {post.draft ? <span className="blog-draft">{t.draft}</span> : null}
        </div>
        <h1>{post.title}</h1>
        {post.description ? <p className="blog-post__lead">{post.description}</p> : null}
      </header>
      {/* Posts are our own Markdown files from the repo, not user input. */}
      <div className="prose" dangerouslySetInnerHTML={{ __html: post.html }} />
      <aside className="blog-post__cta">
        <p>{t.cta}</p>
        <Link href={localePath(locale, "/jobs")} className="why-tile__button">
          {t.ctaButton}
        </Link>
      </aside>
    </main>
  )
}
