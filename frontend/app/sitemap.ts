import type { MetadataRoute } from "next"
import { getJobs } from "../lib/api"
import { SITE_URL } from "../lib/seo"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/jobs`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/analitika`, changeFrequency: "weekly", priority: 0.3 },
    { url: `${SITE_URL}/izvori`, changeFrequency: "weekly", priority: 0.3 },
    { url: `${SITE_URL}/privatnost`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${SITE_URL}/uvjeti-koristenja`, changeFrequency: "yearly", priority: 0.1 },
  ]

  try {
    const { jobs } = await getJobs({ per_page: 100, sort: "newest", salary_shown: "yes" })
    const jobRoutes: MetadataRoute.Sitemap = jobs.map((job) => ({
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
