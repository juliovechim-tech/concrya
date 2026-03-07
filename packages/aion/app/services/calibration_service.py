"""
app/services/calibration_service.py
CONCRYA AION — Serviço de Calibração

Orquestra a cadeia de calibração após cada novo ensaio:

  1. Carrega todos os resultados com temperatura (join batch)
  2. Executa two_point_calibration  → (fc_inf, k, metadados)
  3. Executa sigma_update           → SigmaState atualizado
  4. Decide se há mudança relevante  → persiste via parameter_repo
  5. Retorna CalibrationOutcome para o router

Regras de persistência:
  - Só grava um novo snapshot se fc_inf ou k mudaram além da tolerância.
  - Sigma é sempre atualizado (online_sigma) mesmo quando fc_inf/k não mudam.
  - Se n_pairs < MIN_PAIRS, não altera fc_inf/k mas ainda atualiza sigma.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Optional

from sqlalchemy.orm import Session

from app.config import settings
from domain.sigma_update import (
    SigmaState,
    batch_sigma,
    default_sigma_state,
    online_sigma,
)
from domain.two_point_calibration import CalibrationResult, two_point_calibration
from infrastructure.repositories.parameter_repo import ParameterRepository, ParameterSet

# Mínimo de pares fc_7/fc_28 para atualizar fc_inf e k
MIN_PAIRS = 2

# Tolerâncias: mudança menor que isso não gera novo snapshot
_FC_INF_TOL = 0.05   # MPa
_K_TOL = 0.0001


# ─────────────────────────────────────────────────────
#  RESULTADO DO SERVIÇO
# ─────────────────────────────────────────────────────

@dataclass
class CalibrationOutcome:
    """Resultado retornado ao router após a calibração."""
    fc_inf: float
    k: float
    sigma: float
    sigma_n: int
    mean_residual: float
    calibration_updated: bool   # True se fc_inf/k mudaram
    sigma_updated: bool         # True se sigma mudou
    snapshot_id: Optional[int]  # ID do snapshot persistido (None se não houve mudança)
    calib_meta: CalibrationResult


# ─────────────────────────────────────────────────────
#  SERVIÇO
# ─────────────────────────────────────────────────────

class CalibrationService:
    def __init__(self, db: Session):
        self._db = db
        self._repo = ParameterRepository(db)

    # ── Interface principal ───────────────────────────

    def run_after_result(
        self,
        result_id: int,
        plant_id: Optional[str],
        new_residual: float,
        records: list[dict],
        model: Literal["arrhenius", "nurse_saul"] = "arrhenius",
    ) -> CalibrationOutcome:
        """
        Executa a calibração completa após um novo ensaio.

        Parâmetros
        ----------
        result_id    : ID do StrengthResult que disparou a calibração
        plant_id     : planta do lote (None para lotes sem planta associada)
        new_residual : fc_real - fc_previsto do ensaio recém-lançado
        records      : lista de dicts com todos os resultados históricos
                       (external_id, age_days, fc_mpa, temperature)
        model        : modelo de maturidade a usar
        """
        current: ParameterSet = self._repo.get_current(plant_id=plant_id, model=model)

        # ── 1. Calibração dos parâmetros (fc_inf, k) ─
        calib: CalibrationResult = two_point_calibration(records, model)

        params_changed = (
            calib.n_pairs >= MIN_PAIRS
            and (
                abs(calib.fc_inf - current.fc_inf) >= _FC_INF_TOL
                or abs(calib.k - current.k) >= _K_TOL
            )
        )

        # ── 2. Atualização de sigma ───────────────────
        prev_sigma = SigmaState(
            sigma=current.sigma,
            n=current.sigma_n,
            mean_residual=current.mean_residual,
        )

        if current.sigma_n == 0:
            # Primeira vez: calcula batch_sigma sobre todos os resíduos disponíveis
            all_residuals = _compute_residuals(records, calib, model)
            new_sigma_state = batch_sigma(all_residuals) if all_residuals else default_sigma_state()
        else:
            # Online: atualiza apenas com o novo resíduo
            new_sigma_state = online_sigma(prev_sigma, new_residual)

        # Piso industrial: sigma nunca cai abaixo de sigma_floor_mpa
        # Evita alertas histéricos quando n é pequeno e resíduo inicial é atípico
        sigma_floored = max(new_sigma_state.sigma, settings.sigma_floor_mpa)
        if sigma_floored != new_sigma_state.sigma:
            new_sigma_state = SigmaState(
                sigma=sigma_floored,
                n=new_sigma_state.n,
                mean_residual=new_sigma_state.mean_residual,
            )

        sigma_changed = abs(new_sigma_state.sigma - current.sigma) >= 0.001

        # ── 3. Persistência ───────────────────────────
        fc_inf_final = calib.fc_inf if params_changed else current.fc_inf
        k_final = calib.k if params_changed else current.k

        snapshot_id: Optional[int] = None

        if params_changed or sigma_changed:
            snap = self._repo.save(
                plant_id=plant_id,
                model=model,
                fc_inf=fc_inf_final,
                k=k_final,
                sigma=new_sigma_state.sigma,
                sigma_n=new_sigma_state.n,
                mean_residual=new_sigma_state.mean_residual,
                n_pairs=calib.n_pairs,
                n_age28=calib.n_age28,
                mean_ratio=calib.mean_ratio,
                triggered_by_result_id=result_id,
            )
            snapshot_id = snap.id

        return CalibrationOutcome(
            fc_inf=fc_inf_final,
            k=k_final,
            sigma=new_sigma_state.sigma,
            sigma_n=new_sigma_state.n,
            mean_residual=new_sigma_state.mean_residual,
            calibration_updated=params_changed,
            sigma_updated=sigma_changed,
            snapshot_id=snapshot_id,
            calib_meta=calib,
        )

    # ── Consulta simples (uso por prediction_service) ─

    def get_current_params(
        self,
        plant_id: Optional[str],
        model: str = "arrhenius",
    ) -> ParameterSet:
        return self._repo.get_current(plant_id=plant_id, model=model)

    def get_history(
        self,
        plant_id: Optional[str],
        model: str = "arrhenius",
        limit: int = 50,
    ):
        return self._repo.list_history(plant_id=plant_id, model=model, limit=limit)


# ─────────────────────────────────────────────────────
#  HELPER INTERNO
# ─────────────────────────────────────────────────────

def _compute_residuals(
    records: list[dict],
    calib: CalibrationResult,
    model: str,
) -> list[float]:
    """
    Calcula resíduos (fc_real - fc_previsto) para todos os registros,
    usando os parâmetros recém-calibrados.
    Importado inline para evitar dependência circular com prediction_engine.
    """
    from math import exp

    R_GAS = 8.314462618
    EA = 40_000.0
    TREF = 20.0 + 273.15

    residuals: list[float] = []
    for r in records:
        age = r["age_days"]
        temp = r["temperature"]
        fc_real = r["fc_mpa"]

        if model == "nurse_saul":
            teq = age * max(0.0, temp) / 20.0
        else:
            T = temp + 273.15
            teq = age * exp((EA / R_GAS) * (1.0 / TREF - 1.0 / T))

        base = max(1e-12, 1.0 - exp(-calib.k * max(1e-9, teq)))
        fc_pred = calib.fc_inf * base
        residuals.append(fc_real - fc_pred)

    return residuals
