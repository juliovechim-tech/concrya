"""
Motor de predição de resistência do concreto.
Portado do pilot_report.py — CONCRYA AION CORE 1.0
"""

from __future__ import annotations

from math import exp, sqrt

R_GAS = 8.314462618


# ─────────────────────────────────────────────────────
#  TEMPO EQUIVALENTE
# ─────────────────────────────────────────────────────

def teq_arrhenius(
    age: float,
    temp_c: float,
    tref_c: float = 20.0,
    ea: float = 40_000.0,
) -> float:
    T = temp_c + 273.15
    Tref = tref_c + 273.15
    return age * exp((ea / R_GAS) * (1.0 / Tref - 1.0 / T))


def teq_nurse_saul(
    age: float,
    temp_c: float,
    t0_c: float = 0.0,
    tref_c: float = 20.0,
) -> float:
    return age * max(0.0, temp_c - t0_c) / max(1e-6, tref_c - t0_c)


# ─────────────────────────────────────────────────────
#  MODELO DE RESISTÊNCIA
# ─────────────────────────────────────────────────────

def fc_model(teq: float, fc_inf: float, k: float, m: float = 1.0) -> float:
    base = max(1e-12, 1.0 - exp(-k * teq))
    return fc_inf * (base ** m)


def predict(
    temp_c: float,
    age: float,
    fc_inf: float = 55.0,
    k: float = 0.25,
    model: str = "arrhenius",
) -> float:
    if model == "nurse_saul":
        teq = teq_nurse_saul(age, temp_c)
    else:
        teq = teq_arrhenius(age, temp_c)
    return fc_model(max(1e-9, teq), fc_inf, k)


# ─────────────────────────────────────────────────────
#  ESTIMATIVA DE PARÂMETROS (método dois pontos)
# ─────────────────────────────────────────────────────

def estimate_params(
    records: list[dict],
    model: str = "arrhenius",
) -> tuple[float, float]:
    """
    Estima fc_inf e k pela razão fc_7/fc_28 (método de dois pontos).
    records: lista de dicts com chaves age_days, fc_mpa, temperature, external_id
    Retorna (fc_inf, k).
    """
    age28 = [r for r in records if abs(r["age_days"] - 28.0) < 1.0]

    if not age28:
        return 55.0, 0.25

    temps = [r["temperature"] for r in age28]
    temp_mean = sum(temps) / len(temps)

    def teq(age_: float, t_c: float) -> float:
        if model == "nurse_saul":
            return age_ * max(0.0, t_c) / 20.0
        T_ = t_c + 273.15
        Tref_ = 20.0 + 273.15
        return age_ * exp((40_000.0 / R_GAS) * (1.0 / Tref_ - 1.0 / T_))

    teq7_m = teq(7.0, temp_mean)
    teq28_m = teq(28.0, temp_mean)

    # Razão média fc_7/fc_28 por lote
    by_id: dict = {}
    for r in records:
        by_id.setdefault(r["external_id"], {})[r["age_days"]] = r

    ratios = []
    for pts in by_id.values():
        keys = list(pts.keys())
        fc7 = next((pts[a]["fc_mpa"] for a in keys if abs(a - 7.0) < 0.6), None)
        fc28 = next((pts[a]["fc_mpa"] for a in keys if abs(a - 28.0) < 1.0), None)
        if fc7 and fc28 and fc28 > 0:
            ratios.append(fc7 / fc28)

    if ratios and len(ratios) >= 2:
        mean_ratio = sum(ratios) / len(ratios)

        def ratio_hat(k_: float) -> float:
            return (1.0 - exp(-k_ * teq7_m)) / max(1e-9, 1.0 - exp(-k_ * teq28_m))

        lo, hi = 0.001, 5.0
        g_lo = ratio_hat(lo) - mean_ratio
        g_hi = ratio_hat(hi) - mean_ratio
        if g_lo * g_hi < 0:
            for _ in range(80):
                mid = (lo + hi) / 2.0
                if (ratio_hat(mid) - mean_ratio) * g_lo <= 0:
                    hi = mid
                else:
                    lo = mid
                    g_lo = ratio_hat(lo) - mean_ratio
            k_est = (lo + hi) / 2.0
        else:
            k_est = 0.12
    else:
        k_est = 0.12

    fc28_mean = sum(r["fc_mpa"] for r in age28) / len(age28)
    denom = max(1e-9, 1.0 - exp(-k_est * teq28_m))
    fc_inf_est = fc28_mean / denom

    return round(fc_inf_est, 2), round(max(0.05, k_est), 5)
