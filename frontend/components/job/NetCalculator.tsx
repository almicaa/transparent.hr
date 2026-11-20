"use client"

import { useMemo, useRef, useState } from "react"
import { trackEvent } from "../../lib/analytics"
import { CITY_RATES, DEFAULT_RATES, grossToNet, ratesForLocation } from "../../lib/netSalary"
import { Job } from "../../lib/types"
import { euro as formatEuro, formatNumber } from "../../lib/format"
import { Locale } from "../../lib/i18n"
import { useLocale } from "../i18n/LocaleProvider"

function percent(rate: number, locale: Locale): string {
  return `${formatNumber(rate * 100, locale)}%`
}

const COPY = {
  hr: {
    open: "Izračunaj neto",
    title: "Bruto → neto",
    close: "Zatvori",
    estimate: "Procijenjena neto plaća",
    grossFrom: "Bruto od",
    gross: "Bruto",
    grossTo: "Bruto do",
    city: "Grad (porez)",
    otherCity: "Ostalo",
    children: "Djeca",
    dependents: "Uzdržavani članovi",
    breakdown: "Izračun",
    breakdownFor: (amount: string) => `Izračun za ${amount} bruto`,
    pillar1: "Mirovinsko I. stup (15%)",
    pillar2: "Mirovinsko II. stup (5%)",
    allowance: "Osobni odbitak",
    tax: "Porez",
    net: "Neto",
    note: "Procjena prema propisima za 2026. Mladi do 25 godina dobivaju cijeli porez natrag, a od 26 do 30 godina polovicu, kroz godišnji povrat poreza.",
  },
  en: {
    open: "Work out net pay",
    title: "Gross → net",
    close: "Close",
    estimate: "Estimated net pay",
    grossFrom: "Gross from",
    gross: "Gross",
    grossTo: "Gross to",
    city: "City (tax rate)",
    otherCity: "Other",
    children: "Children",
    dependents: "Dependants",
    breakdown: "Breakdown",
    breakdownFor: (amount: string) => `Breakdown for ${amount} gross`,
    pillar1: "Pension, 1st pillar (15%)",
    pillar2: "Pension, 2nd pillar (5%)",
    allowance: "Personal allowance",
    tax: "Income tax",
    net: "Net",
    note: "An estimate under the 2026 rules. People under 25 get all of their income tax back, and those aged 26 to 30 get half, through the yearly tax refund.",
  },
}

const ALL_RATES = [...CITY_RATES, DEFAULT_RATES]

/**
 * "Izračunaj neto" for bruto ads: a button that opens a gross → net calculator
 * prefilled with the ad's amount(s) and the city's tax rates.
 */
export default function NetCalculator({ job }: { job: Job }) {
  const locale = useLocale()
  const t = COPY[locale]
  const euro = (n: number) => formatEuro(n, locale)
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

  // The calculator works on monthly pay.
  if (job.salary_basis !== "bruto" || job.salary_min === null || job.salary_period) return null

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
          trackEvent("net_calculator_open", { job_id: job.id })
        }}
      >
        {t.open}
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
              <h2 id={`net-calc-title-${job.id}`}>{t.title}</h2>
              <p lang="hr">{job.title}</p>
            </div>
            <button type="button" className="net-calc__close" aria-label={t.close} onClick={() => dialogRef.current?.close()}>
              ✕
            </button>
          </div>

          <div className="net-calc__result" aria-live="polite">
            <span className="net-calc__result-label">{t.estimate}</span>
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
              <span>{isRange ? t.grossFrom : t.gross}</span>
              <input type="number" inputMode="decimal" min={0} value={grossMin} onChange={(e) => setGrossMin(e.target.value)} />
            </label>
            {isRange ? (
              <label>
                <span>{t.grossTo}</span>
                <input type="number" inputMode="decimal" min={0} value={grossMax} onChange={(e) => setGrossMax(e.target.value)} />
              </label>
            ) : null}
            <label className="net-calc__wide">
              <span>{t.city}</span>
              <select value={city} onChange={(e) => setCity(e.target.value)}>
                {ALL_RATES.map((r) => (
                  <option key={r.city} value={r.city}>
                    {r === DEFAULT_RATES ? t.otherCity : r.city} — {percent(r.lower, locale)} / {percent(r.higher, locale)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t.children}</span>
              <select value={children} onChange={(e) => setChildren(Number(e.target.value))}>
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t.dependents}</span>
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
              <caption>{isRange ? t.breakdownFor(euro(low.gross)) : t.breakdown}</caption>
              <tbody>
                <tr>
                  <th scope="row">{t.gross}</th>
                  <td>{euro(low.gross)}</td>
                </tr>
                <tr>
                  <th scope="row">{t.pillar1}</th>
                  <td>− {euro(low.pillar1)}</td>
                </tr>
                <tr>
                  <th scope="row">{t.pillar2}</th>
                  <td>− {euro(low.pillar2)}</td>
                </tr>
                <tr>
                  <th scope="row">{t.allowance}</th>
                  <td>{euro(low.allowance)}</td>
                </tr>
                <tr>
                  <th scope="row">
                    {t.tax} ({percent(rates.lower, locale)}
                    {low.taxBase > 5000 ? ` / ${percent(rates.higher, locale)}` : ""})
                  </th>
                  <td>− {euro(low.tax)}</td>
                </tr>
                <tr className="net-calc__total">
                  <th scope="row">{t.net}</th>
                  <td>{euro(low.net)}</td>
                </tr>
              </tbody>
            </table>
          ) : null}

          <p className="net-calc__note">
            {t.note}
          </p>
        </div>
      </dialog>
    </>
  )
}
