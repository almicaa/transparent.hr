"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Finder from "../filters/Finder"
import { filtersToQuery } from "../../lib/filterUrl"
import { EMPTY_FILTERS, Filters as FilterData, JobFilters } from "../../lib/types"
import { localePath } from "../../lib/i18n"
import { useLocale } from "../i18n/LocaleProvider"

/** The home page search: same finder as the job list, but submitting opens /jobs with those filters. */
export default function HeroSearch({ filterData }: { filterData?: FilterData }) {
  const locale = useLocale()
  const router = useRouter()
  const [filters, setFilters] = useState<JobFilters>(EMPTY_FILTERS)

  return (
    <Finder
      filters={filters}
      onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
      onSubmit={() => router.push(localePath(locale, `/jobs${filtersToQuery({ ...filters, search: filters.search.trim() })}`))}
      categoryOptions={filterData?.category_options ?? []}
      regionOptions={filterData?.region_options ?? []}
      cityOptions={filterData?.city_options ?? []}
      countryOptions={filterData?.country_options ?? []}
      placement="naslovnica"
    />
  )
}
