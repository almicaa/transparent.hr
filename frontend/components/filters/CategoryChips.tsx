import { categoryIcon, categoryShortLabel } from "../../lib/categories"
import { FilterOption } from "../../lib/types"

interface CategoryChipsProps {
  options: FilterOption[]
  selected: string
  onSelect: (category: string) => void
}

/** One-tap category picker: a scrollable row of chips with job counts. */
export default function CategoryChips({ options, selected, onSelect }: CategoryChipsProps) {
  const chips = selected && !options.some((o) => o.value === selected) ? [{ value: selected, count: 0 }, ...options] : options

  return (
    <div className="chips" role="radiogroup" aria-label="Grana">
      <button
        type="button"
        role="radio"
        aria-checked={!selected}
        className={!selected ? "chip is-selected" : "chip"}
        onClick={() => onSelect("")}
      >
        Sve grane
      </button>
      {chips.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={selected === o.value}
          title={o.value}
          className={selected === o.value ? "chip is-selected" : "chip"}
          // Tapping the selected chip again clears it.
          onClick={() => onSelect(selected === o.value ? "" : o.value)}
        >
          <span aria-hidden="true">{categoryIcon(o.value)}</span>
          {categoryShortLabel(o.value)}
          <span className="chip__count">{o.count}</span>
        </button>
      ))}
    </div>
  )
}
