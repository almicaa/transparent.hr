import { FilterOption, JobFilters, JobSort, EMPTY_FILTERS } from "../../lib/types"
import { SOURCE_LABELS } from "../../lib/sourceLabels"

const MAX_OPTION_LENGTH = 40

const SALARY_STEPS = [1000, 1500, 2000, 2500, 3000]

// Portals we actually scrape (SOURCE_LABELS also covers ones we don't, yet).
const SOURCES = ["posao", "mojposao"]

const SORT_LABELS: Record<JobSort, string> = {
  newest: "Najnovije",
  salary_desc: "Najviša plaća",
  salary_asc: "Najniža plaća",
}

const REGIONS = [
  { value: "", label: "Svi" },
  { value: "hr", label: "Hrvatska" },
  { value: "foreign", label: "Inozemstvo" },
]

function truncate(text: string): string {
  return text.length > MAX_OPTION_LENGTH ? text.slice(0, MAX_OPTION_LENGTH - 1).trimEnd() + "…" : text
}

function optionLabel(o: FilterOption): string {
  return `${truncate(o.value)} (${o.count})`
}

/** Keeps a selected value visible even when it isn't among the options (e.g. from a shared link). */
function withSelected(options: FilterOption[], selected: string): FilterOption[] {
  if (!selected || options.some((o) => o.value === selected)) return options
  return [{ value: selected, count: 0 }, ...options]
}

interface FiltersProps {
  filters: JobFilters
  onChange: (patch: Partial<JobFilters>) => void
  categoryOptions: FilterOption[]
  regionOptions: FilterOption[]
  cityOptions: FilterOption[]
  countryOptions: FilterOption[]
}

export default function Filters({
  filters,
  onChange,
  categoryOptions,
  regionOptions,
  cityOptions,
  countryOptions,
}: FiltersProps) {
  const selectedCity = filters.location.startsWith("city:") ? filters.location.slice(5) : ""
  const selectedCountry = filters.location.startsWith("country:") ? filters.location.slice(8) : ""
  const region = selectedCity || filters.location === "hr" ? "hr" : selectedCountry || filters.location === "foreign" ? "foreign" : ""
  const isFiltered = (Object.keys(EMPTY_FILTERS) as (keyof JobFilters)[]).some((k) => filters[k] !== EMPTY_FILTERS[k])

  return (
    <div className="filters">
      <input
        className="search"
        type="search"
        placeholder="Pretraži po nazivu, tvrtki…"
        aria-label="Pretraži oglase"
        value={filters.search}
        onChange={(e) => onChange({ search: e.target.value })}
      />

      <select
        aria-label="Grana"
        className={filters.category ? "filters__wide is-active" : "filters__wide"}
        value={filters.category}
        onChange={(e) => onChange({ category: e.target.value })}
      >
        <option value="">Sve grane</option>
        {withSelected(categoryOptions, filters.category).map((o) => (
          <option key={o.value} value={o.value}>
            {optionLabel(o)}
          </option>
        ))}
      </select>

      <div className="filters__location">
        <div className="segmented" role="radiogroup" aria-label="Područje">
          {REGIONS.map(({ value, label }) => {
            const count = value ? regionOptions.find((o) => o.value === value)?.count : undefined
            return (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={region === value}
                className={region === value ? "segmented__option is-selected" : "segmented__option"}
                onClick={() => region !== value && onChange({ location: value })}
              >
                {label}
                {count !== undefined ? <span className="segmented__count">{count}</span> : null}
              </button>
            )
          })}
        </div>

        {region === "hr" ? (
          <select
            aria-label="Grad"
            className={selectedCity ? "is-active" : undefined}
            value={filters.location}
            onChange={(e) => onChange({ location: e.target.value })}
          >
            <option value="hr">Svi gradovi</option>
            {withSelected(cityOptions, selectedCity).map((o) => (
              <option key={o.value} value={`city:${o.value}`} title={o.value}>
                {optionLabel(o)}
              </option>
            ))}
          </select>
        ) : null}

        {region === "foreign" ? (
          <select
            aria-label="Država"
            className={selectedCountry ? "is-active" : undefined}
            value={filters.location}
            onChange={(e) => onChange({ location: e.target.value })}
          >
            <option value="foreign">Sve države</option>
            {withSelected(countryOptions, selectedCountry).map((o) => (
              <option key={o.value} value={`country:${o.value}`}>
                {optionLabel(o)}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <select
        aria-label="Minimalna plaća"
        className={filters.salaryMin ? "is-active" : undefined}
        value={filters.salaryMin}
        onChange={(e) => onChange({ salaryMin: e.target.value })}
      >
        <option value="">Bilo koja plaća</option>
        {SALARY_STEPS.map((amount) => (
          <option key={amount} value={String(amount)}>
            Plaća od {amount.toLocaleString("hr-HR")} €
          </option>
        ))}
      </select>

      <select
        aria-label="Sortiranje"
        value={filters.sort}
        onChange={(e) => onChange({ sort: e.target.value as JobSort })}
      >
        {(Object.keys(SORT_LABELS) as JobSort[]).map((s) => (
          <option key={s} value={s}>
            {SORT_LABELS[s]}
          </option>
        ))}
      </select>

      <select
        aria-label="Izvor"
        className={filters.source ? "is-active" : undefined}
        value={filters.source}
        onChange={(e) => onChange({ source: e.target.value })}
      >
        <option value="">Svi izvori</option>
        {SOURCES.map((source) => (
          <option key={source} value={source}>
            {SOURCE_LABELS[source]}
          </option>
        ))}
      </select>

      {isFiltered ? (
        <button type="button" className="filters__reset" onClick={() => onChange(EMPTY_FILTERS)}>
          Poništi filtere
        </button>
      ) : null}
    </div>
  )
}
