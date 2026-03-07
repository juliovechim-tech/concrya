"""
app/security_cookie.py
CONCRYA AION — Middleware de autenticação por cookie HttpOnly

Substitui o antigo api_key_middleware (X-API-Key).
Protege /api/v1/* exigindo um cookie aion_session válido.
Caminhos públicos e a SPA estática passam livremente.
"""

from __future__ import annotations

from fastapi import Request
from fastapi.responses import JSONResponse

from app.auth import get_session_user

# Caminhos que nunca exigem autenticação
_EXEMPT = frozenset({
    "/",
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/auth/login",
    "/auth/logout",
    "/auth/me",
})


async def cookie_auth_middleware(request: Request, call_next):
    path = request.url.path

    # Rotas públicas e arquivos estáticos da SPA (/app/*)
    if path in _EXEMPT or not path.startswith("/api/v1/"):
        return await call_next(request)

    # Exige sessão válida para qualquer /api/v1/*
    user = get_session_user(request)
    if not user:
        return JSONResponse(
            {"detail": "Não autenticado. Faça login em /auth/login."},
            status_code=401,
        )

    return await call_next(request)
