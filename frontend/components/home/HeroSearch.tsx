"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Finder from "../filters/Finder"
import { filtersToQuery } from "../../lib/filterUrl"
import { EMPTY_FILTERS, Filters as FilterData, JobFilters } from "../../lib/types"

/** The home page search: same finder as the job list, but submitting opens /jobs with those filters. */
export default function HeroSearch({ filterData }: { filterData?: FilterData }) {
  const router = useRouter()
  const [filters, setFilters] = useState<JobFilters>(EMPTY_FILTERS)

  return (
    <Finder
      filters={filters}
      onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
      onSubmit={() => router.push(`/jobs${filtersToQuery({ ...filters, search: filters.search.trim() })}`)}
      categoryOptions={filterData?.category_options ?? []}
      regionOptions={filterData?.region_options ?? []}
      cityOptions={filterData?.city_options ?? []}
      countryOptions={filterData?.country_options ?? []}
    />
  )
}
