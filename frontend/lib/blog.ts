import fs from "node:fs"
import path from "node:path"
import { marked, Renderer } from "marked"

// Posts are Markdown files in content/blog/<slug>.md with a small front-matter
// block (title, description, date, optional draft). Files starting with "_"
// (like the writing guide) are skipped.
const BLOG_DIR = path.join(process.cwd(), "content", "blog")
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
  slug: string
  title: string
  description: string
  /** ISO date, "2026-10-10". */
  date: string
  draft: boolean
  readingMinutes: number
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

function readPost(slug: string): Post | null {
  const file = path.join(BLOG_DIR, `${slug}.md`)
  if (!fs.existsSync(file)) return null
  const { data, body } = parseFrontMatter(fs.readFileSync(file, "utf8"))
  const draft = data.draft === "true"
  if (draft && !SHOW_DRAFTS) return null
  return {
    slug,
    title: data.title ?? slug,
    description: data.description ?? "",
    date: data.date ?? "",
    draft,
    readingMinutes: Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / WORDS_PER_MINUTE)),
    html: marked.parse(body, { async: false }) as string,
  }
}

export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return []
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .map((f) => readPost(f.replace(/\.md$/, "")))
    .filter((p): p is Post => p !== null)
    .map(({ html: _html, ...meta }) => meta)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function getPost(slug: string): Post | null {
  if (slug.startsWith("_") || !/^[a-z0-9-]+$/.test(slug)) return null
  return readPost(slug)
}

/** "10. listopada 2026." */
export function formatPostDate(date: string): string {
  const d = new Date(`${date}T12:00:00`)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString("hr-HR", { day: "numeric", month: "long", year: "numeric" })
}
