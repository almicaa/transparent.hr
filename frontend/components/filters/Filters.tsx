import { useMemo } from "react"
import { JobFilters } from "../../lib/types"
import { isForeignLocation, matchCountry } from "../../lib/location"

interface FiltersProps {
  filters: JobFilters
  setFilters: (updater: (f: JobFilters) => JobFilters) => void
  setPage: (page: number) => void
  cities: string[]
  categories: string[]
}

export default function Filters({ filters, setFilters, setPage, cities, categories }: FiltersProps) {
  const { locationOptions, locationLabel } = useMemo(() => {
    if (filters.region === "hr") {
      return {
        locationOptions: cities.filter((c) => !isForeignLocation(c)),
        locationLabel: "Svi gradovi",
      }
    }
    if (filters.region === "foreign") {
      const countries = new Set(cities.map(matchCountry).filter((c): c is string => !!c))
      return {
        locationOptions: Array.from(countries).sort(),
        locationLabel: "Sve države",
      }
    }
    return { locationOptions: cities, locationLabel: "Sve lokacije" }
  }, [cities, filters.region])

  return (
    <div className="filters">
      <input
        className="search"
        type="search"
        placeholder="Pretraži"
        value={filters.search || ""}
        onChange={(e) => {
          setFilters((f) => ({ ...f, search: e.target.value }))
          setPage(1)
        }}
      />

      <select
        value={filters.region}
        onChange={(e) => {
          setFilters((f) => ({ ...f, region: e.target.value, city: "all" }))
          setPage(1)
        }}
      >
        <option value="all">Sve</option>
        <option value="hr">Hrvatska</option>
        <option value="foreign">Inozemstvo</option>
      </select>

      <select
        value={filters.city}
        onChange={(e) => {
          setFilters((f) => ({ ...f, city: e.target.value }))
          setPage(1)
        }}
      >
        <option value="all">{locationLabel}</option>
        {locationOptions.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        value={filters.category}
        onChange={(e) => {
          setFilters((f) => ({ ...f, category: e.target.value }))
          setPage(1)
        }}
      >
        <option value="all">Sve kategorije</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        value={filters.source}
        onChange={(e) => {
          setFilters((f) => ({ ...f, source: e.target.value }))
          setPage(1)
        }}
      >
        <option value="all">Svi izvori</option>
        <option value="posao">posao.hr</option>
        <option value="mojposao">mojposao</option>
      </select>
    </div>
  )
}
