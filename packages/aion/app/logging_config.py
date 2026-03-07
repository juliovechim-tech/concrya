"""
app/logging_config.py
CONCRYA AION — Logging estruturado em JSON

Todos os logs do logger "aion" são emitidos como uma linha JSON por evento.
Use logging.getLogger("aion") em qualquer módulo para emitir logs estruturados.

Campos automáticos em todo log:
  ts, level, msg

Campos extras (passados via extra={}):
  plant_id, batch_id, external_id, result_id, snapshot_id,
  sigma, residual, alerts_count, model
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone

# Campos extra que o JsonFormatter captura do LogRecord se presentes
_EXTRA_FIELDS = (
    # negócio
    "plant_id", "batch_id", "external_id", "result_id",
    "snapshot_id", "sigma", "residual", "alerts_count", "model",
    # HTTP
    "route", "method", "status_code", "latency_ms",
)


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict = {
            "ts":    datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "msg":   record.getMessage(),
        }
        for field in _EXTRA_FIELDS:
            if hasattr(record, field):
                payload[field] = getattr(record, field)
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def setup_logging() -> logging.Logger:
    """
    Configura e retorna o logger raiz da aplicação ("aion").
    Pode ser chamado múltiplas vezes sem efeito colateral (idempotente).
    """
    logger = logging.getLogger("aion")
    if logger.handlers:
        return logger   # já configurado

    level = os.getenv("LOG_LEVEL", "INFO").upper()
    logger.setLevel(getattr(logging, level, logging.INFO))

    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    logger.addHandler(handler)
    logger.propagate = False

    return logger
