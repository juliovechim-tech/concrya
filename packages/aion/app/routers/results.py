"""
app/routers/results.py
CONCRYA AION — Router de Resultados de Ensaio

POST /api/v1/results/strength
  Registra um resultado de ensaio (fc_mpa em age_days).
  Após persistir:
    1. Calcula fc_predicted via prediction_engine (Stack B)
    2. Dispara calibração + sigma via CalibrationService (Stack A)
    3. Verifica alertas via alert_engine com thresholds de settings (Stack B)
  Retorna o resultado + alertas gerados + resumo da calibração.
"""

from __future__ import annotations

import logging
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Batch, StrengthResult
from app.services.alert_engine import check_and_create_alerts
from app.services.calibration_service import CalibrationService
from app.services.prediction_engine import predict
from infrastructure.repositories.parameter_repo import ParameterRepository

router = APIRouter(prefix="/api/v1/results", tags=["results"])
log = logging.getLogger("aion")


# ─────────────────────────────────────────────────────
#  SCHEMAS
# ─────────────────────────────────────────────────────

class StrengthResultIn(BaseModel):
    external_id: str = Field(..., description="ID externo do lote (deve existir)")
    age_days: float = Field(..., gt=0, description="Idade do ensaio em dias")
    fc_mpa: float = Field(..., gt=0, description="Resistência medida (MPa)")
    specimen_count: int = Field(3, ge=1)
    test_standard: str = Field("ABNT NBR 5739", max_length=64)
    lab: str = Field("", max_length=128)
    notes: Optional[str] = None
    model: Literal["arrhenius", "nurse_saul"] = "arrhenius"


class AlertSummary(BaseModel):
    alert_type: str
    severity: str
    message: str
    fc_actual: Optional[float]
    fc_predicted: Optional[float]
    fc_threshold: Optional[float]

    model_config = ConfigDict(from_attributes=True)


class CalibrationSummary(BaseModel):
    calibration_updated: bool
    sigma_updated: bool
    fc_inf: float
    k: float
    sigma: float
    snapshot_id: Optional[int]


class StrengthResultOut(BaseModel):
    id: int
    batch_id: int
    age_days: float
    fc_mpa: float
    fc_predicted: float
    residual: float
    specimen_count: int
    test_standard: str
    lab: str
    notes: Optional[str]
    alerts: list[AlertSummary]
    calibration: CalibrationSummary

    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────────────
#  ENDPOINT
# ─────────────────────────────────────────────────────

@router.post(
    "/strength",
    response_model=StrengthResultOut,
    status_code=status.HTTP_201_CREATED,
    summary="Lançar resultado de ensaio de resistência",
)
def create_strength_result(
    data: StrengthResultIn,
    db: Session = Depends(get_db),
) -> StrengthResultOut:
    # ── 1. Resolve o lote ────────────────────────────
    batch: Optional[Batch] = (
        db.query(Batch).filter(Batch.external_id == data.external_id).first()
    )
    if batch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lote '{data.external_id}' não encontrado.",
        )

    # ── 2. Predição via prediction_engine (Stack B) ──
    param_repo = ParameterRepository(db)
    plant_id = batch.plant_id
    current = param_repo.get_current(plant_id=plant_id, model=data.model)

    fc_predicted = predict(
        temp_c=batch.temperature,
        age=data.age_days,
        fc_inf=current.fc_inf,
        k=current.k,
        model=data.model,
    )
    residual = data.fc_mpa - fc_predicted

    # ── 3. Persiste o resultado ──────────────────────
    result = StrengthResult(
        plant_id=batch.plant_id,
        batch_id=batch.id,
        age_days=data.age_days,
        fc_mpa=data.fc_mpa,
        specimen_count=data.specimen_count,
        test_standard=data.test_standard,
        lab=data.lab,
        notes=data.notes,
    )
    db.add(result)
    db.flush()  # preenche result.id antes de passar para o serviço

    # ── 4. Calibração + sigma (Stack A) ──────────────
    records = _load_records(db, plant_id=plant_id)
    svc = CalibrationService(db)
    outcome = svc.run_after_result(
        result_id=result.id,
        plant_id=plant_id,
        new_residual=residual,
        records=records,
        model=data.model,
    )

    # ── 5. Alertas via alert_engine (Stack B) ────────
    alerts = check_and_create_alerts(
        db=db,
        result=result,
        batch=batch,
        plant_id=batch.plant_id,
        fc_predicted=fc_predicted,
        sigma=outcome.sigma,
        sigma_n=outcome.sigma_n,
    )

    db.commit()

    log.info(
        "result_processed",
        extra={
            "plant_id":     plant_id,
            "batch_id":     batch.id,
            "external_id":  batch.external_id,
            "result_id":    result.id,
            "model":        data.model,
            "residual":     round(residual, 3),
            "sigma":        round(outcome.sigma, 3),
            "snapshot_id":  outcome.snapshot_id,
            "alerts_count": len(alerts),
        },
    )

    return StrengthResultOut(
        id=result.id,
        batch_id=result.batch_id,
        age_days=result.age_days,
        fc_mpa=result.fc_mpa,
        fc_predicted=round(fc_predicted, 2),
        residual=round(residual, 2),
        specimen_count=result.specimen_count,
        test_standard=result.test_standard,
        lab=result.lab,
        notes=result.notes,
        alerts=[AlertSummary.model_validate(a) for a in alerts],
        calibration=CalibrationSummary(
            calibration_updated=outcome.calibration_updated,
            sigma_updated=outcome.sigma_updated,
            fc_inf=outcome.fc_inf,
            k=outcome.k,
            sigma=outcome.sigma,
            snapshot_id=outcome.snapshot_id,
        ),
    )


# ─────────────────────────────────────────────────────
#  HELPER INTERNO
# ─────────────────────────────────────────────────────

def _load_records(db: Session, plant_id: Optional[str]) -> list[dict]:
    """Carrega resultados com temperatura do lote para a planta informada."""
    q = (
        db.query(StrengthResult, Batch)
        .join(Batch, StrengthResult.batch_id == Batch.id)
    )
    if plant_id is None:
        q = q.filter(Batch.plant_id.is_(None))
    else:
        q = q.filter(Batch.plant_id == plant_id)
    rows = q.all()
    return [
        {
            "external_id": batch.external_id,
            "age_days": result.age_days,
            "fc_mpa": result.fc_mpa,
            "temperature": batch.temperature,
        }
        for result, batch in rows
    ]
