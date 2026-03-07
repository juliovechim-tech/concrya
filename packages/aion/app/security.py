"""
app/security.py
CONCRYA AION — Middleware de autenticação por API Key

Protege todos os endpoints /api/v1/* com o header X-API-Key.
Caminhos públicos (docs, health) não exigem autenticação.

Configuração:
    AION_API_KEY=<valor> via .env ou variável de ambiente.
    Se a variável não estiver definida, o servidor retorna 500 em
    qualquer chamada protegida para forçar configuração explícita.
"""

from __future__ import annotations

import os

from fastapi import Request
from fastapi.responses import JSONResponse

_API_KEY: str = os.getenv("AION_API_KEY", "")

# Rotas que nunca exigem autenticação
_EXEMPT_PATHS = frozenset({
    "/",
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/app",          # cockpit UI raiz
})


async def api_key_middleware(request: Request, call_next):
    path = request.url.path

    # Rotas públicas ou arquivos estáticos da UI
    if path in _EXEMPT_PATHS or not path.startswith("/api/v1/"):
        return await call_next(request)

    # API key não configurada no servidor → erro de configuração
    if not _API_KEY:
        return JSONResponse(
            {"detail": "Server misconfiguration: AION_API_KEY not set."},
            status_code=500,
        )

    sent = request.headers.get("X-API-Key", "")
    if sent != _API_KEY:
        return JSONResponse(
            {"detail": "Unauthorized: X-API-Key inválida ou ausente."},
            status_code=401,
        )

    return await call_next(request)
