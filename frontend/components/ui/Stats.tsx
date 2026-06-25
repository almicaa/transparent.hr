export default function Stats({
  total = 0,
  totalWithSalary = 0,
  portals = 0,
  lastUpdate = null,
}: {
  total?: number
  totalWithSalary?: number
  portals?: number
  lastUpdate?: string | null
}) {
  return (
    <div className="stats">
      <div className="stat">
        <div className="stat__value">{totalWithSalary}</div>
        <div className="meta">Ukupno oglasa s plaćom</div>
      </div>
      <div className="stat">
        <div className="stat__value">{portals}</div>
        <div className="meta">Broj portala</div>
      </div>
      <div className="stat">
        <div className="stat__value stat__value--sm">{lastUpdate || "-"}</div>
        <div className="meta">Zadnje ažuriranje</div>
      </div>
    </div>
  )
}
