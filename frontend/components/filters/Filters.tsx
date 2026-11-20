import { useEffect, useState } from "react"
import { SIDEBAR_QUERY, useMediaQuery } from "../../lib/useMediaQuery"
import { EMPTY_FILTERS, FilterOption, JobFilters, SalaryBucket } from "../../lib/types"
import { euro, jobCountLabel } from "../../lib/format"
import { Locale } from "../../lib/i18n"
import { categoryLabel } from "../../lib/labels"
import { useLocale } from "../i18n/LocaleProvider"
import { SOURCE_LABELS } from "../../lib/sourceLabels"
import Finder from "./Finder"
import { locationLabel } from "./LocationCombobox"
import SalaryRange from "./SalaryRange"

// Portals we actually scrape (SOURCE_LABELS also covers ones we don't, yet).
const SOURCES = ["posao", "mojposao", "hzz"]

// Grane shown before "Prikaži još": the list runs past twenty.
const VISIBLE_CATEGORIES = 8

const COPY = {
  hr: {
    from: "od",
    upTo: "do",
    newOnly: "Samo novi",
    removeFilter: (label: string) => `Ukloni filter ${label}`,
    clearAll: "Očisti sve",
    filters: "Filteri",
    reset: "Poništi",
    close: "Zatvori",
    lastDays: "Samo oglasi iz zadnja 3 dana",
    salary: "Plaća",
    category: "Grana",
    allCategories: "Sve grane",
    showLess: "Prikaži manje",
    showMore: (n: number) => `Prikaži još ${n}`,
    source: "Izvor",
    allSources: "Svi",
    show: (count: string) => `Prikaži ${count}`,
  },
  en: {
    from: "from",
    upTo: "up to",
    newOnly: "New only",
    removeFilter: (label: string) => `Remove filter ${label}`,
    clearAll: "Clear all",
    filters: "Filters",
    reset: "Reset",
    close: "Close",
    lastDays: "Only jobs from the last 3 days",
    salary: "Salary",
    category: "Sector",
    allCategories: "All sectors",
    showLess: "Show less",
    showMore: (n: number) => `Show ${n} more`,
    source: "Source",
    allSources: "All",
    show: (count: string) => `Show ${count}`,
  },
}

function salaryLabel(min: string, max: string, locale: Locale): string {
  const money = (n: string) => euro(Number(n), locale)
  if (min && max) return `${money(min)} – ${money(max)}`
  return min ? `${COPY[locale].from} ${money(min)}` : `${COPY[locale].upTo} ${money(max)}`
}

/** How many of the panel's filters are set (the "Filteri" button badge). */
export function panelFilterCount(filters: JobFilters): number {
  return [filters.newOnly, filters.category, filters.salaryMin || filters.salaryMax, filters.source].filter(Boolean).length
}

interface SearchBarProps {
  filters: JobFilters
  onChange: (patch: Partial<JobFilters>) => void
  /** Flush the debounced search right away (the search button / Enter). */
  onSubmit: () => void
  categoryOptions: FilterOption[]
  regionOptions: FilterOption[]
  cityOptions: FilterOption[]
  countryOptions: FilterOption[]
}

/** The finder plus removable pills for what's applied outside it. */
export function SearchBar({ filters, onChange, onSubmit, ...options }: SearchBarProps) {
  const locale = useLocale()
  const t = COPY[locale]
  // Search text and the grana stay in the "Što" field, so they get no pill.
  const active: { key: string; label: string; clear: Partial<JobFilters> }[] = []
  if (filters.location) active.push({ key: "location", label: locationLabel(filters.location, locale), clear: { location: "" } })
  if (filters.salaryMin || filters.salaryMax)
    active.push({ key: "salary", label: salaryLabel(filters.salaryMin, filters.salaryMax, locale), clear: { salaryMin: "", salaryMax: "" } })
  if (filters.source) active.push({ key: "source", label: SOURCE_LABELS[filters.source] ?? filters.source, clear: { source: "" } })
  if (filters.newOnly) active.push({ key: "new", label: t.newOnly, clear: { newOnly: false } })

  return (
    <div className="filters">
      <Finder filters={filters} onChange={onChange} onSubmit={onSubmit} placement="oglasi" {...options} />

      {active.length ? (
        <div className="active-filters">
          {active.map((a) => (
            <button
              key={a.key}
              type="button"
              className="active-filter"
              onClick={() => onChange(a.clear)}
              aria-label={t.removeFilter(a.label)}
            >
              {a.label}
              <span aria-hidden="true">✕</span>
            </button>
          ))}
          <button type="button" className="active-filters__clear" onClick={() => onChange(EMPTY_FILTERS)}>
            {t.clearAll}
          </button>
        </div>
      ) : null}
    </div>
  )
}

interface FilterPanelProps {
  filters: JobFilters
  onChange: (patch: Partial<JobFilters>) => void
  drawerOpen: boolean
  onCloseDrawer: () => void
  total: number
  categoryOptions: FilterOption[]
  salaryHistogram: SalaryBucket[]
}

/** The remaining filters: a sidebar on wide screens, a slide-in drawer below that. */
export function FilterPanel({
  filters,
  onChange,
  drawerOpen,
  onCloseDrawer,
  total,
  categoryOptions,
  salaryHistogram,
}: FilterPanelProps) {
  const locale = useLocale()
  const t = COPY[locale]
  const isSidebar = useMediaQuery(SIDEBAR_QUERY)
  const count = panelFilterCount(filters)
  const [allCategories, setAllCategories] = useState(false)
  // A selected grana further down the list stays visible when collapsed.
  const selectedIndex = categoryOptions.findIndex((o) => o.value === filters.category)
  // Only the desktop sidebar collapses the list; on phones the drawer scrolls
  // anyway, and smaller grane (IT) were hidden behind "Prikaži još".
  const shownCategories =
    allCategories || !isSidebar || categoryOptions.length <= VISIBLE_CATEGORIES + 2
      ? categoryOptions
      : categoryOptions.filter((_, i) => i < VISIBLE_CATEGORIES || i === selectedIndex)
  const hiddenCount = categoryOptions.length - shownCategories.length

  useEffect(() => {
    if (!drawerOpen || isSidebar) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseDrawer()
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener("keydown", onKey)
    }
  }, [drawerOpen, isSidebar, onCloseDrawer])

  return (
    <>
      {drawerOpen && !isSidebar ? <div className="drawer-backdrop" onClick={onCloseDrawer} /> : null}
      <aside
        className={drawerOpen ? "drawer is-open" : "drawer"}
        aria-hidden={!isSidebar && !drawerOpen}
        aria-label={t.filters}
      >
        <div className="drawer__header">
          <strong>{t.filters}</strong>
          {count ? (
            <button
              type="button"
              className="drawer__reset drawer__reset--top"
              onClick={() => onChange({ newOnly: false, category: "", salaryMin: "", salaryMax: "", source: "" })}
            >
              {t.reset}
            </button>
          ) : null}
          <button type="button" className="drawer__close" aria-label={t.close} onClick={onCloseDrawer}>
            ✕
          </button>
        </div>

        <div className="drawer__body">
          <section className="drawer__section">
            <label className="toggle">
              <input type="checkbox" checked={filters.newOnly} onChange={(e) => onChange({ newOnly: e.target.checked })} />
              <span className="toggle__track" aria-hidden="true" />
              {t.lastDays}
            </label>
          </section>

          <section className="drawer__section">
            <h3>{t.salary}</h3>
            <SalaryRange
              histogram={salaryHistogram}
              min={filters.salaryMin}
              max={filters.salaryMax}
              onChange={(salaryMin, salaryMax) => onChange({ salaryMin, salaryMax })}
            />
          </section>

          <section className="drawer__section">
            <h3>{t.category}</h3>
            <div className="option-list" role="radiogroup" aria-label={t.category}>
              {[{ value: "", count: undefined as number | undefined }, ...shownCategories].map((o) => (
                <label key={o.value || "all"} className="option-list__item">
                  <input
                    type="radio"
                    name="category"
                    checked={filters.category === o.value}
                    onChange={() => onChange({ category: o.value })}
                  />
                  <span>{o.value ? categoryLabel(o.value, locale) : t.allCategories}</span>
                  {o.count !== undefined ? <span className="option-list__count">{o.count}</span> : null}
                </label>
              ))}
            </div>
            {hiddenCount > 0 || allCategories ? (
              <button type="button" className="option-list__more" onClick={() => setAllCategories(!allCategories)}>
                {allCategories ? t.showLess : t.showMore(hiddenCount)}
              </button>
            ) : null}
          </section>

          <section className="drawer__section">
            <h3>{t.source}</h3>
            {/* Chips wrap onto a second row instead of scrolling sideways. */}
            <div className="chip-group" role="radiogroup" aria-label={t.source}>
              {["", ...SOURCES].map((s) => (
                <button
                  key={s || "all"}
                  type="button"
                  role="radio"
                  aria-checked={filters.source === s}
                  className={filters.source === s ? "chip is-selected" : "chip"}
                  onClick={() => onChange({ source: s })}
                >
                  {s ? SOURCE_LABELS[s] : t.allSources}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="drawer__footer">
          <button
            type="button"
            className="drawer__reset"
            disabled={!count}
            onClick={() => onChange({ newOnly: false, category: "", salaryMin: "", salaryMax: "", source: "" })}
          >
            {t.reset}
          </button>
          <button type="button" className="drawer__apply" onClick={onCloseDrawer}>
            {t.show(jobCountLabel(total, locale))}
          </button>
        </div>
      </aside>
    </>
  )
}
