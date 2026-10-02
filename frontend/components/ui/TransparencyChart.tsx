"use client"

import { useMemo, useState } from "react"
import { SalaryStatPoint } from "../../lib/api"
import { SOURCE_LABELS } from "../../lib/sourceLabels"

// posao.hr was excluded after commit f41321e found its old page-count
// estimate was counting the same ads up to 17x over. It now walks every
// real page of the salary-filtered listing and counts distinct job links,
// confirmed stable (4.3%-5.1%) across the days since that fix — the page.tsx
// caller filters out the pre-fix rows before they ever reach this component.
const SOURCE_ORDER = ["posao", "mojposao"]
const SERIES_COLOR: Record<string, string> = {
  posao: "#eb6834",
  mojposao: "#1D9E9E",
}

const WIDTH = 720
const HEIGHT = 320
const PAD = { top: 20, right: 88, bottom: 32, left: 36 }
const PLOT_W = WIDTH - PAD.left - PAD.right
const PLOT_H = HEIGHT - PAD.top - PAD.bottom

const MONTHS = ["sij", "velj", "ožu", "tra", "svi", "lip", "srp", "kol", "ruj", "lis", "stu", "pro"]

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()}. ${MONTHS[d.getMonth()]}`
}

interface Series {
  source: string
  points: { ts: number; date: string; pct: number }[]
}

export default function TransparencyChart({ data }: { data: SalaryStatPoint[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const { series, allDates, xMin, xMax, yMax } = useMemo(() => {
    const series: Series[] = SOURCE_ORDER.filter((s) => data.some((d) => d.source === s)).map((source) => ({
      source,
      points: data
        .filter((d) => d.source === source)
        .map((d) => ({ ts: new Date(d.date).getTime(), date: d.date, pct: d.pct }))
        .sort((a, b) => a.ts - b.ts),
    }))
    const allDates = Array.from(new Set(data.map((d) => d.date))).sort()
    const timestamps = allDates.map((d) => new Date(d).getTime())
    const maxPct = Math.max(10, ...data.map((d) => d.pct))
    return {
      series,
      allDates,
      xMin: Math.min(...timestamps),
      xMax: Math.max(...timestamps),
      yMax: Math.ceil(maxPct / 10) * 10,
    }
  }, [data])

  if (allDates.length < 2) return null

  const xScale = (ts: number) => PAD.left + ((ts - xMin) / (xMax - xMin || 1)) * PLOT_W
  const yScale = (pct: number) => PAD.top + (1 - pct / yMax) * PLOT_H

  const yTicks = Array.from({ length: yMax / 10 + 1 }, (_, i) => i * 10)
  const xTickDates = [allDates[0], allDates[Math.floor(allDates.length / 2)], allDates[allDates.length - 1]]

  const hoverDate = hoverIdx !== null ? allDates[hoverIdx] : null
  const hoverX = hoverDate ? xScale(new Date(hoverDate).getTime()) : null

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const fraction = (e.clientX - rect.left) / rect.width
    const svgX = fraction * WIDTH
    const ts = xMin + ((svgX - PAD.left) / PLOT_W) * (xMax - xMin)
    let nearest = 0
    let best = Infinity
    allDates.forEach((d, i) => {
      const diff = Math.abs(new Date(d).getTime() - ts)
      if (diff < best) {
        best = diff
        nearest = i
      }
    })
    setHoverIdx(nearest)
  }

  return (
    <div className="transparency-chart">
      <div className="transparency-chart__legend">
        {series.map((s) => (
          <span key={s.source} className="transparency-chart__legend-item">
            <span className="transparency-chart__line-key" style={{ background: SERIES_COLOR[s.source] }} />
            {SOURCE_LABELS[s.source] || s.source}
          </span>
        ))}
      </div>

      <div style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height="auto"
        role="img"
        aria-label="Postotak oglasa s prikazanom plaćom kroz vrijeme, po izvoru"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIdx(null)}
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={yScale(t)}
              y2={yScale(t)}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text x={PAD.left - 8} y={yScale(t)} textAnchor="end" dominantBaseline="middle" className="transparency-chart__axis-label">
              {t}%
            </text>
          </g>
        ))}

        {xTickDates.map((d, i) => (
          <text
            key={d}
            x={xScale(new Date(d).getTime())}
            y={HEIGHT - PAD.bottom + 20}
            textAnchor={i === 0 ? "start" : i === xTickDates.length - 1 ? "end" : "middle"}
            className="transparency-chart__axis-label"
          >
            {formatDate(d)}
          </text>
        ))}

        {hoverX !== null && (
          <line x1={hoverX} x2={hoverX} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="var(--muted)" strokeWidth={1} />
        )}

        {series.map((s) => {
          const path = s.points.map((p) => `${xScale(p.ts)},${yScale(p.pct)}`).join(" L ")
          const last = s.points[s.points.length - 1]
          return (
            <g key={s.source}>
              <path d={`M ${path}`} fill="none" stroke={SERIES_COLOR[s.source]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={xScale(last.ts)} cy={yScale(last.pct)} r={4} fill={SERIES_COLOR[s.source]} stroke="#fff" strokeWidth={2} />
              <text
                x={xScale(last.ts) + 10}
                y={yScale(last.pct)}
                dominantBaseline="middle"
                className="transparency-chart__end-label"
              >
                {last.pct}%
              </text>
              {hoverDate &&
                s.points
                  .filter((p) => p.date === hoverDate)
                  .map((p) => (
                    <circle key={p.date} cx={xScale(p.ts)} cy={yScale(p.pct)} r={4} fill={SERIES_COLOR[s.source]} stroke="#fff" strokeWidth={2} />
                  ))}
            </g>
          )
        })}
      </svg>

      {hoverDate && hoverX !== null && (
        <div
          className="transparency-chart__tooltip"
          style={{
            left: `${(hoverX / WIDTH) * 100}%`,
            top: 8,
          }}
        >
          <div className="transparency-chart__tooltip-date">{formatDate(hoverDate)}</div>
          {series.map((s) => {
            const point = s.points.find((p) => p.date === hoverDate)
            if (!point) return null
            return (
              <div key={s.source} className="transparency-chart__tooltip-row">
                <span className="transparency-chart__line-key" style={{ background: SERIES_COLOR[s.source] }} />
                <strong>{point.pct}%</strong>
                <span className="meta">{SOURCE_LABELS[s.source] || s.source}</span>
              </div>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}
