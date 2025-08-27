# ClaimWise

ClaimWise is a policy-document analysis tool: upload insurance policies and other documents, extract text, run analyses with LLMs, compare policies, and chat with documents.

This README describes the current project (what's in the repo now), how to run it locally, key files and endpoints, environment variables, and common troubleshooting steps.

---

## Tech stack

- Frontend: Next.js (App Router), React, TypeScript, Tailwind CSS
- Backend: FastAPI (Python), Uvicorn
- Database/Auth/Storage: Supabase (Postgres + Auth + Storage)
- LLMs: Groq and Google Gemini (integration in backend)
- OCR: Tesseract + pdf2image + poppler (currently in backend)
- Vector/search (optional): not included by default (RAG planning in `README_RAG_PLAN.md`)

---

## Repo layout (high level)

- `frontend/` — Next.js application
  - `app/` — pages (dashboard, chat, upload, analyze, admin)
  - `components/` — UI components and widgets
  - `lib/` — API helpers, Supabase client
  - `.env.local` — local frontend env (not committed)

- `backend/` — FastAPI service
  - `src/main.py` — application routes and middleware
  - `src/auth.py` — JWT verification / Supabase integration
  - `src/db.py` — Supabase DB helpers
  - `src/OCR.py` — OCR helpers
  - `src/llm.py`, `src/llm_groq.py` — LLM integration
  - `requirements.txt` — Python deps
  - `.env` — backend env (not committed)

- `tests/` — project tests
- `README_RAG_PLAN.md` — planning doc for adding RAG (separate)

---

## Key backend endpoints (examples)

- `GET /` — root message
- `GET /healthz` — health check
- `POST /upload-policy` — upload a policy file (protected)
- `POST /analyze-policy` — run analysis on an uploaded policy
- `POST /compare-policies` — compare multiple policies
- `POST /chat` — chat against a policy or policies
- `GET /dashboard/stats` — authenticated dashboard stats
- `GET /dashboard/stats-dev` — unauthenticated dev stats
- `GET /activities` — user activity (authenticated)
- Various `/debug/*` endpoints used for development

Note: Many endpoints require an Authorization header (Bearer <JWT>) signed by Supabase.

---

## Required environment variables (examples)

Do NOT commit secrets. Provide these via `.env` locally or as platform secrets (Render/Vercel).

Backend (examples)

- `SUPABASE_URL` - e.g. `https://<project>.supabase.co`
- `SUPABASE_KEY` - service role key (used by backend)
- `SUPABASE_JWT_SECRET` - Supabase JWT secret used to validate tokens
- `GEMINI_API_KEY` - Google Gemini API key
- `GROQ_API_KEY` - Groq API key (if used)
- `ALLOWED_ORIGINS` - comma-separated list for CORS (or edit `backend/src/main.py`)

Frontend (examples in `frontend/.env.local`)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL` - e.g. `https://claimwise.onrender.com`

---

## Run locally (quick start)

Prereqs: Node.js, pnpm or npm, Python 3.11+, virtualenv or venv, Tesseract + Poppler installed (for OCR locally), Supabase project ready.

Backend

```powershell
cd backend
python -m venv .venv
. .\.venv\Scripts\Activate
pip install -r requirements.txt
# Create a local .env with required secrets (see above)
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend

```bash
cd frontend
pnpm install   # or npm install
# create frontend/.env.local with NEXT_PUBLIC_API_URL and Supabase keys
pnpm dev       # or npm run dev
```

Testing via PowerShell

```powershell
Invoke-RestMethod 'http://localhost:8000/healthz' | ConvertTo-Json
```

---

## Common troubleshooting

- 401 Unauthorized on protected endpoints:
  - Ensure frontend sends `Authorization: Bearer <access_token>`.
  - Verify `SUPABASE_JWT_SECRET` on backend matches Supabase project's JWT secret.

- CORS errors from browser:
  - Confirm `ALLOWED_ORIGINS` includes your frontend domain (Vercel domain or `http://localhost:3000`).
  - Check `backend/src/main.py` for CORSMiddleware settings.

- OCR failures (poppler/tesseract):
  - Ensure Tesseract and Poppler binaries are installed and in PATH (or configured in `OCR.py`).
  - On some hosting platforms (Render), system packages may be unavailable — consider removing OCR from hosted backend and using Gemini Files API instead.

- Insert foreign key errors when creating policies:
  - Ensure the `user_id` exists in Supabase `auth.users` and related `users` table if you maintain one.
  - Use `get_current_user` to extract user id from JWT and use that id for inserts.

- 404 for `/dashboard/stats-dev` in browser but works locally:
  - Confirm `NEXT_PUBLIC_API_URL` is set correctly in deployed frontend.
  - Ensure backend is redeployed after code/env changes on Render.

---

## Tests & linting

- Python tests: run from project root

```powershell
cd backend
. .\.venv\Scripts\Activate
pytest -q
```

- Frontend tests: (if present) run via pnpm/npm test

---

## Deployment notes

- Backend: Render is used in this project; configure environment variables in Render dashboard and redeploy after changes.
- Frontend: Vercel recommended; set `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel project settings.
- Secrets: use platform secret stores, do not commit `.env` files.

---

## Where to find more details

- RAG planning: `README_RAG_PLAN.md` (contains roadmap & implementation ideas)
- Backend routes & logic: `backend/src/main.py`
- Supabase integration: `backend/src/auth.py` and `frontend/lib/supabase.ts`

---

If you want a shorter or longer README (or a README tailored for contributors or operators), tell me which audience and I will generate it.
