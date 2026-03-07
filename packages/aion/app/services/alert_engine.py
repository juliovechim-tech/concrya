"""
Motor de alertas — verifica NC e DRIFT após cada ensaio lançado.

Tipos de alerta:
  NC    — fc_28d < target_fck (não-conformidade)
  DRIFT — fc_7d muito abaixo da previsão (possível drift antes do 28d)

Thresholds DRIFT (em ordem de prioridade):
  1. Sigma maduro (sigma_n >= sigma_min_n):
       WARN     se |residual| >= alert_warn_mult × sigma
       CRITICAL se |residual| >= alert_crit_mult × sigma
  2. Fallback absoluto (sigma ainda não confiável):
       WARN     se |residual| >= drift_threshold_mpa
       CRITICAL se |residual| >= drift_critical_mpa

Todos os valores são configuráveis via .env — zero hardcode no código.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from app.config import settings
from app.models.alert import Alert
from app.models.batch import Batch
from app.models.strength_result import StrengthResult


def _drift_severity(residual: float, sigma: float, sigma_n: int) -> str | None:
    """
    Calcula severidade do drift (ou None se abaixo dos thresholds).
    Usa sigma × multiplicador quando sigma é confiável; caso contrário usa MPa absoluto.
    Mesmo em modo sigma maduro, o threshold nunca cai abaixo de drift_abs_min_sigma_mode.
    """
    abs_res = abs(residual)

    if sigma > 1e-6 and sigma_n >= settings.sigma_min_n:
        # Sigma maduro — thresholds relativos com piso absoluto
        thr_warn = max(settings.alert_warn_mult * sigma, settings.drift_threshold_mpa)
        thr_crit = max(settings.alert_crit_mult * sigma, settings.drift_abs_min_sigma_mode)
        if abs_res >= thr_crit:
            return "critical"
        if abs_res >= thr_warn:
            return "warning"
    else:
        # Fallback absoluto (sigma ainda imaturo)
        if abs_res >= settings.drift_critical_mpa:
            return "critical"
        if abs_res >= settings.drift_threshold_mpa:
            return "warning"

    return None


def check_and_create_alerts(
    db: Session,
    result: StrengthResult,
    batch: Batch,
    plant_id: "Optional[str]",
    fc_predicted: float,
    sigma: float,
    sigma_n: int = 0,
) -> list[Alert]:
    """
    Avalia resultado e cria alertas NC e DRIFT.
    Não faz commit — o caller é responsável pelo commit final.

    Parâmetros
    ----------
    fc_predicted : predição já calculada pelo caller (prediction_engine)
    sigma        : desvio padrão vigente (CalibrationService)
    sigma_n      : n de observações usadas para estimar sigma (para decidir maturidade)
    """
    alerts: list[Alert] = []
    residual = result.fc_mpa - fc_predicted

    # ── NC: fc_28d abaixo do fck ──────────────────────────────────────
    if abs(result.age_days - 28.0) < 1.0 and result.fc_mpa < batch.target_fck:
        delta = batch.target_fck - result.fc_mpa
        severity = "critical" if delta >= settings.nc_critical_delta_mpa else "warning"
        alert = Alert(
            plant_id=plant_id,
            batch_id=batch.id,
            alert_type="NC",
            severity=severity,
            message=(
                f"Não-conformidade: fc_28d={result.fc_mpa:.1f} MPa "
                f"< fck={batch.target_fck:.0f} MPa (Δ={delta:+.1f} MPa)"
            ),
            fc_actual=result.fc_mpa,
            fc_predicted=None,
            fc_threshold=batch.target_fck,
        )
        db.add(alert)
        alerts.append(alert)

    # ── DRIFT: fc_7d muito abaixo da previsão ─────────────────────────
    if abs(result.age_days - 7.0) < 0.6:
        severity = _drift_severity(residual, sigma, sigma_n)
        if severity:
            alert = Alert(
                plant_id=plant_id,
                batch_id=batch.id,
                alert_type="DRIFT",
                severity=severity,
                message=(
                    f"Drift detectado: fc_7d={result.fc_mpa:.1f} MPa, "
                    f"previsto={fc_predicted:.1f} MPa, resíduo={residual:+.2f} MPa"
                ),
                fc_actual=result.fc_mpa,
                fc_predicted=fc_predicted,
                fc_threshold=batch.target_fck,
            )
            db.add(alert)
            alerts.append(alert)

    return alerts
