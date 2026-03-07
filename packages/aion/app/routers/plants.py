"""
app/routers/plants.py
CONCRYA AION — Router de Plantas

GET  /api/v1/plants                  — lista plantas
POST /api/v1/plants                  — cria planta
GET  /api/v1/plants/{plant_id}/status — status de calibração (para o Cockpit)
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Plant
from infrastructure.repositories.parameter_repo import ParameterRepository, ParameterSnapshot

router = APIRouter(prefix="/api/v1/plants", tags=["plants"])


# ─────────────────────────────────────────────────────
#  SCHEMAS
# ─────────────────────────────────────────────────────

class PlantCreate(BaseModel):
    id: str
    name: str
    is_active: bool = True


class PlantOut(BaseModel):
    id: str
    name: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CalibrationStatus(BaseModel):
    plant_id: str
    phase: str                        # "warmup" | "steady" | "no_data"
    fc_inf: float
    k: float
    sigma: float
    sigma_n: int
    n_pairs: int
    snapshot_id: Optional[int]
    snapshot_date: Optional[str]      # ISO date string
    is_default: bool


# ─────────────────────────────────────────────────────
#  ENDPOINTS
# ─────────────────────────────────────────────────────

@router.get("", response_model=list[PlantOut], summary="Listar plantas")
def list_plants(db: Session = Depends(get_db)) -> list[PlantOut]:
    return db.query(Plant).order_by(Plant.id.asc()).all()


@router.post(
    "",
    response_model=PlantOut,
    status_code=status.HTTP_201_CREATED,
    summary="Criar planta",
)
def create_plant(data: PlantCreate, db: Session = Depends(get_db)) -> PlantOut:
    if db.query(Plant).filter(Plant.id == data.id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Planta '{data.id}' já existe.",
        )
    plant = Plant(**data.model_dump())
    db.add(plant)
    db.commit()
    db.refresh(plant)
    return plant


@router.get(
    "/{plant_id}/status",
    response_model=CalibrationStatus,
    summary="Status de calibração da planta (Cockpit)",
)
def plant_status(plant_id: str, db: Session = Depends(get_db)) -> CalibrationStatus:
    # Valida existência
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if plant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Planta '{plant_id}' não encontrada.",
        )

    model = settings.default_model

    # Parâmetros vigentes (por planta/model)
    param_set = ParameterRepository(db).get_current(plant_id=plant_id, model=model)

    # Snapshot mais recente (para data)
    latest_snap: Optional[ParameterSnapshot] = (
        db.query(ParameterSnapshot)
        .filter(
            ParameterSnapshot.plant_id == plant_id,
            ParameterSnapshot.model == model,
        )
        .order_by(ParameterSnapshot.id.desc())
        .first()
    )

    # Fase: primeiro snapshot com n_pairs >= 2 define a fronteira steady
    first_steady = (
        db.query(ParameterSnapshot)
        .filter(
            ParameterSnapshot.plant_id == plant_id,
            ParameterSnapshot.model == model,
            ParameterSnapshot.n_pairs >= 2,
        )
        .order_by(ParameterSnapshot.id)
        .first()
    )

    if latest_snap is None:
        phase = "no_data"
    elif first_steady is None:
        phase = "warmup"
    else:
        phase = "steady"

    snap_date = (
        latest_snap.created_at.strftime("%Y-%m-%d %H:%M")
        if latest_snap
        else None
    )

    return CalibrationStatus(
        plant_id=plant_id,
        phase=phase,
        fc_inf=param_set.fc_inf,
        k=param_set.k,
        sigma=param_set.sigma,
        sigma_n=param_set.sigma_n,
        n_pairs=latest_snap.n_pairs if latest_snap else 0,
        snapshot_id=param_set.snapshot_id,
        snapshot_date=snap_date,
        is_default=param_set.is_default,
    )
