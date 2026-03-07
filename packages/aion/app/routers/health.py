"""
app/routers/health.py
CONCRYA AION — Endpoint de observabilidade

GET /api/v1/health/details
  Resposta sem dados sensíveis:
    - ping ao banco
    - versão da aplicação
    - plantas ativas + por planta:
        último snapshot (fc_inf, k, sigma, n_pairs)
        último resultado registrado (created_at)
        último alerta gerado (created_at, tipo)
        último relatório PDF gerado (week_end, created_at, file_path)

Protegido pelo cookie_auth_middleware (exige sessão ativa).
"""

from __future__ import annotations

import os
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.alert import Alert
from app.models.plant import Plant
from app.models.report_run import ReportRun
from app.models.strength_result import StrengthResult
from infrastructure.repositories.parameter_repo import ParameterSnapshot

router = APIRouter(prefix="/api/v1/health", tags=["health"])


@router.get("/details", summary="Estado detalhado da aplicação (sem dados sensíveis)")
def health_details(db: Session = Depends(get_db)):
    # ── DB ping ───────────────────────────────────────────────────────────────
    db_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    # ── Plantas ativas ────────────────────────────────────────────────────────
    plants = db.query(Plant).filter(Plant.is_active.is_(True)).order_by(Plant.id).all()
    plant_summaries = []

    for p in plants:
        # Último snapshot de calibração
        snap: Optional[ParameterSnapshot] = (
            db.query(ParameterSnapshot)
            .filter(ParameterSnapshot.plant_id == p.id)
            .order_by(ParameterSnapshot.id.desc())
            .first()
        )

        # Último resultado registrado
        last_result: Optional[StrengthResult] = (
            db.query(StrengthResult)
            .filter(StrengthResult.plant_id == p.id)
            .order_by(StrengthResult.id.desc())
            .first()
        )

        # Último alerta gerado
        last_alert: Optional[Alert] = (
            db.query(Alert)
            .filter(Alert.plant_id == p.id)
            .order_by(Alert.id.desc())
            .first()
        )

        # Último relatório PDF gerado
        last_report: Optional[ReportRun] = (
            db.query(ReportRun)
            .filter(ReportRun.plant_id == p.id, ReportRun.report_type == "weekly")
            .order_by(ReportRun.id.desc())
            .first()
        )

        plant_summaries.append({
            "plant_id":   p.id,
            "plant_name": p.name,
            "latest_snapshot": None if snap is None else {
                "id":         snap.id,
                "created_at": snap.created_at.isoformat() if snap.created_at else None,
                "fc_inf":     round(snap.fc_inf, 4),
                "k":          round(snap.k, 6),
                "sigma":      round(snap.sigma, 4),
                "sigma_n":    snap.sigma_n,
                "n_pairs":    snap.n_pairs,
                "model":      snap.model,
            },
            "last_result_at":  last_result.created_at.isoformat() if last_result and hasattr(last_result, "created_at") and last_result.created_at else None,
            "last_alert": None if last_alert is None else {
                "created_at": last_alert.created_at.isoformat() if hasattr(last_alert, "created_at") and last_alert.created_at else None,
                "alert_type": last_alert.alert_type,
                "severity":   last_alert.severity,
            },
            "last_weekly_report": None if last_report is None else {
                "week_end":   str(last_report.week_end),
                "created_at": last_report.created_at.isoformat() if last_report.created_at else None,
                "file_path":  last_report.file_path,
            },
        })

    return {
        "ok":      db_ok,
        "version": os.getenv("AION_VERSION", "1.0.0"),
        "db":      "ok" if db_ok else "error",
        "plants":  plant_summaries,
    }
