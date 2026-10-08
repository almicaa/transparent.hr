"use client"

import { useMemo, useRef, useState } from "react"
import { CITY_RATES, DEFAULT_RATES, grossToNet, ratesForLocation } from "../../lib/netSalary"
import { Job } from "../../lib/types"

function euro(n: number): string {
  return `${Math.round(n).toLocaleString("hr-HR")} €`
}

function percent(rate: number): string {
  return `${(rate * 100).toLocaleString("hr-HR")}%`
}

const ALL_RATES = [...CITY_RATES, DEFAULT_RATES]

/**
 * "Izračunaj neto" for bruto ads: a button that opens a gross → net calculator
 * prefilled with the ad's amount(s) and the city's tax rates.
 */
export default function NetCalculator({ job }: { job: Job }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isRange = job.salary_max !== null && job.salary_max !== job.salary_min
  const [grossMin, setGrossMin] = useState(String(job.salary_min ?? ""))
  const [grossMax, setGrossMax] = useState(String(job.salary_max ?? ""))
  const [city, setCity] = useState(ratesForLocation(job.location).city)
  const [children, setChildren] = useState(0)
  const [dependents, setDependents] = useState(0)

  const rates = ALL_RATES.find((r) => r.city === city) ?? DEFAULT_RATES
  const low = useMemo(
    () => (Number(grossMin) > 0 ? grossToNet(Number(grossMin), rates, children, dependents) : null),
    [grossMin, rates, children, dependents],
  )
  const high = useMemo(
    () => (isRange && Number(grossMax) > 0 ? grossToNet(Number(grossMax), rates, children, dependents) : null),
    [isRange, grossMax, rates, children, dependents],
  )

  if (job.salary_basis !== "bruto" || job.salary_min === null) return null

  return (
    <>
      <button
        type="button"
        className="net-calc__trigger"
        onClick={(e) => {
          // The card's title link covers the whole card; don't navigate.
          e.preventDefault()
          e.stopPropagation()
          dialogRef.current?.showModal()
        }}
      >
        Izračunaj neto
      </button>

      <dialog
        ref={dialogRef}
        className="net-calc"
        aria-labelledby={`net-calc-title-${job.id}`}
        // Clicking the backdrop (the dialog element itself, outside its content) closes it.
        onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
      >
        <div className="net-calc__content">
          <div className="net-calc__header">
            <div>
              <h2 id={`net-calc-title-${job.id}`}>Bruto → neto</h2>
              <p>{job.title}</p>
            </div>
            <button type="button" className="net-calc__close" aria-label="Zatvori" onClick={() => dialogRef.current?.close()}>
              ✕
            </button>
          </div>

          <div className="net-calc__result" aria-live="polite">
            <span className="net-calc__result-label">Procijenjena neto plaća</span>
            <strong>
              {low
                ? high && Math.round(high.net) !== Math.round(low.net)
                  ? `${euro(Math.min(low.net, high.net))} – ${euro(Math.max(low.net, high.net))}`
                  : euro(low.net)
                : "—"}
            </strong>
          </div>

          <div className="net-calc__inputs">
            <label>
              <span>{isRange ? "Bruto od" : "Bruto"}</span>
              <input type="number" inputMode="decimal" min={0} value={grossMin} onChange={(e) => setGrossMin(e.target.value)} />
            </label>
            {isRange ? (
              <label>
                <span>Bruto do</span>
                <input type="number" inputMode="decimal" min={0} value={grossMax} onChange={(e) => setGrossMax(e.target.value)} />
              </label>
            ) : null}
            <label className="net-calc__wide">
              <span>Grad (porez)</span>
              <select value={city} onChange={(e) => setCity(e.target.value)}>
                {ALL_RATES.map((r) => (
                  <option key={r.city} value={r.city}>
                    {r.city} — {percent(r.lower)} / {percent(r.higher)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Djeca</span>
              <select value={children} onChange={(e) => setChildren(Number(e.target.value))}>
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Uzdržavani članovi</span>
              <select value={dependents} onChange={(e) => setDependents(Number(e.target.value))}>
                {[0, 1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {low ? (
            <table className="net-calc__breakdown">
              <caption>Izračun{isRange ? ` za ${euro(low.gross)} bruto` : ""}</caption>
              <tbody>
                <tr>
                  <th scope="row">Bruto</th>
                  <td>{euro(low.gross)}</td>
                </tr>
                <tr>
                  <th scope="row">Mirovinsko I. stup (15%)</th>
                  <td>− {euro(low.pillar1)}</td>
                </tr>
                <tr>
                  <th scope="row">Mirovinsko II. stup (5%)</th>
                  <td>− {euro(low.pillar2)}</td>
                </tr>
                <tr>
                  <th scope="row">Osobni odbitak</th>
                  <td>{euro(low.allowance)}</td>
                </tr>
                <tr>
                  <th scope="row">
                    Porez ({percent(rates.lower)}
                    {low.taxBase > 5000 ? ` / ${percent(rates.higher)}` : ""})
                  </th>
                  <td>− {euro(low.tax)}</td>
                </tr>
                <tr className="net-calc__total">
                  <th scope="row">Neto</th>
                  <td>{euro(low.net)}</td>
                </tr>
              </tbody>
            </table>
          ) : null}

          <p className="net-calc__note">
            Procjena prema propisima za 2026. Mladi do 25 godina dobivaju cijeli porez natrag, a od 26 do 30 godina
            polovicu, kroz godišnji povrat poreza.
          </p>
        </div>
      </dialog>
    </>
  )
}
