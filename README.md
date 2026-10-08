# Transparent.hr — setup upute

Job agregator za Hrvatsku fokusiran isključivo na oglase s transparentnom plaćom u EUR.

## Struktura

```
transparent.hr/
  backend/    FastAPI, clean architecture (api/core/models/schemas/services/repositories)
  frontend/   Next.js 14 App Router, TypeScript
  scraper/    Playwright scraperi: posao.hr, mojposao.hr
  shared/     salary parser zajednički za scraper i backend
  infra/      deploy konfiguracija (Render, Vercel, Neon)
```

## 1. Priprema (jednom)

```bash
cd ~/jobsrh

# Backend venv
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium

# Frontend
cd frontend
npm install
cd ..
```

## 2. Pokreni scraper

```bash
source .venv/bin/activate
python run_all_scrapers.py --max_jobs 20
```

Scraper će:
- Otvoriti headless Chromium
- Skenirati Posao.hr i MojPosao.hr
- Zadržati samo oglase s vidljivom plaćom (EUR)
- Spremiti ih u `backend/jobs.db`

Kategorije (grane) čitaju se s detalja oglasa i mapiraju na zajedničku listu u `shared/category_normalizer.py`. Za oglase spremljene prije toga:

```bash
python -m scraper.backfill_categories          # dohvati kategorije za oglase bez njih
python -m scraper.backfill_categories --remap  # samo ponovno mapiraj nakon izmjene pravila (bez scrapanja)
```

> Selektori se mogu promijeniti na izvoru — koristi `scraper/debug_selectors.py` za inspekciju HTML-a ako scraper prestane pronalaziti oglase.

## 3. Pokreni backend

```bash
source .venv/bin/activate
cd backend
uvicorn app.main:app --reload
```

Backend radi na: http://localhost:8000 (docs: http://localhost:8000/docs)

Endpointi:
- `GET /api/jobs` — filteri: `salary_shown`, `city`, `category`, `job_type`, `source`, `search`, `sort`, `page`, `per_page`
- `GET /api/jobs/{id}`
- `GET /api/stats`
- `GET /api/filters`
- `GET /health`

### Migracije (Alembic)

```bash
cd backend
alembic upgrade head        # primijeni migracije
alembic revision --autogenerate -m "opis promjene"   # nova migracija
```

Lokalno koristi SQLite (`backend/jobs.db`). Za produkciju postavi `DATABASE_URL` (Neon Postgres) u `backend/.env`.

## 4. Pokreni frontend

```bash
cd frontend
npm run dev
```

Frontend radi na http://localhost:3000. Postavi `NEXT_PUBLIC_API_URL` ako backend nije na `localhost:8000`.

## 5. Automatski scraping (opcionalno)

```bash
crontab -e
```

```
0 */6 * * * /home/tvoje_ime/jobsrh/.venv/bin/python /home/tvoje_ime/jobsrh/run_all_scrapers.py >> /home/tvoje_ime/jobsrh/scraper.log 2>&1
```

## Deploy

Vidi [infra/README.md](infra/README.md) — Render (backend), Neon (DB), Vercel (frontend).
