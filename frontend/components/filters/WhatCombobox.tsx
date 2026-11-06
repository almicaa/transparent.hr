import { useEffect, useId, useMemo, useRef, useState } from "react"
import { FilterOption } from "../../lib/types"

function fold(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d")
}

interface WhatComboboxProps {
  search: string
  category: string
  onSearch: (search: string) => void
  onCategory: (category: string) => void
  categoryOptions: FilterOption[]
  /** Open the full grana menu on an empty field. Off on /jobs, where the sidebar lists the grane. */
  megaMenu?: boolean
}

/**
 * The "Što" field: free text searches positions and companies, and the same
 * field picks a grana. Focusing it with nothing typed opens a mega menu of all
 * grane; typing narrows it to matching ones while the text search runs as usual.
 */
export default function WhatCombobox({
  search,
  category,
  onSearch,
  onCategory,
  categoryOptions,
  megaMenu = true,
}: WhatComboboxProps) {
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
  const options = useMemo(
    () => (q ? categoryOptions.filter((o) => fold(o.value).includes(q)) : megaMenu ? categoryOptions : []),
    [q, categoryOptions, megaMenu],
  )
  const isMega = !q

  useEffect(() => setHighlight(-1), [q])

  function choose(next: string) {
    onCategory(next)
    // The text was only typed to find the grana, so it shouldn't also filter.
    if (q) onSearch("")
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
      onCategory("")
    }
  }

  return (
    <div className="what-combobox" ref={rootRef}>
      <div className="what-combobox__control">
        {category ? (
          <button
            type="button"
            className="what-combobox__chip"
            aria-label={`Ukloni granu ${category}`}
            onClick={() => {
              onCategory("")
              inputRef.current?.focus()
            }}
          >
            {category}
            <span aria-hidden="true">✕</span>
          </button>
        ) : null}
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label="Pozicija, tvrtka ili grana"
          aria-expanded={open && options.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options[highlight] ? `${listId}-${highlight}` : undefined}
          placeholder={category ? "Pozicija ili tvrtka" : "Pozicija, tvrtka ili grana"}
          value={search}
          onFocus={() => setOpen(true)}
          // Clicking an already-focused field (e.g. right after picking) must reopen it too.
          onClick={() => setOpen(true)}
          onChange={(e) => {
            onSearch(e.target.value)
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
        />
      </div>

      {open && options.length ? (
        <div className={isMega ? "what-combobox__panel is-mega" : "what-combobox__panel"}>
          <div className="what-combobox__heading">{isMega ? "Pretraži po grani" : "Grane"}</div>
          <ul className="what-combobox__list" id={listId} role="listbox" aria-label="Grane">
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
                <span>{o.value}</span>
                <span className="what-combobox__count">{o.count}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
