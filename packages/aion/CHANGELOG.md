# CHANGELOG — AION CORE

All notable changes to this project are documented in this file.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] — 2026-02-26 · Pilot-ready release

### Added
**Core engine**
- Arrhenius maturity model (`teq_arrhenius`) and Nurse-Saul variant (`teq_nurse_saul`) in `app/services/prediction_engine.py`
- Two-point calibration: `estimate_params` updates fc_inf / k from paired 7d + 28d results
- Sigma update: running residual standard deviation with configurable floor (`sigma_floor_mpa = 2.5 MPa`)
- Bayesian-style parameter snapshots stored in `parameter_snapshots` (one per result, auditable)

**Alert engine**
- NC alert when fc_28d < fck (configurable `nc_critical_delta_mpa`)
- DRIFT alerts (WARN / CRITICAL) based on sigma-scaled thresholds when mature, absolute fallback during warm-up
- Thresholds fully configurable via `.env` / `settings`

**REST API (FastAPI)**
- `POST /api/v1/batches` — register a concrete batch
- `POST /api/v1/results/strength` — register a strength result → triggers calibration + alert pipeline
- `GET  /api/v1/plants` — list active plants
- `GET  /api/v1/health/details` — observability: DB ping, per-plant latest snapshot / result / alert / report
- `POST /auth/login` / `POST /auth/logout` / `GET /auth/me` — cookie-based session auth

**Frontend (React 18 + Vite)**
- Dark Quantum design system (CSS variables, no external component library)
- Login screen with HMAC-signed HttpOnly cookie session
- Cockpit dashboard: status pill (normal / drift / NC), calibration metrics, latest alerts table
- Batches screen: list, create form, CSV import
- Ensaio screen: register strength result, residual bar (|res|/σ coloured), real-time feedback panel

**Infrastructure**
- Multi-stage Docker build (node:20-alpine → python:3.11-slim), single `docker compose up` deployment
- Alembic migrations (chain: `dd1c8b871977 → … → c3e4f5a6b7d8`)
- `report_runs` table: audit trail of every PDF generated (upsert by plant/type/week_end)
- Structured JSON logging (`JsonFormatter`) with per-request latency middleware
- Weekly PDF report generation (`reports/weekly_report.py`) with KPIs, residual series, alert table, recommendations

### Changed
- Authentication migrated from `X-API-Key` header to `HttpOnly` cookie session — no secrets in browser storage
- `Settings` model uses `extra = "ignore"` to allow auth env vars alongside core config

### Security
- Session token: `username|exp|HMAC-SHA256` signed with `AION_SESSION_SECRET`; constant-time compare
- Cookie flags: `HttpOnly`, `SameSite=Lax`; `Secure` flag recommended for production TLS
- Auth middleware exempts only public paths (`/`, `/health`, `/docs`, `/redoc`, `/openapi.json`, `/auth/*`)

---

## [0.3.0] — 2026-02-20 · UI + Docker scaffolding

- React SPA scaffolded (Vite), served by FastAPI at `/app/`
- Docker Compose with Postgres override
- Observability router skeleton

## [0.2.0] — 2026-02-15 · Alert engine

- DRIFT and NC alert models and router
- Configurable thresholds in `app/config.py`
- Seed script (`python -m app.seed`)

## [0.1.0] — 2026-02-10 · Core engine MVP

- Arrhenius prediction engine
- ParameterRepository + ParameterSnapshot ORM
- `POST /api/v1/results/strength` end-to-end: ingest → calibrate → alert → snapshot
