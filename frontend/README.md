# Jobs Frontend

Minimal Next.js 14 app that displays jobs from a FastAPI backend on `http://localhost:8000`.

Run locally:

```bash
cd frontend
npm install
npm run dev
```

The app expects backend endpoints:
- `GET /api/jobs` -> JSON array of job objects
- `GET /api/stats` -> optional JSON with `{ total, percent_with_salary }` (the UI will compute fallback if missing)
