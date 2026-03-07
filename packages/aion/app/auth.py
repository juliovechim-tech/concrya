"""
app/auth.py
CONCRYA AION — Autenticação por cookie HttpOnly

POST /auth/login  → valida user/pass, seta cookie aion_session
POST /auth/logout → limpa o cookie
GET  /auth/me     → retorna username se autenticado (para checagem client-side)

O token gravado no cookie é: username|exp_unix|hmac_sha256(username|exp_unix)
Não depende de biblioteca externa — usa apenas a stdlib do Python.
"""

from __future__ import annotations

import base64
import hmac
import hashlib
import os
import time

from fastapi import APIRouter, Request, Response, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])

# ── Configuração via env ───────────────────────────────────────────────────────
_USER   = os.getenv("AION_LOGIN_USER", "admin")
_PASS   = os.getenv("AION_LOGIN_PASS", "admin123")
_SECRET = os.getenv("AION_SESSION_SECRET", "change-me-in-production").encode("utf-8")

COOKIE_NAME    = "aion_session"
COOKIE_MAX_AGE = 60 * 60 * 12   # 12 horas


# ── Helpers de token ──────────────────────────────────────────────────────────

def _sign(payload: str) -> str:
    raw = hmac.new(_SECRET, payload.encode("utf-8"), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def _make_token(username: str) -> str:
    exp     = int(time.time()) + COOKIE_MAX_AGE
    payload = f"{username}|{exp}"
    return f"{payload}|{_sign(payload)}"


def _verify_token(token: str) -> str | None:
    """Retorna username se token válido e não expirado; None caso contrário."""
    try:
        username, exp_s, sig = token.split("|", 2)
        payload = f"{username}|{exp_s}"
        if not hmac.compare_digest(sig, _sign(payload)):
            return None
        if int(exp_s) < int(time.time()):
            return None
        return username
    except Exception:
        return None


def get_session_user(request: Request) -> str | None:
    """Extrai e valida o cookie de sessão. Retorna username ou None."""
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None
    return _verify_token(token)


# ── Schemas ───────────────────────────────────────────────────────────────────

class LoginIn(BaseModel):
    username: str
    password: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/login", summary="Login — cria sessão HttpOnly")
def login(data: LoginIn, response: Response):
    if data.username != _USER or data.password != _PASS:
        raise HTTPException(status_code=401, detail="Credenciais inválidas.")

    response.set_cookie(
        key=COOKIE_NAME,
        value=_make_token(data.username),
        httponly=True,
        secure=False,       # True em produção com HTTPS
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        path="/",
    )
    return {"ok": True, "username": data.username}


@router.post("/logout", summary="Logout — remove sessão")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/me", summary="Verifica sessão ativa")
def me(request: Request):
    user = get_session_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Não autenticado.")
    return {"username": user}
