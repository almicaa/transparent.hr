import type { MetadataRoute } from "next"
import { getJobs } from "../lib/api"
import { getAllPosts, postPaths } from "../lib/blog"
import { Locale, LOCALES, localePath } from "../lib/i18n"
import { absoluteUrl } from "../lib/seo"

type Entry = MetadataRoute.Sitemap[number]

/** One entry per language, each listing all of them as alternates (hreflang). */
function localized(
  paths: Partial<Record<Locale, string>>,
  extra: Omit<Entry, "url" | "alternates">,
): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(Object.entries(paths).map(([l, p]) => [l, absoluteUrl(p!)]))
  const hasTranslation = Object.keys(languages).length > 1
  return Object.values(paths).map((p) => ({
    url: absoluteUrl(p!),
    ...extra,
    ...(hasTranslation ? { alternates: { languages } } : {}),
  }))
}

/** A page that exists in every language at its localized path. */
function page(path: string, extra: Omit<Entry, "url" | "alternates">): MetadataRoute.Sitemap {
  return localized(Object.fromEntries(LOCALES.map((l) => [l, localePath(l, path)])), extra)
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Croatian posts plus English posts that aren't a translation of one (those come with their original).
  const posts = [...getAllPosts("hr"), ...getAllPosts("en").filter((p) => !p.hrSlug || !postPaths(p).hr)]
  const anyPosts = LOCALES.some((l) => getAllPosts(l).length)

  const staticRoutes: MetadataRoute.Sitemap = [
    ...page("/", { changeFrequency: "daily", priority: 1 }),
    ...page("/jobs", { changeFrequency: "hourly", priority: 0.9 }),
    ...page("/cv", { changeFrequency: "monthly", priority: 0.6 }),
    ...page("/analitika", { changeFrequency: "weekly", priority: 0.3 }),
    ...page("/o-nama", { changeFrequency: "yearly", priority: 0.4 }),
    ...(anyPosts
      ? [
          ...page("/blog", { changeFrequency: "weekly", priority: 0.5 }),
          ...posts.flatMap((p) =>
            localized(postPaths(p), { lastModified: p.date, changeFrequency: "monthly", priority: 0.6 }),
          ),
        ]
      : []),
    ...page("/privatnost", { changeFrequency: "yearly", priority: 0.1 }),
    ...page("/uvjeti-koristenja", { changeFrequency: "yearly", priority: 0.1 }),
  ]

  const MAX_PAGES = 20 // safety cap: 20 * 100 = 2000 jobs

  try {
    const perPage = 100
    const first = await getJobs({ page: 1, per_page: perPage, sort: "newest", salary_shown: "yes" })
    const pageCount = Math.min(Math.ceil(first.total / perPage), MAX_PAGES)

    const rest = await Promise.all(
      Array.from({ length: Math.max(0, pageCount - 1) }, (_, i) =>
        getJobs({ page: i + 2, per_page: perPage, sort: "newest", salary_shown: "yes" })
      )
    )

    const allJobs = [first, ...rest].flatMap((res) => res.jobs)
    const jobRoutes = allJobs.flatMap((job) =>
      page(`/jobs/${job.id}`, { lastModified: job.scraped_at || undefined, changeFrequency: "daily", priority: 0.7 }),
    )
    return [...staticRoutes, ...jobRoutes]
  } catch {
    return staticRoutes
  }
}
