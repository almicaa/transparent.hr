# Deploy

- **Backend** — Render.com, built from `infra/backend.Dockerfile`. Set `DATABASE_URL` to the Neon Postgres connection string in production; defaults to local SQLite otherwise.
- **Database** — Neon PostgreSQL. The backend container runs `alembic upgrade head` on every start, so a pushed migration is applied before the new code serves requests.
- **Frontend** — Vercel, deployed directly from `frontend/`. Set `NEXT_PUBLIC_API_URL` to the Render backend URL.
- **Scraper** — runs on a schedule (cron / GitHub Actions / local runner) calling `run_all_scrapers.py`, writing to the same `DATABASE_URL`.
