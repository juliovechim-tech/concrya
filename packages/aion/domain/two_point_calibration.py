"""
domain/two_point_calibration.py
CONCRYA AION — Calibração de dois pontos

Matemática pura: estima fc_inf e k a partir da razão fc_7/fc_28.
Sem dependências externas além da stdlib.

Método:
  1. Calcula a razão média fc_7/fc_28 dos lotes com ambas as idades.
  2. Resolve por bisseção: k tal que
       (1 - exp(-k·teq7)) / (1 - exp(-k·teq28)) = razão_média
  3. Estima fc_inf = fc28_médio / (1 - exp(-k·teq28))
"""

from __future__ import annotations

from dataclasses import dataclass
from math import exp
from typing import Literal

R_GAS = 8.314462618
EA_DEFAULT = 40_000.0   # J/mol
TREF_C = 20.0
T0_C = 0.0              # Nurse-Saul datum


# ─────────────────────────────────────────────────────
#  TEMPO EQUIVALENTE
# ─────────────────────────────────────────────────────

def _teq_arrhenius(age: float, temp_c: float) -> float:
    T = temp_c + 273.15
    Tref = TREF_C + 273.15
    return age * exp((EA_DEFAULT / R_GAS) * (1.0 / Tref - 1.0 / T))


def _teq_nurse_saul(age: float, temp_c: float) -> float:
    return age * max(0.0, temp_c - T0_C) / max(1e-6, TREF_C - T0_C)


def teq(age: float, temp_c: float, model: Literal["arrhenius", "nurse_saul"]) -> float:
    if model == "nurse_saul":
        return _teq_nurse_saul(age, temp_c)
    return _teq_arrhenius(age, temp_c)


# ─────────────────────────────────────────────────────
#  RESULTADO DA CALIBRAÇÃO
# ─────────────────────────────────────────────────────

@dataclass(frozen=True)
class CalibrationResult:
    fc_inf: float
    k: float
    n_pairs: int        # lotes com fc_7 E fc_28
    n_age28: int        # lotes com fc_28 (base para fc_inf)
    mean_ratio: float   # razão fc_7/fc_28 usada


# ─────────────────────────────────────────────────────
#  CALIBRAÇÃO DOIS PONTOS
# ─────────────────────────────────────────────────────

def two_point_calibration(
    records: list[dict],
    model: Literal["arrhenius", "nurse_saul"] = "arrhenius",
    bisection_iters: int = 80,
) -> CalibrationResult:
    """
    Estima fc_inf e k pelo método dos dois pontos.

    Parâmetros
    ----------
    records : list[dict]
        Cada dict deve ter as chaves:
          - external_id : str
          - age_days    : float
          - fc_mpa      : float
          - temperature : float
    model : "arrhenius" | "nurse_saul"
    bisection_iters : número de iterações da bisseção

    Retorna
    -------
    CalibrationResult com fc_inf, k e metadados.
    """
    age28_recs = [r for r in records if abs(r["age_days"] - 28.0) < 1.0]

    if not age28_recs:
        # Sem dados de 28d — retorna defaults
        return CalibrationResult(fc_inf=55.0, k=0.25, n_pairs=0, n_age28=0, mean_ratio=0.0)

    # Temperatura média dos ensaios de 28d
    temp_mean = sum(r["temperature"] for r in age28_recs) / len(age28_recs)

    teq7_m = teq(7.0, temp_mean, model)
    teq28_m = teq(28.0, temp_mean, model)

    # Agrupa por lote para calcular razão fc_7/fc_28
    by_id: dict[str, dict[float, dict]] = {}
    for r in records:
        by_id.setdefault(r["external_id"], {})[float(r["age_days"])] = r

    ratios: list[float] = []
    for pts in by_id.values():
        fc7 = next((pts[a]["fc_mpa"] for a in pts if abs(a - 7.0) < 0.6), None)
        fc28 = next((pts[a]["fc_mpa"] for a in pts if abs(a - 28.0) < 1.0), None)
        if fc7 is not None and fc28 is not None and fc28 > 0:
            ratios.append(fc7 / fc28)

    k_est = _solve_k(ratios, teq7_m, teq28_m, bisection_iters)

    fc28_mean = sum(r["fc_mpa"] for r in age28_recs) / len(age28_recs)
    denom = max(1e-9, 1.0 - exp(-k_est * teq28_m))
    fc_inf_est = fc28_mean / denom

    mean_ratio = sum(ratios) / len(ratios) if ratios else 0.0

    return CalibrationResult(
        fc_inf=round(fc_inf_est, 2),
        k=round(max(0.05, k_est), 5),
        n_pairs=len(ratios),
        n_age28=len(age28_recs),
        mean_ratio=round(mean_ratio, 4),
    )


def _solve_k(
    ratios: list[float],
    teq7: float,
    teq28: float,
    max_iters: int,
) -> float:
    """Bisseção: acha k tal que ratio_hat(k) == mean_ratio."""
    if len(ratios) < 2 or teq7 <= 0 or teq28 <= 0:
        return 0.12  # fallback

    mean_ratio = sum(ratios) / len(ratios)

    def ratio_hat(k: float) -> float:
        num = 1.0 - exp(-k * teq7)
        den = max(1e-9, 1.0 - exp(-k * teq28))
        return num / den

    lo, hi = 0.001, 5.0
    g_lo = ratio_hat(lo) - mean_ratio

    if (ratio_hat(hi) - mean_ratio) * g_lo >= 0:
        return 0.12  # não há solução no intervalo — fallback

    for _ in range(max_iters):
        mid = (lo + hi) / 2.0
        if (ratio_hat(mid) - mean_ratio) * g_lo <= 0:
            hi = mid
        else:
            lo = mid
            g_lo = ratio_hat(lo) - mean_ratio

    return (lo + hi) / 2.0
