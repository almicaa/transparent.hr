import { useEffect } from "react"
import { EMPTY_FILTERS, FilterOption, JobFilters, SalaryBucket } from "../../lib/types"
import { jobCountLabel } from "../../lib/format"
import { SOURCE_LABELS } from "../../lib/sourceLabels"
import Finder from "./Finder"
import { locationLabel } from "./LocationCombobox"
import SalaryRange from "./SalaryRange"

// Portals we actually scrape (SOURCE_LABELS also covers ones we don't, yet).
const SOURCES = ["posao", "mojposao"]

function euro(n: string): string {
  return `${Number(n).toLocaleString("hr-HR")} €`
}

function salaryLabel(min: string, max: string): string {
  if (min && max) return `${euro(min)} – ${euro(max)}`
  return min ? `od ${euro(min)}` : `do ${euro(max)}`
}

interface FiltersProps {
  filters: JobFilters
  onChange: (patch: Partial<JobFilters>) => void
  /** Flush the debounced search right away (the search button / Enter). */
  onSubmit: () => void
  drawerOpen: boolean
  onCloseDrawer: () => void
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
  onSubmit,
  drawerOpen,
  onCloseDrawer,
  total,
  categoryOptions,
  regionOptions,
  cityOptions,
  countryOptions,
  salaryHistogram,
}: FiltersProps) {
  // Removable summary of what's applied; search text and the grana stay in the "Što" field.
  const active: { key: string; label: string; clear: Partial<JobFilters> }[] = []
  if (filters.location) active.push({ key: "location", label: locationLabel(filters.location), clear: { location: "" } })
  if (filters.salaryMin || filters.salaryMax)
    active.push({ key: "salary", label: salaryLabel(filters.salaryMin, filters.salaryMax), clear: { salaryMin: "", salaryMax: "" } })
  if (filters.source) active.push({ key: "source", label: SOURCE_LABELS[filters.source] ?? filters.source, clear: { source: "" } })
  if (filters.newOnly) active.push({ key: "new", label: "Samo novi", clear: { newOnly: false } })

  const drawerCount = [filters.newOnly, filters.category, filters.salaryMin || filters.salaryMax, filters.source].filter(
    Boolean,
  ).length

  useEffect(() => {
    if (!drawerOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseDrawer()
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener("keydown", onKey)
    }
  }, [drawerOpen, onCloseDrawer])

  return (
    <div className="filters">
      <Finder
        filters={filters}
        onChange={onChange}
        onSubmit={onSubmit}
        categoryOptions={categoryOptions}
        regionOptions={regionOptions}
        cityOptions={cityOptions}
        countryOptions={countryOptions}
      />

      {active.length ? (
        <div className="active-filters">
          {active.map((a) => (
            <button
              key={a.key}
              type="button"
              className="active-filter"
              onClick={() => onChange(a.clear)}
              aria-label={`Ukloni filter ${a.label}`}
            >
              {a.label}
              <span aria-hidden="true">✕</span>
            </button>
          ))}
          <button type="button" className="active-filters__clear" onClick={() => onChange(EMPTY_FILTERS)}>
            Očisti sve
          </button>
        </div>
      ) : null}

      {drawerOpen ? <div className="drawer-backdrop" onClick={onCloseDrawer} /> : null}
      <aside className={drawerOpen ? "drawer is-open" : "drawer"} aria-hidden={!drawerOpen} aria-label="Filteri">
        <div className="drawer__header">
          <strong>Filteri</strong>
          <button type="button" className="drawer__close" aria-label="Zatvori" onClick={onCloseDrawer}>
            ✕
          </button>
        </div>

        <div className="drawer__body">
          <section className="drawer__section">
            <label className="toggle">
              <input type="checkbox" checked={filters.newOnly} onChange={(e) => onChange({ newOnly: e.target.checked })} />
              <span className="toggle__track" aria-hidden="true" />
              Samo oglasi iz zadnja 3 dana
            </label>
          </section>

          <section className="drawer__section">
            <h3>Plaća</h3>
            <SalaryRange
              histogram={salaryHistogram}
              min={filters.salaryMin}
              max={filters.salaryMax}
              onChange={(salaryMin, salaryMax) => onChange({ salaryMin, salaryMax })}
            />
          </section>

          <section className="drawer__section">
            <h3>Grana</h3>
            <div className="option-list" role="radiogroup" aria-label="Grana">
              {[{ value: "", count: undefined as number | undefined }, ...categoryOptions].map((o) => (
                <label key={o.value || "all"} className="option-list__item">
                  <input
                    type="radio"
                    name="category"
                    checked={filters.category === o.value}
                    onChange={() => onChange({ category: o.value })}
                  />
                  <span>{o.value || "Sve grane"}</span>
                  {o.count !== undefined ? <span className="option-list__count">{o.count}</span> : null}
                </label>
              ))}
            </div>
          </section>

          <section className="drawer__section">
            <h3>Izvor</h3>
            <div className="segmented" role="radiogroup" aria-label="Izvor">
              {["", ...SOURCES].map((s) => (
                <button
                  key={s || "all"}
                  type="button"
                  role="radio"
                  aria-checked={filters.source === s}
                  className={filters.source === s ? "segmented__option is-selected" : "segmented__option"}
                  onClick={() => onChange({ source: s })}
                >
                  {s ? SOURCE_LABELS[s] : "Svi"}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="drawer__footer">
          <button
            type="button"
            className="drawer__reset"
            disabled={!drawerCount}
            onClick={() => onChange({ newOnly: false, category: "", salaryMin: "", salaryMax: "", source: "" })}
          >
            Poništi
          </button>
          <button type="button" className="drawer__apply" onClick={onCloseDrawer}>
            Prikaži {jobCountLabel(total)}
          </button>
        </div>
      </aside>
    </div>
  )
}
