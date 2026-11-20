import { Locale } from "./i18n"

// The API speaks Croatian: categories, countries and the net/gross basis are
// stored and filtered by their Croatian names. These give their English
// labels; anything not listed shows as it comes.

// Keep in sync with RULES in shared/category_normalizer.py.
const CATEGORY_EN: Record<string, string> = {
  "IT i telekomunikacije": "IT and telecommunications",
  "Ljudski resursi": "Human resources",
  Management: "Management",
  "Marketing, PR i mediji": "Marketing, PR and media",
  "Financije i računovodstvo": "Finance and accounting",
  Pravo: "Law",
  Administracija: "Administration",
  "Državna služba i neprofitne organizacije": "Public sector and non-profits",
  "Arhitektura, dizajn i umjetnost": "Architecture, design and art",
  Elektrotehnika: "Electrical engineering",
  "Strojarstvo i brodogradnja": "Mechanical engineering and shipbuilding",
  "Graditeljstvo i geodezija": "Construction and surveying",
  "Instalacije, održavanje i popravci": "Installation, maintenance and repair",
  "Proizvodnja i zanatstvo": "Manufacturing and crafts",
  "Skladištenje i logistika": "Warehousing and logistics",
  "Promet i transport": "Transport",
  Prodaja: "Sales",
  "Turizam i ugostiteljstvo": "Tourism and hospitality",
  "Zdravstvo i socijalna skrb": "Healthcare and social care",
  "Farmacija, biotehnologija i kemija": "Pharmacy, biotech and chemistry",
  "Obrazovanje i znanost": "Education and science",
  "Ljepota i sport": "Beauty and sport",
  "Poljoprivreda, šumarstvo i ribarstvo": "Agriculture, forestry and fishing",
  "Sigurnost i zaštita": "Security",
  Ostalo: "Other",
}

// Keep in sync with COUNTRY_KEYWORDS in shared/location_normalizer.py.
const COUNTRY_EN: Record<string, string> = {
  Austrija: "Austria",
  Njemačka: "Germany",
  Švicarska: "Switzerland",
  Italija: "Italy",
  Francuska: "France",
  Nizozemska: "Netherlands",
  Belgija: "Belgium",
  Mađarska: "Hungary",
  Irska: "Ireland",
  Švedska: "Sweden",
  Norveška: "Norway",
  Danska: "Denmark",
  "Velika Britanija": "United Kingdom",
  Poljska: "Poland",
  Češka: "Czechia",
  Grčka: "Greece",
  Španjolska: "Spain",
  Malta: "Malta",
  Cipar: "Cyprus",
  Kanada: "Canada",
  Australija: "Australia",
  Slovenija: "Slovenia",
}

const BASIS_EN: Record<string, string> = { neto: "net", bruto: "gross" }

function label(map: Record<string, string>, value: string, locale: Locale): string {
  return locale === "en" ? map[value] ?? value : value
}

export const categoryLabel = (value: string, locale: Locale) => label(CATEGORY_EN, value, locale)
export const countryLabel = (value: string, locale: Locale) => label(COUNTRY_EN, value, locale)
export const basisLabel = (value: string, locale: Locale) => label(BASIS_EN, value, locale)
