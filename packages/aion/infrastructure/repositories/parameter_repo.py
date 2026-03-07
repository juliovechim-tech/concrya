"""
infrastructure/repositories/parameter_repo.py
CONCRYA AION — Repositório de parâmetros de calibração

Responsabilidades:
  - Persistir cada atualização de parâmetros (fc_inf, k, sigma) por planta
  - Recuperar os parâmetros vigentes (mais recentes por planta/model)
  - Listar histórico de calibrações por planta

O modelo ParameterSnapshot guarda um snapshot completo após cada
calibração, incluindo sigma e metadados de rastreabilidade.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, desc, func
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.database import Base


# ─────────────────────────────────────────────────────
#  MODELO ORM
# ─────────────────────────────────────────────────────

class ParameterSnapshot(Base):
    """
    Snapshot completo dos parâmetros após cada calibração.
    Nunca sobrescreve: o histórico é imutável.
    """
    __tablename__ = "parameter_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    plant_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("plants.id"), nullable=True, index=True
    )
    model: Mapped[str] = mapped_column(String(32), index=True)       # arrhenius | nurse_saul

    # Parâmetros de resistência
    fc_inf: Mapped[float] = mapped_column(Float)
    k: Mapped[float] = mapped_column(Float)

    # Incerteza
    sigma: Mapped[float] = mapped_column(Float)
    sigma_n: Mapped[int] = mapped_column(Integer, default=0)          # n observações p/ sigma
    mean_residual: Mapped[float] = mapped_column(Float, default=0.0)

    # Metadados
    n_pairs: Mapped[int] = mapped_column(Integer, default=0)          # pares 7d/28d usados
    n_age28: Mapped[int] = mapped_column(Integer, default=0)          # lotes 28d usados
    mean_ratio: Mapped[float] = mapped_column(Float, default=0.0)     # razão fc7/fc28

    # Rastreabilidade
    triggered_by_result_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("strength_results.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ─────────────────────────────────────────────────────
#  DEFAULTS (sem dados históricos)
# ─────────────────────────────────────────────────────

@dataclass(frozen=True)
class ParameterSet:
    """Conjunto de parâmetros vigentes."""
    fc_inf: float
    k: float
    sigma: float
    sigma_n: int
    mean_residual: float
    snapshot_id: Optional[int] = None

    @property
    def is_default(self) -> bool:
        return self.snapshot_id is None


_DEFAULTS = ParameterSet(
    fc_inf=55.0,
    k=0.25,
    sigma=3.0,
    sigma_n=0,
    mean_residual=0.0,
)


# ─────────────────────────────────────────────────────
#  REPOSITÓRIO
# ─────────────────────────────────────────────────────

class ParameterRepository:
    def __init__(self, db: Session):
        self._db = db

    # ── Leitura ──────────────────────────────────────

    def _filter_plant(
        self,
        query,
        plant_id: Optional[str],
    ):
        if plant_id is None:
            return query.filter(ParameterSnapshot.plant_id.is_(None))
        return query.filter(ParameterSnapshot.plant_id == plant_id)

    def get_current(
        self,
        plant_id: Optional[str],
        model: str = "arrhenius",
    ) -> ParameterSet:
        """Retorna parâmetros vigentes da planta/model; sem histórico, retorna defaults."""
        q = self._db.query(ParameterSnapshot).filter(ParameterSnapshot.model == model)
        snap = self._filter_plant(q, plant_id).order_by(desc(ParameterSnapshot.id)).first()
        if snap is None:
            return _DEFAULTS

        return ParameterSet(
            fc_inf=snap.fc_inf,
            k=snap.k,
            sigma=snap.sigma,
            sigma_n=snap.sigma_n,
            mean_residual=snap.mean_residual,
            snapshot_id=snap.id,
        )

    def list_history(
        self,
        plant_id: Optional[str],
        model: str = "arrhenius",
        limit: int = 50,
    ) -> list[ParameterSnapshot]:
        """Retorna os últimos `limit` snapshots em ordem decrescente."""
        q = self._db.query(ParameterSnapshot).filter(ParameterSnapshot.model == model)
        return self._filter_plant(q, plant_id).order_by(desc(ParameterSnapshot.id)).limit(limit).all()

    # ── Escrita ──────────────────────────────────────

    def save(
        self,
        plant_id: Optional[str],
        model: str,
        fc_inf: float,
        k: float,
        sigma: float,
        sigma_n: int,
        mean_residual: float,
        n_pairs: int = 0,
        n_age28: int = 0,
        mean_ratio: float = 0.0,
        triggered_by_result_id: Optional[int] = None,
    ) -> ParameterSnapshot:
        """Persiste um novo snapshot de parâmetros e retorna o objeto salvo."""
        snap = ParameterSnapshot(
            plant_id=plant_id,
            model=model,
            fc_inf=fc_inf,
            k=k,
            sigma=sigma,
            sigma_n=sigma_n,
            mean_residual=mean_residual,
            n_pairs=n_pairs,
            n_age28=n_age28,
            mean_ratio=mean_ratio,
            triggered_by_result_id=triggered_by_result_id,
        )
        self._db.add(snap)
        self._db.flush()   # garante que snap.id seja preenchido antes do commit externo
        return snap
