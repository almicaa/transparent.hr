// Display helpers for the canonical categories from shared/category_normalizer.py.

const CATEGORY_DISPLAY: Record<string, { icon: string; short: string }> = {
  "IT i telekomunikacije": { icon: "💻", short: "IT" },
  "Ljudski resursi": { icon: "🤝", short: "Ljudski resursi" },
  Management: { icon: "📊", short: "Management" },
  "Marketing, PR i mediji": { icon: "📣", short: "Marketing i PR" },
  "Financije i računovodstvo": { icon: "💶", short: "Financije" },
  Pravo: { icon: "⚖️", short: "Pravo" },
  Administracija: { icon: "🗂️", short: "Administracija" },
  "Državna služba i neprofitne organizacije": { icon: "🏛️", short: "Državna služba" },
  "Arhitektura, dizajn i umjetnost": { icon: "🎨", short: "Dizajn" },
  Elektrotehnika: { icon: "⚡", short: "Elektrotehnika" },
  "Strojarstvo i brodogradnja": { icon: "⚙️", short: "Strojarstvo" },
  "Graditeljstvo i geodezija": { icon: "🏗️", short: "Graditeljstvo" },
  "Instalacije, održavanje i popravci": { icon: "🔧", short: "Održavanje" },
  "Proizvodnja i zanatstvo": { icon: "🏭", short: "Proizvodnja" },
  "Skladištenje i logistika": { icon: "📦", short: "Logistika" },
  "Promet i transport": { icon: "🚚", short: "Transport" },
  Prodaja: { icon: "🛒", short: "Prodaja" },
  "Turizam i ugostiteljstvo": { icon: "🍽️", short: "Ugostiteljstvo" },
  "Zdravstvo i socijalna skrb": { icon: "🩺", short: "Zdravstvo" },
  "Farmacija, biotehnologija i kemija": { icon: "🧪", short: "Farmacija" },
  "Obrazovanje i znanost": { icon: "🎓", short: "Obrazovanje" },
  "Ljepota i sport": { icon: "💇", short: "Ljepota i sport" },
  "Poljoprivreda, šumarstvo i ribarstvo": { icon: "🌾", short: "Poljoprivreda" },
  "Sigurnost i zaštita": { icon: "🛡️", short: "Sigurnost" },
  Ostalo: { icon: "✨", short: "Ostalo" },
}

export function categoryIcon(category: string): string {
  return CATEGORY_DISPLAY[category]?.icon ?? "•"
}

export function categoryShortLabel(category: string): string {
  return CATEGORY_DISPLAY[category]?.short ?? category
}
