import { pageMetadata } from "../../lib/seo"

export const metadata = pageMetadata({
  title: "Uvjeti korištenja",
  description: "Uvjeti korištenja Transparent.hr: odakle dolaze oglasi, točnost podataka i prijava na oglase na izvornim portalima.",
  path: "/uvjeti-koristenja",
})

export default function TermsPage() {
  return (
    <main className="legal">
      <h1>Uvjeti korištenja</h1>
      <p className="meta">Posljednje ažurirano: lipanj 2026.</p>

      <h2>Što je transparent.hr</h2>
      <p>
        Transparent.hr je agregator oglasa za posao — prikazujemo oglase prikupljene s drugih portala koji otvoreno
        navode plaću. Ne objavljujemo vlastite oglase i ne posredujemo u procesu zapošljavanja.
      </p>

      <h2>Točnost podataka</h2>
      <p>
        Trudimo se da prikazani podaci (plaća, lokacija, naziv pozicije) budu točni i ažurni, ali ne garantiramo
        potpunu točnost — podaci se automatski prikupljaju s vanjskih stranica i mogu sadržavati greške ili biti
        zastarjeli. Za konačne i točne informacije o oglasu, provjeri originalnu stranicu na koju oglas vodi.
      </p>

      <h2>Apliciranje na oglase</h2>
      <p>
        Svaki "Detalji" link vodi na originalni oglas na izvornoj stranici (posao.hr, mojposao.hr i sl.), gdje se i
        odvija prijava. Transparent.hr nije strana u procesu zapošljavanja i ne snosi odgovornost za sadržaj,
        dostupnost ili ishod tih oglasa.
      </p>

      <h2>Korištenje sadržaja</h2>
      <p>
        Sadržaj stranice (osim podataka o oglasima koji potječu s trećih stranica) vlasništvo je transparent.hr.
        Nije dopušteno automatizirano prikupljanje (scraping) podataka s ove stranice bez dopuštenja.
      </p>

      <h2>Ograničenje odgovornosti</h2>
      <p>
        Transparent.hr se koristi "kakav jest", bez garancija. Ne odgovaramo za štetu koja bi mogla proizaći iz
        korištenja stranice ili oslanjanja na prikazane podatke.
      </p>

      <h2>Promjene uvjeta</h2>
      <p>Ovi uvjeti mogu se povremeno ažurirati. Datum posljednje izmjene naveden je na vrhu stranice.</p>

      <h2>Kontakt</h2>
      <p>Pitanja oko ovih uvjeta možeš poslati na info@transparent.hr.</p>
    </main>
  )
}
