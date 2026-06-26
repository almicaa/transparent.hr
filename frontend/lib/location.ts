// Mirrors backend FOREIGN_LOCATION_KEYWORDS — no structured country field is
// scraped, so foreign ads are recognized by matching well-known country names
// in the free-text location string.
const COUNTRY_KEYWORDS: Record<string, string> = {
  austrija: "Austrija",
  austria: "Austrija",
  njemačka: "Njemačka",
  germany: "Njemačka",
  deutschland: "Njemačka",
  švicarska: "Švicarska",
  switzerland: "Švicarska",
  italija: "Italija",
  italy: "Italija",
  francuska: "Francuska",
  france: "Francuska",
  nizozemska: "Nizozemska",
  netherlands: "Nizozemska",
  holland: "Nizozemska",
  belgija: "Belgija",
  belgium: "Belgija",
  mađarska: "Mađarska",
  hungary: "Mađarska",
  irska: "Irska",
  ireland: "Irska",
  švedska: "Švedska",
  sweden: "Švedska",
  norveška: "Norveška",
  norway: "Norveška",
  danska: "Danska",
  denmark: "Danska",
  "velika britanija": "Velika Britanija",
  "united kingdom": "Velika Britanija",
  england: "Velika Britanija",
  poljska: "Poljska",
  poland: "Poljska",
  češka: "Češka",
  czech: "Češka",
  grčka: "Grčka",
  greece: "Grčka",
  španjolska: "Španjolska",
  spain: "Španjolska",
  malta: "Malta",
  cipar: "Cipar",
  cyprus: "Cipar",
  kanada: "Kanada",
  canada: "Kanada",
  australija: "Australija",
  australia: "Australija",
  slovenija: "Slovenija",
  slovenia: "Slovenija",
}

export function matchCountry(location: string): string | null {
  const lower = location.toLowerCase()
  for (const [keyword, label] of Object.entries(COUNTRY_KEYWORDS)) {
    if (lower.includes(keyword)) return label
  }
  return null
}

export function isForeignLocation(location: string): boolean {
  return matchCountry(location) !== null
}
