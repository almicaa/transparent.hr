"use client"

import { useState } from "react"
import { SourceCount } from "../../lib/types"
import { SOURCE_LABELS } from "../../lib/sourceLabels"

export default function SourcesBreakdown({ sources }: { sources: SourceCount[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="stat stat--clickable" onClick={() => setOpen((o) => !o)}>
      <div className="stat__value">{sources.length}</div>
      <div className="meta">Broj portala {open ? "▲" : "▼"}</div>
      {open ? (
        <ul className="stat__breakdown">
          {sources.map((s) => (
            <li key={s.source}>
              {SOURCE_LABELS[s.source] || s.source}: <strong>{s.cnt}</strong>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
