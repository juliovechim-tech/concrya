"""
domain/sigma_update.py
CONCRYA AION — Atualização de incerteza (sigma)

Matemática pura: mantém uma estimativa do desvio-padrão dos resíduos
(previsto - real) para quantificar a incerteza das predições.

Dois modos de uso:
  1. batch_sigma    — calcula sigma de uma lista de resíduos (usado na
                      primeira calibração ou recalibrações completas).
  2. online_sigma   — atualização sequencial por média móvel exponencial
                      (EMA), usada após cada novo ensaio sem reprocessar
                      todo o histórico.

Motivação:
  sigma é usado para construir intervalos de confiança nas predições e
  para ajustar dinamicamente o limiar de alerta de drift.
"""

from __future__ import annotations

from dataclasses import dataclass
from math import sqrt


# ─────────────────────────────────────────────────────
#  ESTADO DE SIGMA
# ─────────────────────────────────────────────────────

@dataclass
class SigmaState:
    """Estado atual da estimativa de incerteza."""
    sigma: float        # desvio-padrão dos resíduos (MPa)
    n: int              # número de observações usadas
    mean_residual: float = 0.0  # bias médio (positivo = superprevisto)

    @property
    def sigma_7d(self) -> float:
        """
        Ajuste empírico para 7d: sigma em idades jovens tende a ser maior.
        Fator 1.2 até haver dados suficientes.
        """
        if self.n < 10:
            return self.sigma * 1.2
        return self.sigma


_SIGMA_FLOOR = 0.3    # MPa — mínimo físico razoável
_SIGMA_DEFAULT = 3.0  # MPa — prior conservador (sem dados)


# ─────────────────────────────────────────────────────
#  CÁLCULO BATCH
# ─────────────────────────────────────────────────────

def batch_sigma(residuals: list[float]) -> SigmaState:
    """
    Calcula sigma a partir de um lote de resíduos (real - previsto).

    Parâmetros
    ----------
    residuals : list[float]
        Valores de (fc_real - fc_previsto) para cada ensaio.

    Retorna
    -------
    SigmaState com sigma, n e mean_residual.
    """
    n = len(residuals)
    if n == 0:
        return SigmaState(sigma=_SIGMA_DEFAULT, n=0)
    if n == 1:
        return SigmaState(sigma=_SIGMA_DEFAULT, n=1, mean_residual=residuals[0])

    mean = sum(residuals) / n
    var = sum((r - mean) ** 2 for r in residuals) / (n - 1)
    sigma = max(_SIGMA_FLOOR, sqrt(var))

    return SigmaState(sigma=round(sigma, 3), n=n, mean_residual=round(mean, 3))


# ─────────────────────────────────────────────────────
#  ATUALIZAÇÃO ONLINE (EMA)
# ─────────────────────────────────────────────────────

def online_sigma(
    state: SigmaState,
    new_residual: float,
    alpha: float = 0.15,
) -> SigmaState:
    """
    Atualiza sigma de forma online com média móvel exponencial.

    A variância é atualizada como:
        var_new = (1 - alpha) * var_prev + alpha * (residual - mean_prev)^2

    O mean_residual é atualizado como EMA simples:
        mean_new = (1 - alpha) * mean_prev + alpha * residual

    Parâmetros
    ----------
    state      : SigmaState atual (vindo do banco via parameter_repo)
    new_residual : float — resíduo do ensaio mais recente (real - previsto)
    alpha      : float  — taxa de aprendizado (0 < alpha < 1)
                          0.15 → janela efetiva de ~6 ensaios

    Retorna
    -------
    Novo SigmaState (imutável — não modifica o estado anterior).
    """
    if alpha <= 0 or alpha >= 1:
        raise ValueError(f"alpha deve ser entre 0 e 1 exclusivo, recebido: {alpha}")

    # Primeira observação: não há histórico para calcular variância
    if state.n == 0:
        return SigmaState(sigma=_SIGMA_DEFAULT, n=1, mean_residual=new_residual)

    mean_new = (1.0 - alpha) * state.mean_residual + alpha * new_residual

    # Variância EMA (centrada na média anterior para estabilidade)
    deviation = new_residual - state.mean_residual
    var_prev = state.sigma ** 2
    var_new = (1.0 - alpha) * var_prev + alpha * deviation ** 2

    sigma_new = max(_SIGMA_FLOOR, sqrt(var_new))

    return SigmaState(
        sigma=round(sigma_new, 3),
        n=state.n + 1,
        mean_residual=round(mean_new, 3),
    )


# ─────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────

def confidence_interval(fc_predicted: float, state: SigmaState, z: float = 1.645) -> tuple[float, float]:
    """
    Intervalo de confiança para uma predição.

    Parâmetros
    ----------
    fc_predicted : float — valor previsto (MPa)
    state        : SigmaState — estado atual de sigma
    z            : float — fator Z (1.645 = 90%, 1.96 = 95%)

    Retorna
    -------
    (fc_lower, fc_upper) em MPa
    """
    margin = z * state.sigma
    return (
        round(fc_predicted - margin, 2),
        round(fc_predicted + margin, 2),
    )


def default_sigma_state() -> SigmaState:
    """Retorna estado inicial sem dados históricos."""
    return SigmaState(sigma=_SIGMA_DEFAULT, n=0, mean_residual=0.0)
