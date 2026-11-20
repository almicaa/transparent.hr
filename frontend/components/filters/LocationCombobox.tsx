import { useEffect, useId, useMemo, useRef, useState } from "react"
import { FilterOption } from "../../lib/types"
import { DEFAULT_LOCALE, Locale } from "../../lib/i18n"
import { countryLabel } from "../../lib/labels"
import { useLocale } from "../i18n/LocaleProvider"

const COPY = {
  hr: {
    allCroatia: "Cijela Hrvatska",
    abroad: "Inozemstvo",
    area: "Područje",
    cities: "Gradovi",
    location: "Lokacija",
    anywhere: "Sve lokacije",
    noMatch: "Nema takve lokacije",
  },
  en: {
    allCroatia: "All of Croatia",
    abroad: "Abroad",
    area: "Area",
    cities: "Cities",
    location: "Location",
    anywhere: "All locations",
    noMatch: "No such location",
  },
}

interface Suggestion {
  value: string
  label: string
  count?: number
  group: string
}

const MAX_PER_GROUP = 8

function fold(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d")
}

/** Human label for a location filter value ("", "hr", "foreign", "city:X", "country:X"). */
export function locationLabel(value: string, locale: Locale = DEFAULT_LOCALE): string {
  if (value === "hr") return COPY[locale].allCroatia
  if (value === "foreign") return COPY[locale].abroad
  if (value.startsWith("city:")) return value.slice(5)
  if (value.startsWith("country:")) return countryLabel(value.slice(8), locale)
  return ""
}

interface LocationComboboxProps {
  value: string
  onChange: (value: string) => void
  regionOptions: FilterOption[]
  cityOptions: FilterOption[]
  countryOptions: FilterOption[]
}

/**
 * Location field with suggestions: the whole of Croatia or abroad first, then
 * cities and countries with job counts. Typing narrows the list (diacritics
 * optional, so "cakovec" finds Čakovec).
 */
export default function LocationCombobox({
  value,
  onChange,
  regionOptions,
  cityOptions,
  countryOptions,
}: LocationComboboxProps) {
  const locale = useLocale()
  const t = COPY[locale]
  const label = (v: string) => locationLabel(v, locale)
  const [query, setQuery] = useState(label(value))
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  useEffect(() => setQuery(locationLabel(value, locale)), [value, locale])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setQuery(locationLabel(value, locale))
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open, value, locale])

  const suggestions = useMemo(() => {
    const regionCount = (r: string) => regionOptions.find((o) => o.value === r)?.count
    const all: Suggestion[] = [
      { value: "hr", label: t.allCroatia, count: regionCount("hr"), group: t.area },
      { value: "foreign", label: t.abroad, count: regionCount("foreign"), group: t.area },
      ...cityOptions.map((o) => ({ value: `city:${o.value}`, label: o.value, count: o.count, group: t.cities })),
      ...countryOptions.map((o) => ({
        value: `country:${o.value}`,
        label: countryLabel(o.value, locale),
        count: o.count,
        group: t.abroad,
      })),
    ]
    // Showing the current selection's label means "no new query yet" — list everything.
    const q = query === locationLabel(value, locale) ? "" : fold(query.trim())
    const matches = q ? all.filter((s) => fold(s.label).includes(q)) : all
    if (q) return matches
    // Unfiltered, show just the top few per group (they're sorted by job count).
    const shown: Record<string, number> = {}
    return matches.filter((s) => {
      shown[s.group] = (shown[s.group] ?? 0) + 1
      return shown[s.group] <= MAX_PER_GROUP
    })
  }, [query, value, regionOptions, cityOptions, countryOptions, locale, t])

  useEffect(() => setHighlight(0), [query])

  function choose(next: string) {
    onChange(next)
    setQuery(label(next))
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === "Enter" && open && suggestions[highlight]) {
      e.preventDefault()
      choose(suggestions[highlight].value)
    } else if (e.key === "Escape") {
      setOpen(false)
      setQuery(label(value))
    }
  }

  return (
    <div className="location-combobox" ref={rootRef}>
      <input
        type="text"
        role="combobox"
        aria-label={t.location}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && suggestions[highlight] ? `${listId}-${highlight}` : undefined}
        placeholder={t.anywhere}
        value={query}
        onFocus={(e) => {
          setOpen(true)
          e.target.select()
        }}
        // Clicking an already-focused field (e.g. right after picking) must reopen it too.
        onClick={(e) => {
          if (!open) {
            setOpen(true)
            e.currentTarget.select()
          }
        }}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onKeyDown={onKeyDown}
      />
      {value ? (
        <button type="button" className="location-combobox__clear" aria-label={t.anywhere} onClick={() => choose("")}>
          ✕
        </button>
      ) : null}

      {open ? (
        <ul className="location-combobox__list" id={listId} role="listbox">
          {suggestions.length === 0 ? <li className="location-combobox__empty">{t.noMatch}</li> : null}
          {suggestions.map((s, i) => (
            <li key={s.value} role="presentation">
              {i === 0 || suggestions[i - 1].group !== s.group ? (
                <div className="location-combobox__group">{s.group}</div>
              ) : null}
              <div
                id={`${listId}-${i}`}
                role="option"
                aria-selected={s.value === value}
                className={i === highlight ? "location-combobox__option is-highlighted" : "location-combobox__option"}
                onPointerEnter={() => setHighlight(i)}
                // Keep focus in the input on a mouse press; pick on click, which a
                // touch only fires on a tap, so swiping to scroll the list picks nothing.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(s.value)}
              >
                <span>{s.label}</span>
                {s.count !== undefined ? <span className="location-combobox__count">{s.count}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
