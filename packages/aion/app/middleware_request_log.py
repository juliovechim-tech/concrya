"""
app/middleware_request_log.py
CONCRYA AION — Middleware de log de requests HTTP

Emite uma linha JSON por request com:
  route, method, status_code, latency_ms

Deve ser registrado DEPOIS do cookie_auth_middleware em app/main.py
para que a ordem de execução seja:
  request_log (externo) → cookie_auth → handler → cookie_auth → request_log
Assim, 401 de auth também são registrados com latência correta.

Nota: não importamos `log` de app.main para evitar import circular.
O logger "aion" já foi configurado pelo setup_logging() antes de qualquer import.
"""

from __future__ import annotations

import logging
import time

from fastapi import Request

log = logging.getLogger("aion")

# Prefixos que não precisam de log de acesso (arquivos estáticos da SPA)
_SKIP_PREFIXES = ("/app/assets/", "/app/favicon")


async def request_log_middleware(request: Request, call_next):
    path = request.url.path

    # Não polui o log com requests de assets estáticos
    if any(path.startswith(p) for p in _SKIP_PREFIXES):
        return await call_next(request)

    t0   = time.perf_counter()
    resp = await call_next(request)
    ms   = round((time.perf_counter() - t0) * 1000, 2)

    log.info(
        "http_request",
        extra={
            "method":      request.method,
            "route":       path,
            "status_code": resp.status_code,
            "latency_ms":  ms,
        },
    )
    return resp
