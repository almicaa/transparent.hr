import { JobFilters } from "../../lib/types"

interface FiltersProps {
  filters: JobFilters
  setFilters: (updater: (f: JobFilters) => JobFilters) => void
  setPage: (page: number) => void
  cities: string[]
  categories: string[]
}

export default function Filters({ filters, setFilters, setPage, cities, categories }: FiltersProps) {
  return (
    <div className="filters">
      <h2 className="filters__title">Filteri</h2>
      <input
        className="search"
        type="search"
        placeholder="Traži naslov, kompaniju ili pojam"
        value={filters.search || ""}
        onChange={(e) => {
          setFilters((f) => ({ ...f, search: e.target.value }))
          setPage(1)
        }}
      />

      <select
        value={filters.city}
        onChange={(e) => {
          setFilters((f) => ({ ...f, city: e.target.value }))
          setPage(1)
        }}
      >
        <option value="all">Svi gradovi</option>
        {cities.map((c) => (
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
