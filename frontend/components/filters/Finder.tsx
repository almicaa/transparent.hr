import { trackEvent } from "../../lib/analytics"
import { FilterOption, JobFilters } from "../../lib/types"
import { locationLabel } from "./LocationCombobox"
import LocationCombobox from "./LocationCombobox"
import WhatCombobox from "./WhatCombobox"

// Quick picks for the "Plaća od" field; the drawer's slider is finer.
const SALARY_STEPS = ["1000", "1500", "2000", "2500", "3000"]

function euro(n: string): string {
  return `${Number(n).toLocaleString("hr-HR")} €`
}

interface FinderProps {
  filters: JobFilters
  onChange: (patch: Partial<JobFilters>) => void
  onSubmit: () => void
  categoryOptions: FilterOption[]
  regionOptions: FilterOption[]
  cityOptions: FilterOption[]
  countryOptions: FilterOption[]
  /** Where the search bar sits, sent with the GA "search" event ("naslovnica" / "oglasi"). */
  placement: string
}

/** The "Što · Gdje · Plaća od" search bar, shared by the home hero and the job list. */
export default function Finder({
  filters,
  onChange,
  onSubmit,
  categoryOptions,
  regionOptions,
  cityOptions,
  countryOptions,
  placement,
}: FinderProps) {
  // A slider-picked minimum (e.g. 1.750 €) still needs to show in the quick-pick select.
  const salarySteps =
    filters.salaryMin && !SALARY_STEPS.includes(filters.salaryMin)
      ? [...SALARY_STEPS, filters.salaryMin].sort((a, b) => Number(a) - Number(b))
      : SALARY_STEPS

  return (
    <form
      className="finder"
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        trackEvent("search", {
          search_term: filters.search.trim(),
          category: filters.category,
          location: locationLabel(filters.location),
          salary_min: filters.salaryMin ? Number(filters.salaryMin) : undefined,
          placement,
        })
        onSubmit()
      }}
    >
      <div className="finder__field finder__field--what">
        <span className="finder__label" aria-hidden="true">
          Što
        </span>
        <WhatCombobox
          search={filters.search}
          category={filters.category}
          onSearch={(search) => onChange({ search })}
          onCategory={(category) => onChange({ category })}
          categoryOptions={categoryOptions}
          megaMenu={placement !== "oglasi"}
        />
      </div>

      <div className="finder__field finder__field--where">
        <span className="finder__label" aria-hidden="true">
          Gdje
        </span>
        <LocationCombobox
          value={filters.location}
          onChange={(location) => onChange({ location })}
          regionOptions={regionOptions}
          cityOptions={cityOptions}
          countryOptions={countryOptions}
        />
      </div>

      <label className="finder__field finder__field--pay">
        <span className="finder__label">Plaća od</span>
        <select
          value={filters.salaryMin}
          onChange={(e) => onChange({ salaryMin: e.target.value })}
          className={filters.salaryMin ? "is-set" : undefined}
        >
          <option value="">Bilo koja</option>
          {salarySteps.map((amount) => (
            <option key={amount} value={amount}>
              {euro(amount)}
            </option>
          ))}
        </select>
      </label>

      <button type="submit" className="finder__submit" aria-label="Traži">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2.2" />
          <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <span>Traži</span>
      </button>
    </form>
  )
}
