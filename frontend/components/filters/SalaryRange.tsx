import { useEffect, useState } from "react"
import { SalaryBucket } from "../../lib/types"

// Must match SALARY_HISTOGRAM_MIN / _MAX / SALARY_BUCKET_SIZE in backend job_service.py.
const MIN = 500
const MAX = 4000
const BUCKET = 250
const STEP = 50
const COMMIT_DELAY_MS = 300

function euro(n: number): string {
  return `${n.toLocaleString("hr-HR")} €`
}

function rangeLabel(lo: number, hi: number): string {
  if (lo <= MIN && hi >= MAX) return "Bilo koja plaća"
  if (hi >= MAX) return `od ${euro(lo)}`
  if (lo <= MIN) return `do ${euro(hi)}`
  return `${euro(lo)} – ${euro(hi)}`
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
        <span>Plaća</span>
        <strong>{rangeLabel(lo, hi)}</strong>
      </div>

      <div className="salary-range__histogram" aria-hidden="true">
        {histogram.map((b) => {
          const inRange = b.start + BUCKET > lo && (b.start < hi || hi >= MAX)
          return (
            <div
              key={b.start}
              className={inRange ? "salary-range__bar is-in-range" : "salary-range__bar"}
              style={{ height: `${Math.max(4, (b.count / tallest) * 100)}%` }}
              title={`${euro(b.start)}${b.start >= MAX ? "+" : ` – ${euro(b.start + BUCKET)}`}: ${b.count}`}
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
          aria-label="Minimalna plaća"
          aria-valuetext={euro(lo)}
          onChange={(e) => setLo(Math.min(Number(e.target.value), hi - STEP))}
        />
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={STEP}
          value={hi}
          aria-label="Maksimalna plaća"
          aria-valuetext={hi >= MAX ? `${euro(MAX)} i više` : euro(hi)}
          onChange={(e) => setHi(Math.max(Number(e.target.value), lo + STEP))}
        />
      </div>
    </div>
  )
}
