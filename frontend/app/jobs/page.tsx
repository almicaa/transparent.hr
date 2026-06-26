"use client"

import { useEffect, useState } from "react"
import JobBrowser from "../../components/job/JobBrowser"
import Stats from "../../components/ui/Stats"
import { getStats } from "../../lib/api"
import { Stats as StatsType } from "../../lib/types"

export default function JobsPage() {
  const [stats, setStats] = useState<StatsType | null>(null)

  useEffect(() => {
    getStats().then(setStats).catch(() => {})
  }, [])

  return (
    <main>
      <div className="site-header">
        <div className="title-block">
          <h1>Transparent.hr</h1>
          <p>Svi oglasi s transparentnom plaćom na jednom mjestu</p>
        </div>
        <Stats
          total={stats?.total ?? 0}
          totalWithSalary={stats?.salary_shown ?? 0}
          portals={stats?.sources?.length ?? 0}
        />
      </div>

      <JobBrowser />
    </main>
  )
}
