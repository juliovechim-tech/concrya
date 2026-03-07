# AION Backend Quickstart (Windows)

## 1) Environment

Create `.env` in project root from `.env.example`.

Minimum local settings:

```env
DATABASE_URL=sqlite:///./aion.db
AION_API_KEY=super-secret-pilot-key
AION_PLANT_ID=PLANTA-01
```

Notes:
- Local default uses SQLite for zero setup.
- Docker flow overrides `DATABASE_URL` to Postgres automatically.

## 2) Run local (SQLite)

```powershell
cd C:\dev\aion
venv\Scripts\activate
alembic upgrade head
uvicorn app.main:app --reload
```

If `aion.db` already exists from `create_all()` (tables present but no migration history),
align Alembic baseline before upgrading:

```powershell
alembic stamp dd1c8b871977
alembic upgrade head
```

Health check:

```powershell
curl.exe -i http://127.0.0.1:8000/health
```

Protected route (expects API key):

```powershell
curl.exe -i -X POST http://127.0.0.1:8000/api/v1/results/strength ^
  -H "Content-Type: application/json" ^
  -H "X-API-Key: super-secret-pilot-key" ^
  -d "{\"external_id\":\"L001\",\"age_days\":7,\"fc_mpa\":32.5,\"model\":\"arrhenius\"}"
```

## 3) Run with Docker + Postgres

```powershell
cd C:\dev\aion
docker compose up --build
```

In another terminal:

```powershell
docker compose exec api alembic upgrade head
```

## 4) API key behavior

- Public: `/`, `/health`, `/docs`, `/openapi.json`, `/redoc`, `/app`
- Protected: all `/api/v1/*`
- Missing `AION_API_KEY` on server: returns HTTP 500 on protected endpoints
- Invalid/missing `X-API-Key` request header: returns HTTP 401
