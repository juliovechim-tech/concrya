"""
Serviço de calibração — método de dois pontos.
Após cada ensaio, recalcula fc_inf e k e persiste se houve mudança relevante.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.config import settings
from app.models.batch import Batch
from app.models.parameter_update import ParameterUpdate
from app.models.strength_result import StrengthResult
from app.services.prediction_engine import estimate_params

# Tolerâncias mínimas para considerar que houve mudança real nos parâmetros
_MIN_FC_INF_DELTA = 0.05   # MPa
_MIN_K_DELTA = 0.0001


def get_current_params(db: Session, model: str = "arrhenius") -> tuple[float, float]:
    """Retorna (fc_inf, k) mais recentes, ou defaults da config."""
    latest = (
        db.query(ParameterUpdate)
        .filter(ParameterUpdate.model == model)
        .order_by(desc(ParameterUpdate.created_at))
        .first()
    )
    if latest:
        return latest.fc_inf_after, latest.k_after
    return settings.default_fc_inf, settings.default_k


def recalibrate(
    db: Session,
    model: str = "arrhenius",
    triggered_by_result_id: Optional[int] = None,
) -> tuple[float, float]:
    """
    Recarrega todos os resultados, estima novos parâmetros e persiste
    um ParameterUpdate se a mudança for relevante.
    Retorna (fc_inf, k) vigentes após a calibração.
    """
    rows = (
        db.query(StrengthResult, Batch)
        .join(Batch, StrengthResult.batch_id == Batch.id)
        .all()
    )

    records = [
        {
            "external_id": batch.external_id,
            "age_days": result.age_days,
            "fc_mpa": result.fc_mpa,
            "temperature": batch.temperature,
        }
        for result, batch in rows
    ]

    if not records:
        return settings.default_fc_inf, settings.default_k

    fc_inf_new, k_new = estimate_params(records, model)
    fc_inf_old, k_old = get_current_params(db, model)

    changed = (
        abs(fc_inf_new - fc_inf_old) >= _MIN_FC_INF_DELTA
        or abs(k_new - k_old) >= _MIN_K_DELTA
    )

    if changed:
        n_samples = sum(1 for r in records if abs(r["age_days"] - 28.0) < 1.0)
        update = ParameterUpdate(
            model=model,
            fc_inf_before=fc_inf_old,
            k_before=k_old,
            fc_inf_after=fc_inf_new,
            k_after=k_new,
            n_samples=n_samples,
            triggered_by_result_id=triggered_by_result_id,
        )
        db.add(update)
        db.commit()
        return fc_inf_new, k_new

    return fc_inf_old, k_old
