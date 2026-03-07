import os
import sys
from pathlib import Path
from typing import Dict

from dotenv import load_dotenv
load_dotenv()  # carrega .env no os.environ antes de qualquer os.getenv()

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.auth import router as auth_router
from app.logging_config import setup_logging
from app.middleware_request_log import request_log_middleware
from app.routers import batches, plants, reports, results
from app.routers.health import router as health_router
from app.security_cookie import cookie_auth_middleware
from app.aion_agent import router as aion_router

# ── Logging estruturado (JSON) ────────────────────────────────────────────────
log = setup_logging()

# ── Startup guard — recusa iniciar com credenciais de demo ───────────────────
_DEFAULT_PASS = "admin123"
_login_pass = os.getenv("AION_LOGIN_PASS", "")
if _login_pass == _DEFAULT_PASS:
    log.error(
        "AION_LOGIN_PASS está com o valor padrão 'admin123'. "
        "Defina uma senha segura em .env antes de iniciar em produção."
    )
    sys.exit(1)

app = FastAPI(title="AION CORE")

# ── Middlewares (LIFO: último registrado = primeiro a executar) ───────────────
# Ordem de execução: request_log → cookie_auth → handler
app.middleware("http")(cookie_auth_middleware)
app.middleware("http")(request_log_middleware)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(plants.router)
app.include_router(batches.router)
app.include_router(results.router)
app.include_router(reports.router)
app.include_router(health_router)
app.include_router(aion_router)

# ── Cockpit UI (frontend/dist, gerado por `npm run build`) ────────────────────
_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if _DIST.exists():
    app.mount("/app", StaticFiles(directory=str(_DIST), html=True), name="frontend")


# ── Rotas de sistema ──────────────────────────────────────────────────────────
@app.get("/health", response_model=Dict[str, str], tags=["default"])
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/", tags=["default"])
def root():
    cockpit = "/app" if _DIST.exists() else "cd frontend && npm run build"
    return {"AION": "online", "docs": "/docs", "health": "/health", "cockpit": cockpit}
