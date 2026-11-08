# Deploy

- **Backend** — Render.com, built from `infra/backend.Dockerfile`. Set `DATABASE_URL` to the Neon Postgres connection string in production; defaults to local SQLite otherwise.
- **Database** — Neon PostgreSQL. The backend container runs `alembic upgrade head` on every start, so a pushed migration is applied before the new code serves requests.
- **Frontend** — Vercel, deployed directly from `frontend/`. Set `NEXT_PUBLIC_API_URL` to the Render backend URL.
- **Scraper** — runs on a schedule (cron / GitHub Actions / local runner) calling `run_all_scrapers.py`, writing to the same `DATABASE_URL`.

## Poslovi po CV-u (`/cv`)

Na Renderu (backend) postavi:

- `ANTHROPIC_API_KEY` — ključ s console.anthropic.com. Bez njega stranica `/cv` javlja da pretraga trenutno nije dostupna.
- `CV_MATCH_MODEL` (neobavezno) — zadano `claude-opus-5-5`. `claude-haiku-5-5` je ~40× jeftiniji, ali manje pažljivo bira.
- `CV_MATCH_PER_HOUR` / `CV_MATCH_PER_DAY` (neobavezno) — zadano 5 po IP-u na sat i 300 dnevno za cijelu stranicu, kao gornja granica troška.
