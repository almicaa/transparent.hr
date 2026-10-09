import type { MetadataRoute } from "next"
import { getJobs } from "../lib/api"
import { getAllPosts } from "../lib/blog"
import { SITE_URL } from "../lib/seo"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/jobs`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/analitika`, changeFrequency: "weekly", priority: 0.3 },
    ...(getAllPosts().length
      ? [
          { url: `${SITE_URL}/blog`, changeFrequency: "weekly" as const, priority: 0.5 },
          ...getAllPosts().map((p) => ({
            url: `${SITE_URL}/blog/${p.slug}`,
            lastModified: p.date,
            changeFrequency: "monthly" as const,
            priority: 0.6,
          })),
        ]
      : []),
    { url: `${SITE_URL}/privatnost`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${SITE_URL}/uvjeti-koristenja`, changeFrequency: "yearly", priority: 0.1 },
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
    const jobRoutes: MetadataRoute.Sitemap = allJobs.map((job) => ({
      url: `${SITE_URL}/jobs/${job.id}`,
      lastModified: job.scraped_at || undefined,
      changeFrequency: "daily",
      priority: 0.7,
    }))
    return [...staticRoutes, ...jobRoutes]
  } catch {
    return staticRoutes
  }
}
