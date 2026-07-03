import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Politika privatnosti",
}

export default function PrivacyPage() {
  return (
    <main className="legal">
      <h1>Politika privatnosti</h1>
      <p className="meta">Posljednje ažurirano: lipanj 2026.</p>

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
        dostupnih oglasa na trećim stranicama. Ne prikupljamo niti obrađujemo osobne podatke fizičkih osoba — oglasi
        sadrže samo podatke o poslovnim pozicijama i poslodavcima, ne o pojedincima.
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
