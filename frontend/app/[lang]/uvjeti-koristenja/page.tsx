import { LangProps } from "../../../lib/i18n"
import { pageMetadata } from "../../../lib/seo"

const META = {
  hr: {
    title: "Uvjeti korištenja",
    description: "Uvjeti korištenja Transparent.hr: odakle dolaze oglasi, točnost podataka i prijava na oglase na izvornim portalima.",
  },
  en: {
    title: "Terms of use",
    description: "Transparent.hr terms of use: where the job ads come from, data accuracy, and applying on the original job sites.",
  },
}

export function generateMetadata({ params }: LangProps) {
  return pageMetadata({ locale: params.lang, ...META[params.lang], path: "/uvjeti-koristenja" })
}

export default function TermsPage({ params }: LangProps) {
  return params.lang === "en" ? <English /> : <Croatian />
}

function Croatian() {
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

function English() {
  return (
    <main className="legal">
      <h1>Terms of use</h1>
      <p className="meta">Last updated: June 2026</p>

      <h2>What transparent.hr is</h2>
      <p>
        Transparent.hr is a job ad aggregator: we show ads collected from other job sites that openly state the salary.
        We don&apos;t publish our own ads and we don&apos;t act as an intermediary in hiring.
      </p>

      <h2>Accuracy of the data</h2>
      <p>
        We do our best to keep the data shown (salary, location, job title) accurate and up to date, but we can&apos;t
        guarantee it is fully accurate: the data is collected automatically from other sites and may contain errors or
        be out of date. For final and accurate information about an ad, check the original page it links to.
      </p>

      <h2>Applying for jobs</h2>
      <p>
        Every ad links to the original ad on the source site (posao.hr, mojposao.hr and others), where the application
        takes place. Transparent.hr is not a party to the hiring process and is not responsible for the content,
        availability or outcome of those ads.
      </p>

      <h2>Use of content</h2>
      <p>
        The content of this site (except job ad data that comes from third-party sites) belongs to transparent.hr.
        Automated collection (scraping) of data from this site is not allowed without permission.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        Transparent.hr is provided &quot;as is&quot;, without warranties. We are not liable for any damage that may result
        from using the site or relying on the data shown.
      </p>

      <h2>Changes to these terms</h2>
      <p>These terms may be updated from time to time. The date of the last change is shown at the top of the page.</p>

      <h2>Contact</h2>
      <p>Questions about these terms can be sent to info@transparent.hr.</p>
    </main>
  )
}
