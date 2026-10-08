import { useEffect, useState } from "react"
import { FilterOption, JobFilters, JobSort, EMPTY_FILTERS, SalaryBucket } from "../../lib/types"
import { jobCountLabel } from "../../lib/format"
import { SOURCE_LABELS } from "../../lib/sourceLabels"
import CategoryChips from "./CategoryChips"
import SalaryRange from "./SalaryRange"

const MAX_OPTION_LENGTH = 40

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
  total: number
  categoryOptions: FilterOption[]
  regionOptions: FilterOption[]
  cityOptions: FilterOption[]
  countryOptions: FilterOption[]
  salaryHistogram: SalaryBucket[]
}

export default function Filters({
  filters,
  onChange,
  total,
  categoryOptions,
  regionOptions,
  cityOptions,
  countryOptions,
  salaryHistogram,
}: FiltersProps) {
  // Mobile only: the secondary filters live in a bottom sheet behind a button.
  const [sheetOpen, setSheetOpen] = useState(false)

  const selectedCity = filters.location.startsWith("city:") ? filters.location.slice(5) : ""
  const selectedCountry = filters.location.startsWith("country:") ? filters.location.slice(8) : ""
  const region = selectedCity || filters.location === "hr" ? "hr" : selectedCountry || filters.location === "foreign" ? "foreign" : ""
  const isFiltered = (Object.keys(EMPTY_FILTERS) as (keyof JobFilters)[]).some((k) => filters[k] !== EMPTY_FILTERS[k])
  // What's hidden in the sheet — search and category stay visible on mobile.
  const sheetFilterCount = [
    filters.location,
    filters.salaryMin || filters.salaryMax,
    filters.sort !== "newest",
    filters.source,
  ].filter(Boolean).length

  useEffect(() => {
    if (!sheetOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheetOpen(false)
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener("keydown", onKey)
    }
  }, [sheetOpen])

  return (
    <div className="filters">
      <div className="filters__top">
        <input
          className="search"
          type="search"
          placeholder="Pretraži po nazivu, tvrtki…"
          aria-label="Pretraži oglase"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
        />
        <button
          type="button"
          className={sheetFilterCount ? "filters__open is-active" : "filters__open"}
          aria-expanded={sheetOpen}
          onClick={() => setSheetOpen(true)}
        >
          Filteri{sheetFilterCount ? ` (${sheetFilterCount})` : ""}
        </button>
      </div>

      {sheetOpen ? <div className="filters__backdrop" onClick={() => setSheetOpen(false)} /> : null}

      <div
        className={sheetOpen ? "filters__panel is-open" : "filters__panel"}
        role={sheetOpen ? "dialog" : undefined}
        aria-modal={sheetOpen || undefined}
        aria-label={sheetOpen ? "Filteri" : undefined}
      >
        <div className="filters__sheet-header">
          <strong>Filteri</strong>
          <button type="button" className="filters__close" aria-label="Zatvori" onClick={() => setSheetOpen(false)}>
            ✕
          </button>
        </div>

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

        <SalaryRange
          histogram={salaryHistogram}
          min={filters.salaryMin}
          max={filters.salaryMax}
          onChange={(salaryMin, salaryMax) => onChange({ salaryMin, salaryMax })}
        />

        <div className="filters__selects">
          <select aria-label="Sortiranje" value={filters.sort} onChange={(e) => onChange({ sort: e.target.value as JobSort })}>
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
        </div>

        <div className="filters__sheet-footer">
          <button
            type="button"
            className="filters__reset"
            disabled={!isFiltered}
            onClick={() => onChange(EMPTY_FILTERS)}
          >
            Poništi
          </button>
          <button type="button" className="filters__apply" onClick={() => setSheetOpen(false)}>
            Prikaži {jobCountLabel(total)}
          </button>
        </div>
      </div>

      <div className="filters__chips-row">
        <CategoryChips
          options={categoryOptions}
          selected={filters.category}
          onSelect={(category) => onChange({ category })}
        />
        {isFiltered ? (
          <button type="button" className="filters__reset filters__reset--inline" onClick={() => onChange(EMPTY_FILTERS)}>
            Poništi filtere
          </button>
        ) : null}
      </div>
    </div>
  )
}
