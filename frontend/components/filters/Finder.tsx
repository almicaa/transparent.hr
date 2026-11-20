import { trackEvent } from "../../lib/analytics"
import { FilterOption, JobFilters } from "../../lib/types"
import { locationLabel } from "./LocationCombobox"
import LocationCombobox from "./LocationCombobox"
import WhatCombobox from "./WhatCombobox"
import { euro } from "../../lib/format"
import { useLocale } from "../i18n/LocaleProvider"

// Non-breaking spaces keep the short labels on one line.
const COPY = {
  hr: { what: "Što", where: "Gdje", payFrom: "Plaća\u00a0od", any: "Bilo koja", search: "Traži" },
  en: { what: "What", where: "Where", payFrom: "Pay\u00a0from", any: "Any", search: "Search" },
}

// Quick picks for the "Plaća od" field; the drawer's slider is finer.
const SALARY_STEPS = ["1000", "1500", "2000", "2500", "3000"]

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
  const locale = useLocale()
  const t = COPY[locale]
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
          language: locale,
        })
        onSubmit()
      }}
    >
      <div className="finder__field finder__field--what">
        <span className="finder__label" aria-hidden="true">
          {t.what}
        </span>
        <WhatCombobox
          search={filters.search}
          category={filters.category}
          onChange={onChange}
          categoryOptions={categoryOptions}
        />
      </div>

      <div className="finder__field finder__field--where">
        <span className="finder__label" aria-hidden="true">
          {t.where}
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
        <span className="finder__label">{t.payFrom}</span>
        <select
          value={filters.salaryMin}
          onChange={(e) => onChange({ salaryMin: e.target.value })}
          className={filters.salaryMin ? "is-set" : undefined}
        >
          <option value="">{t.any}</option>
          {salarySteps.map((amount) => (
            <option key={amount} value={amount}>
              {euro(Number(amount), locale)}
            </option>
          ))}
        </select>
      </label>

      <button type="submit" className="finder__submit" aria-label={t.search}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2.2" />
          <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <span>{t.search}</span>
      </button>
    </form>
  )
}
