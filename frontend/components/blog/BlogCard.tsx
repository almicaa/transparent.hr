import Link from "next/link"
import { formatPostDate, PostMeta } from "../../lib/blog"
import { localePath } from "../../lib/i18n"

const COPY = {
  hr: { minutes: (n: number) => `${n} min čitanja`, draft: "Nacrt", more: "Pročitaj →" },
  en: { minutes: (n: number) => `${n} min read`, draft: "Draft", more: "Read →" },
}

/** One post in a list of posts: the blog page and the home page. */
export default function BlogCard({
  post,
  headingLevel = 2,
  className,
}: {
  post: PostMeta
  headingLevel?: 2 | 3
  /** Extra classes, e.g. a colour tone on the home page. */
  className?: string
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3"
  const t = COPY[post.locale]
  return (
    <article className={className ? `blog-card ${className}` : "blog-card"}>
      <div className="blog-card__meta">
        <time dateTime={post.date}>{formatPostDate(post.date, post.locale)}</time>
        <span aria-hidden="true">·</span>
        <span>{t.minutes(post.readingMinutes)}</span>
        {post.draft ? <span className="blog-draft">{t.draft}</span> : null}
      </div>
      <Heading className="blog-card__title">
        {/* The link covers the whole card (see .blog-card__title a::after). */}
        <Link href={localePath(post.locale, `/blog/${post.slug}`)}>{post.title}</Link>
      </Heading>
      {post.description ? <p className="blog-card__desc">{post.description}</p> : null}
      <span className="blog-card__more">{t.more}</span>
    </article>
  )
}
