# Deploy

- **Backend** — Render.com, built from `infra/backend.Dockerfile`. Set `DATABASE_URL` to the Neon Postgres connection string in production; defaults to local SQLite otherwise.
- **Database** — Neon PostgreSQL. The backend container runs `alembic upgrade head` on every start, so a pushed migration is applied before the new code serves requests.
- **Frontend** — Vercel, deployed directly from `frontend/`. Set `NEXT_PUBLIC_API_URL` to the Render backend URL.
- **Scraper** — runs on a schedule (cron / GitHub Actions / local runner) calling `run_all_scrapers.py`, writing to the same `DATABASE_URL`.

## Pametna pretraga po CV-u (`/cv`)

Na Renderu (backend) postavi:

- `ANTHROPIC_API_KEY` — ključ s console.anthropic.com. Bez njega stranica `/cv` javlja da pretraga trenutno nije dostupna.
- `CV_MATCH_MODEL` (neobavezno) — zadano `claude-haiku-5-5` (~0,4 centa po CV-u). `claude-opus-5-5` pažljivije bira, ali je ~30× skuplji.
- `CV_MATCH_PER_HOUR` / `CV_MATCH_PER_DAY` (neobavezno) — zadano 5 po IP-u na sat i 20 dnevno za cijelu stranicu, kao gornja granica troška.

## Nadzor scrapera

- `run_all_scrapers.py` pokreće svaki izvor zasebno: ako jedan padne, ostali se i dalje izvrše. Kad izvor dva runa zaredom padne ili ne pronađe nijedan oglas (najčešće promijenjeni selektori), šalje se mail „problem sa scraperom” preko istih `SMTP_*` varijabli, a skripta završava s izlaznim kodom 1. Jedan neuspješan run samo se ispiše u log.
- Za nadzor izvana postavi `HEARTBEAT_URL` (npr. ping URL s healthchecks.io, period 6 h, grace ~18 h) u okruženju scrapera. Nakon svakog uspješnog runa `run_all_scrapers.py` pingne taj URL, a servis šalje mail kad pingovi prestanu. Ništa ne mora izvana ispitivati bazu, pa se Neon može ugasiti kad miruje.
- `GET /health/scraper` na backendu vraća 503 kad neki izvor nije imao uspješan run s oglasima u zadnjih `SCRAPER_STALE_HOURS` sati (zadano 24). Čita bazu, pa ga **ne** stavljaj u uptime monitor koji ga zove svakih nekoliko minuta: baza bi bila stalno budna i potrošila Neonovu besplatnu kvotu CU-sati. Služi za ručnu provjeru. Nije ni Render health check, za to služi `/health`.

## Stranica „uskoro se vraćamo”

Na Vercelu postavi `MAINTENANCE_MODE=1` i napravi redeploy. Svaka stranica tada vraća poruku „Uskoro se vraćamo” sa statusom 503 i `Retry-After`, pa Google zna da je pad privremen i ne izbacuje oglase iz indeksa. Neobavezno: `MAINTENANCE_UNTIL=2026-12-01` prikazuje očekivani datum povratka. Za povratak obriši varijablu i ponovno napravi redeploy. Dugotrajni 503 (više od tjedan-dva) ipak može naštetiti indeksiranju.

## Kopija baze

`.github/workflows/db-backup.yml` svaki dan u 03:30 UTC napravi `pg_dump` Neon baze i sprema ga 14 dana kao šifrirani artifact workflowa. Repo je javan, zato je dump šifriran. Za rad trebaju dva GitHub secreta:

- `DATABASE_URL`: isti connection string kao na Renderu
- `BACKUP_PASSPHRASE`: duga nasumična lozinka. Spremi je i izvan GitHuba (npr. u password manager), jer bez nje se kopija ne može otvoriti.

Backup budi bazu na par minuta dnevno, što je zanemariv trošak CU-sati. Možeš ga pokrenuti i ručno: Actions → DB backup → Run workflow.

**Vraćanje u novu bazu** (npr. kad Neon potroši kvotu pa se stara baza ne može ni pročitati):

1. U Neonu napravi novi projekt i kopiraj njegov connection string.
2. Na GitHubu, Actions → DB backup → zadnji uspješan run → preuzmi artifact i raspakiraj `db.dump.gpg`.
3. Dešifriraj i vrati:
   ```bash
   gpg --decrypt -o db.dump db.dump.gpg            # pita BACKUP_PASSPHRASE
   docker run --rm -v "$PWD:/b" postgres:17 \
     pg_restore --no-owner --no-privileges -d "postgresql://…novi connection string…" /b/db.dump
   ```
4. Postavi novi `DATABASE_URL` na Renderu (backend), u okruženju scrapera i u GitHub secretu, pa restartaj backend.
