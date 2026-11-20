import Link from "next/link"
import { LangProps, localePath } from "../../../lib/i18n"
import { pageMetadata } from "../../../lib/seo"

const META = {
  hr: {
    title: "Politika privatnosti",
    description: "Koje podatke Transparent.hr prikuplja, kako koristi Google Analytics i kolačiće te kako nas kontaktirati.",
  },
  en: {
    title: "Privacy policy",
    description: "What data Transparent.hr collects, how it uses Google Analytics and cookies, and how to contact us.",
  },
}

export function generateMetadata({ params }: LangProps) {
  return pageMetadata({ locale: params.lang, ...META[params.lang], path: "/privatnost" })
}

export default function PrivacyPage({ params }: LangProps) {
  return params.lang === "en" ? <English /> : <Croatian />
}

function Croatian() {
  return (
    <main className="legal">
      <h1>Politika privatnosti</h1>
      <p className="meta">Posljednje ažurirano: studeni 2026.</p>

      <h2>Tko smo</h2>
      <p>
        Transparent.hr je servis koji agregira javno dostupne oglase za posao s hrvatskih portala (npr. posao.hr,
        mojposao.hr) i prikazuje samo one oglase koji otvoreno navode plaću. Kontakt: info@transparent.hr.
      </p>

      <h2>Kolačići i praćenje</h2>
      <p>
        Transparent.hr koristi <strong>Google Analytics</strong> kako bi razumio kako posjetitelji koriste stranicu
        (broj posjeta, koje stranice su popularne, odakle dolaze posjetitelji). Google Analytics prikuplja anonimne
        podatke putem kolačića. Ova analitika aktivira se <strong>samo uz tvoju suglasnost</strong> — pri prvom
        posjetu prikazujemo obavijest gdje možeš prihvatiti ili odbiti.
      </p>
      <p>
        Svoju odluku možeš promijeniti u bilo kojem trenutku brisanjem podataka preglednika (localStorage ključ:{" "}
        <code>ga_consent</code>). Više o tome kako Google obrađuje podatke:{" "}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
          Google Privacy Policy
        </a>.
      </p>

      <h2>Podaci koje prikazujemo</h2>
      <p>
        Podaci o oglasima za posao (naziv radnog mjesta, plaća, lokacija, naziv poslodavca) prikupljeni su iz javno
        dostupnih oglasa na trećim stranicama. Oglasi ne sadrže osobne podatke fizičkih osoba, samo
        podatke o poslovnim pozicijama i poslodavcima.
      </p>

      <h2>Pretraga po životopisu</h2>
      <p>
        Na stranici <Link href="/cv">Pametna pretraga</Link> možeš učitati svoj životopis. Datoteku šaljemo AI modelu{" "}
        <strong>Claude</strong> tvrtke Anthropic, isključivo da bi među oglasima izabrao one koji ti odgovaraju. Mi
        životopis <strong>ne spremamo</strong>: obrađuje se u memoriji i briše čim stigne odgovor, a ne spremamo ni
        rezultate. Anthropic podatke poslane preko API-ja ne koristi za treniranje modela; više u{" "}
        <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer">
          Anthropic Privacy Policy
        </a>
        . Ako ne želiš da tvoj CV obrađuje AI, nemoj koristiti ovu opciju.
      </p>

      <h2>Vanjski linkovi</h2>
      <p>
        Svaki oglas vodi na originalnu stranicu izvornog portala (posao.hr, mojposao.hr) gdje se i aplicira. Nismo
        odgovorni za sadržaj ili politiku privatnosti tih stranica.
      </p>

      <h2>Email</h2>
      <p>
        Ako nam pišeš na info@transparent.hr, tvoju email adresu koristimo isključivo za odgovor na tvoj upit i ne
        prosljeđujemo je trećim stranama.
      </p>

      <h2>Kontakt</h2>
      <p>Za sva pitanja o privatnosti, javi se na info@transparent.hr.</p>
    </main>
  )
}

function English() {
  return (
    <main className="legal">
      <h1>Privacy policy</h1>
      <p className="meta">Last updated: November 2026</p>

      <h2>Who we are</h2>
      <p>
        Transparent.hr collects publicly available job ads from Croatian job sites (such as posao.hr and mojposao.hr)
        and shows only the ads that openly state the salary. Contact: info@transparent.hr.
      </p>

      <h2>Cookies and tracking</h2>
      <p>
        Transparent.hr uses <strong>Google Analytics</strong> to understand how visitors use the site (number of visits,
        which pages are popular, where visitors come from). Google Analytics collects anonymous data through cookies.
        This analytics only runs <strong>with your consent</strong>: on your first visit we show a notice where you can
        accept or decline.
      </p>
      <p>
        You can change your decision at any time by clearing your browser data (localStorage key:{" "}
        <code>ga_consent</code>). More on how Google processes data:{" "}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
          Google Privacy Policy
        </a>
        .
      </p>

      <h2>The data we show</h2>
      <p>
        Job ad data (job title, salary, location, employer name) is collected from publicly available ads on third-party
        sites. The ads contain no personal data about individuals, only information about positions and employers.
      </p>

      <h2>CV search</h2>
      <p>
        On the <Link href={localePath("en", "/cv")}>Smart search</Link> page you can upload your CV. We send the file to
        the AI model <strong>Claude</strong> by Anthropic, solely so it can pick the job ads that fit you. We{" "}
        <strong>do not store</strong> your CV: it is processed in memory and deleted as soon as the answer arrives, and we
        don&apos;t store the results either. Anthropic does not use data sent through its API to train models; more in
        the{" "}
        <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer">
          Anthropic Privacy Policy
        </a>
        . If you don&apos;t want your CV processed by AI, don&apos;t use this feature.
      </p>

      <h2>External links</h2>
      <p>
        Every job ad links to the original page on the source job site (posao.hr, mojposao.hr), where you also apply. We
        are not responsible for the content or privacy policies of those sites.
      </p>

      <h2>Email</h2>
      <p>
        If you write to us at info@transparent.hr, we use your email address only to reply to your message and do not
        pass it on to third parties.
      </p>

      <h2>Contact</h2>
      <p>For any privacy questions, contact us at info@transparent.hr.</p>
    </main>
  )
}
