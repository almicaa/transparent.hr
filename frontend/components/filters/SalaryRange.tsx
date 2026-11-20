import { useEffect, useState } from "react"
import { SalaryBucket } from "../../lib/types"
import { euro } from "../../lib/format"
import { Locale } from "../../lib/i18n"
import { useLocale } from "../i18n/LocaleProvider"

// Must match SALARY_HISTOGRAM_MIN / _MAX / SALARY_BUCKET_SIZE in backend job_service.py.
const MIN = 500
const MAX = 4000
const BUCKET = 250
const STEP = 50
const COMMIT_DELAY_MS = 300

const COPY = {
  hr: { any: "Bilo koja plaća", from: "od", upTo: "do", salary: "Plaća", min: "Minimalna plaća", max: "Maksimalna plaća", orMore: "i više" },
  en: { any: "Any salary", from: "from", upTo: "up to", salary: "Salary", min: "Minimum salary", max: "Maximum salary", orMore: "or more" },
}

function rangeLabel(lo: number, hi: number, locale: Locale): string {
  const t = COPY[locale]
  if (lo <= MIN && hi >= MAX) return t.any
  if (hi >= MAX) return `${t.from} ${euro(lo, locale)}`
  if (lo <= MIN) return `${t.upTo} ${euro(hi, locale)}`
  return `${euro(lo, locale)} – ${euro(hi, locale)}`
}

interface SalaryRangeProps {
  histogram: SalaryBucket[]
  /** Current bounds as filter strings, "" meaning unbounded. */
  min: string
  max: string
  onChange: (min: string, max: string) => void
}

/** Dual-handle salary range over a histogram of what the listed jobs actually pay. */
export default function SalaryRange({ histogram, min, max, onChange }: SalaryRangeProps) {
  const locale = useLocale()
  const t = COPY[locale]
  const money = (n: number) => euro(n, locale)
  const [lo, setLo] = useState(min ? Number(min) : MIN)
  const [hi, setHi] = useState(max ? Number(max) : MAX)

  // Follow outside changes (reset button, URL) without fighting an in-progress drag.
  useEffect(() => setLo(min ? Number(min) : MIN), [min])
  useEffect(() => setHi(max ? Number(max) : MAX), [max])

  // Commit once the handle settles, so dragging doesn't fire a request per pixel.
  useEffect(() => {
    const next = [lo <= MIN ? "" : String(lo), hi >= MAX ? "" : String(hi)]
    if (next[0] === min && next[1] === max) return
    const t = setTimeout(() => onChange(next[0], next[1]), COMMIT_DELAY_MS)
    return () => clearTimeout(t)
    // Only the handles drive this; min/max/onChange changing on their own isn't a commit.
  }, [lo, hi])

  const tallest = Math.max(1, ...histogram.map((b) => b.count))
  const pct = (v: number) => ((v - MIN) / (MAX - MIN)) * 100
  const active = lo > MIN || hi < MAX

  return (
    <div className={active ? "salary-range is-active" : "salary-range"}>
      <div className="salary-range__label">
        <span>{t.salary}</span>
        <strong>{rangeLabel(lo, hi, locale)}</strong>
      </div>

      <div className="salary-range__histogram" aria-hidden="true">
        {histogram.map((b) => {
          const inRange = b.start + BUCKET > lo && (b.start < hi || hi >= MAX)
          return (
            <div
              key={b.start}
              className={inRange ? "salary-range__bar is-in-range" : "salary-range__bar"}
              style={{ height: `${Math.max(4, (b.count / tallest) * 100)}%` }}
              title={`${money(b.start)}${b.start >= MAX ? "+" : ` – ${money(b.start + BUCKET)}`}: ${b.count}`}
            />
          )
        })}
      </div>

      <div className="salary-range__track">
        <div className="salary-range__fill" style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} />
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={STEP}
          value={lo}
          aria-label={t.min}
          aria-valuetext={money(lo)}
          onChange={(e) => setLo(Math.min(Number(e.target.value), hi - STEP))}
        />
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={STEP}
          value={hi}
          aria-label={t.max}
          aria-valuetext={hi >= MAX ? `${money(MAX)} ${t.orMore}` : money(hi)}
          onChange={(e) => setHi(Math.max(Number(e.target.value), lo + STEP))}
        />
      </div>
    </div>
  )
}
