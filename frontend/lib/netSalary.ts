// Croatian gross → net monthly salary, 2026 rules. An estimate for comparing
// ads, not a payroll calculation; sources checked October 2026:
// - mirovinsko: 15% I. stup + 5% II. stup on gross
// - I. stup base reduced for gross ≤ 1.300 €: 300 € up to 700 €, else 0,5 × (1.300 − gross)
// - osobni odbitak 600 €, plus 300 € per dependent and 300/420/600/840/1.140 € per child
// - income tax: city's lower rate up to 5.000 € taxable a month, higher rate above
// Youth relief (under 30) is paid back yearly, so it's not part of the monthly net.

export const BASE_ALLOWANCE = 600
const DEPENDENT_ALLOWANCE = 300
// 1st, 2nd, 3rd… child: factors 0.5, 0.7, 1.0, 1.4, 1.9 of 600 €.
const CHILD_ALLOWANCES = [300, 420, 600, 840, 1140]
const LOWER_BRACKET_LIMIT = 5000
const PILLAR_1_RATE = 0.15
const PILLAR_2_RATE = 0.05

export interface CityRates {
  city: string
  lower: number
  higher: number
}

/** 2026 rates for the larger cities, from Porezna uprava's "Tablica poreznih stopa godišnjeg
 * poreza na dohodak za 2026." (checked November 2026). Anything else falls back to 20% / 30%. */
export const CITY_RATES: CityRates[] = [
  { city: "Zagreb", lower: 0.23, higher: 0.33 },
  { city: "Split", lower: 0.215, higher: 0.32 },
  { city: "Rijeka", lower: 0.2, higher: 0.25 },
  { city: "Osijek", lower: 0.2, higher: 0.3 },
  { city: "Zadar", lower: 0.2, higher: 0.3 },
  { city: "Pula", lower: 0.22, higher: 0.32 },
  { city: "Varaždin", lower: 0.21, higher: 0.32 },
  { city: "Bjelovar", lower: 0.18, higher: 0.25 },
  { city: "Karlovac", lower: 0.19, higher: 0.29 },
  { city: "Šibenik", lower: 0.2, higher: 0.3 },
  { city: "Sisak", lower: 0.216, higher: 0.316 },
  { city: "Dubrovnik", lower: 0.2, higher: 0.3 },
  { city: "Velika Gorica", lower: 0.2, higher: 0.3 },
  { city: "Slavonski Brod", lower: 0.2, higher: 0.3 },
]
export const DEFAULT_RATES: CityRates = { city: "Ostalo", lower: 0.2, higher: 0.3 }

/** Best guess at the tax city from a free-text job location ("Zagreb (Sesvete)" → Zagreb). */
export function ratesForLocation(location: string | null): CityRates {
  const lower = (location ?? "").toLowerCase()
  return CITY_RATES.find((r) => lower.includes(r.city.toLowerCase())) ?? DEFAULT_RATES
}

export interface NetBreakdown {
  gross: number
  pillar1: number
  pillar2: number
  income: number
  allowance: number
  taxBase: number
  tax: number
  net: number
}

export function grossToNet(gross: number, rates: CityRates, children = 0, dependents = 0): NetBreakdown {
  const pillar1Reduction = gross <= 700 ? 300 : gross <= 1300 ? 0.5 * (1300 - gross) : 0
  const pillar1 = Math.max(0, gross - pillar1Reduction) * PILLAR_1_RATE
  const pillar2 = gross * PILLAR_2_RATE
  const income = gross - pillar1 - pillar2

  const allowance =
    BASE_ALLOWANCE +
    dependents * DEPENDENT_ALLOWANCE +
    CHILD_ALLOWANCES.slice(0, children).reduce((sum, a) => sum + a, 0)
  const taxBase = Math.max(0, income - allowance)
  const tax =
    Math.min(taxBase, LOWER_BRACKET_LIMIT) * rates.lower + Math.max(0, taxBase - LOWER_BRACKET_LIMIT) * rates.higher

  return { gross, pillar1, pillar2, income, allowance, taxBase, tax, net: income - tax }
}
