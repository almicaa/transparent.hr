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
- `GET /health/scraper` na backendu vraća 503 kad neki izvor nije imao uspješan run s oglasima u zadnjih `SCRAPER_STALE_HOURS` sati (zadano 24). Dodaj ga u UptimeRobot (ili sličan servis) kao HTTP monitor. **Ne** postavljaj ga kao Render health check, za to služi `/health`.
