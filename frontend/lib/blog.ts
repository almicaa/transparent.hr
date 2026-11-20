import fs from "node:fs"
import path from "node:path"
import { marked, Renderer } from "marked"
import { DEFAULT_LOCALE, INTL_LOCALE, Locale, localePath } from "./i18n"

// Posts are Markdown files with a small front-matter block (title,
// description, date, optional draft): Croatian ones in content/blog/<slug>.md,
// English ones in content/blog/en/<slug>.md. An English post names the
// Croatian post it translates with "hr: <slug>". Files starting with "_"
// (like the writing guide) are skipped.
const BLOG_ROOT = path.join(process.cwd(), "content", "blog")
const BLOG_DIRS: Record<Locale, string> = { hr: BLOG_ROOT, en: path.join(BLOG_ROOT, "en") }
const WORDS_PER_MINUTE = 200

// Links to other sites open in a new tab; links within transparent.hr don't.
const defaultRenderer = new Renderer()
marked.use({
  renderer: {
    link(href, title, text) {
      const html = defaultRenderer.link(href, title, text)
      return /^https?:\/\//.test(href) ? html.replace(/^<a /, '<a target="_blank" rel="noopener" ') : html
    },
  },
})

export interface PostMeta {
  locale: Locale
  slug: string
  title: string
  description: string
  /** ISO date, "2026-10-10". */
  date: string
  draft: boolean
  readingMinutes: number
  /** For an English post: the slug of the Croatian original. */
  hrSlug: string | null
}

export interface Post extends PostMeta {
  html: string
}

/** Drafts show up in local dev (marked "Nacrt") but never in production. */
const SHOW_DRAFTS = process.env.NODE_ENV !== "production"

function parseFrontMatter(source: string): { data: Record<string, string>; body: string } {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { data: {}, body: source }
  const data: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const i = line.indexOf(":")
    if (i === -1) continue
    data[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "")
  }
  return { data, body: match[2] }
}

function readPost(locale: Locale, slug: string): Post | null {
  const file = path.join(BLOG_DIRS[locale], `${slug}.md`)
  if (!fs.existsSync(file)) return null
  const { data, body } = parseFrontMatter(fs.readFileSync(file, "utf8"))
  const draft = data.draft === "true"
  if (draft && !SHOW_DRAFTS) return null
  return {
    locale,
    slug,
    title: data.title ?? slug,
    description: data.description ?? "",
    date: data.date ?? "",
    draft,
    readingMinutes: Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / WORDS_PER_MINUTE)),
    hrSlug: locale === "en" ? data.hr || null : null,
    html: marked.parse(body, { async: false }) as string,
  }
}

export function getAllPosts(locale: Locale = DEFAULT_LOCALE): PostMeta[] {
  const dir = BLOG_DIRS[locale]
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .map((f) => readPost(locale, f.replace(/\.md$/, "")))
    .filter((p): p is Post => p !== null)
    .map(({ html: _html, ...meta }) => meta)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function getPost(locale: Locale, slug: string): Post | null {
  if (slug.startsWith("_") || !/^[a-z0-9-]+$/.test(slug)) return null
  return readPost(locale, slug)
}

/** Public path of a post in each language it's published in (for hreflang). */
export function postPaths(post: PostMeta): Partial<Record<Locale, string>> {
  const hrSlug = post.locale === "hr" ? post.slug : post.hrSlug
  const enSlug = post.locale === "en" ? post.slug : getAllPosts("en").find((p) => p.hrSlug === post.slug)?.slug
  const paths: Partial<Record<Locale, string>> = {}
  if (hrSlug && getPost("hr", hrSlug)) paths.hr = `/blog/${hrSlug}`
  if (enSlug) paths.en = localePath("en", `/blog/${enSlug}`)
  return paths
}

/** "10. listopada 2026." / "10 October 2026" */
export function formatPostDate(date: string, locale: Locale = DEFAULT_LOCALE): string {
  const d = new Date(`${date}T12:00:00`)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString(INTL_LOCALE[locale], { day: "numeric", month: "long", year: "numeric" })
}
