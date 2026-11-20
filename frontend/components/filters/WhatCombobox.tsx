import { useEffect, useId, useMemo, useRef, useState } from "react"
import { FilterOption } from "../../lib/types"
import { categoryLabel } from "../../lib/labels"
import { useLocale } from "../i18n/LocaleProvider"

const COPY = {
  hr: {
    remove: (c: string) => `Ukloni granu ${c}`,
    placeholder: "Pozicija, tvrtka ili grana",
    placeholderWithCategory: "Pozicija ili tvrtka",
    browse: "Pretraži po grani",
    categories: "Grane",
  },
  en: {
    remove: (c: string) => `Remove sector ${c}`,
    placeholder: "Job title, company or sector",
    placeholderWithCategory: "Job title or company",
    browse: "Browse by sector",
    categories: "Sectors",
  },
}

function fold(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d")
}

interface WhatComboboxProps {
  search: string
  category: string
  /** One call per user action, so picking a grana and clearing the text can't overwrite each other. */
  onChange: (patch: { search?: string; category?: string }) => void
  categoryOptions: FilterOption[]
}

/**
 * The "Što" field: free text searches positions and companies, and the same
 * field picks a grana. Focusing it with nothing typed opens a mega menu of all
 * grane; typing narrows it to matching ones while the text search runs as usual.
 */
export default function WhatCombobox({
  search,
  category,
  onChange,
  categoryOptions,
}: WhatComboboxProps) {
  const locale = useLocale()
  const t = COPY[locale]
  const [open, setOpen] = useState(false)
  // -1: nothing highlighted, so Enter submits the text search instead of picking a grana.
  const [highlight, setHighlight] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  const q = fold(search.trim())
  // Typing matches a sector by its name in either language.
  const options = useMemo(
    () =>
      q
        ? categoryOptions.filter((o) => fold(o.value).includes(q) || fold(categoryLabel(o.value, locale)).includes(q))
        : categoryOptions,
    [q, categoryOptions, locale],
  )
  const isMega = !q

  useEffect(() => setHighlight(-1), [q])

  function choose(next: string) {
    // The text was only typed to find the grana, so it shouldn't also filter.
    onChange(q ? { category: next, search: "" } : { category: next })
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => Math.min(h + 1, options.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, -1))
    } else if (e.key === "Enter") {
      if (open && options[highlight]) {
        e.preventDefault()
        choose(options[highlight].value)
      } else {
        setOpen(false)
      }
    } else if (e.key === "Escape") {
      setOpen(false)
    } else if (e.key === "Backspace" && !search && category) {
      onChange({ category: "" })
    }
  }

  return (
    <div className="what-combobox" ref={rootRef}>
      <div className="what-combobox__control">
        {category ? (
          <button
            type="button"
            className="what-combobox__chip"
            aria-label={t.remove(categoryLabel(category, locale))}
            onClick={() => {
              onChange({ category: "" })
              inputRef.current?.focus()
            }}
          >
            {categoryLabel(category, locale)}
            <span aria-hidden="true">✕</span>
          </button>
        ) : null}
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label={t.placeholder}
          aria-expanded={open && options.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options[highlight] ? `${listId}-${highlight}` : undefined}
          placeholder={category ? t.placeholderWithCategory : t.placeholder}
          value={search}
          onFocus={() => setOpen(true)}
          // Clicking an already-focused field (e.g. right after picking) must reopen it too.
          onClick={() => setOpen(true)}
          onChange={(e) => {
            onChange({ search: e.target.value })
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
        />
      </div>

      {open && options.length ? (
        <div className={isMega ? "what-combobox__panel is-mega" : "what-combobox__panel"}>
          <div className="what-combobox__heading">{isMega ? t.browse : t.categories}</div>
          <ul className="what-combobox__list" id={listId} role="listbox" aria-label={t.categories}>
            {options.map((o, i) => (
              <li
                key={o.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={o.value === category}
                className={i === highlight ? "what-combobox__option is-highlighted" : "what-combobox__option"}
                onPointerEnter={() => setHighlight(i)}
                // Keep focus in the input on a mouse press; pick on click, which a
                // touch only fires on a tap, so swiping to scroll the list picks nothing.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o.value)}
              >
                <span>{categoryLabel(o.value, locale)}</span>
                <span className="what-combobox__count">{o.count}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
