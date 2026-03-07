"""
app/routers/batches.py
CONCRYA AION — Router de Lotes (Batches)

POST /api/v1/batches          — cria lote
GET  /api/v1/batches/{id}     — consulta por external_id
GET  /api/v1/batches          — lista (paginado)
"""

from __future__ import annotations

import csv
import io
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Batch
from app.schemas.batch import BatchCreate, BatchOut

router = APIRouter(prefix="/api/v1/batches", tags=["batches"])


@router.post(
    "",
    response_model=BatchOut,
    status_code=status.HTTP_201_CREATED,
    summary="Criar lote",
)
def create_batch(data: BatchCreate, db: Session = Depends(get_db)) -> BatchOut:
    if db.query(Batch).filter(Batch.external_id == data.external_id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Lote '{data.external_id}' já existe.",
        )
    batch = Batch(**data.model_dump())
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


@router.get(
    "/{external_id}",
    response_model=BatchOut,
    summary="Consultar lote por external_id",
)
def get_batch(external_id: str, db: Session = Depends(get_db)) -> BatchOut:
    batch = db.query(Batch).filter(Batch.external_id == external_id).first()
    if batch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lote '{external_id}' não encontrado.",
        )
    return batch


@router.get(
    "",
    response_model=list[BatchOut],
    summary="Listar lotes",
)
def list_batches(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    plant_id: Optional[str] = Query(None, description="Filtrar por planta"),
    db: Session = Depends(get_db),
) -> list[BatchOut]:
    q = db.query(Batch)
    if plant_id:
        q = q.filter(Batch.plant_id == plant_id)
    return q.order_by(Batch.occurred_at.desc()).offset(skip).limit(limit).all()


@router.post(
    "/import/csv",
    summary="Importar lotes via CSV",
)
def import_batches_csv(
    file: UploadFile = File(...),
    plant_id: Optional[str] = Query(None, description="Planta para todos os lotes do CSV"),
    db: Session = Depends(get_db),
):
    """
    Cabeçalho CSV esperado:
    external_id,occurred_at,target_fck,temperature,added_water,aggregate_moisture,target_slump,slump_measured,notes[,plant_id]
    O parâmetro `plant_id` na query sobrescreve a coluna plant_id do CSV (se houver).
    """
    content = file.file.read().decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(content))

    created, skipped, errors = 0, 0, []

    def _f(val):
        try:
            return float(val) if val not in (None, "", "null") else None
        except (ValueError, TypeError):
            return None

    for i, row in enumerate(reader, start=2):
        ext = (row.get("external_id") or "").strip()
        if not ext:
            errors.append(f"Linha {i}: external_id ausente")
            continue
        if db.query(Batch).filter(Batch.external_id == ext).first():
            skipped += 1
            continue

        raw_dt = (row.get("occurred_at") or "").strip()
        try:
            occurred_at = datetime.fromisoformat(raw_dt) if raw_dt else datetime.utcnow()
        except ValueError:
            occurred_at = datetime.utcnow()

        # plant_id: query param tem prioridade; senão, coluna do CSV
        resolved_plant_id = plant_id or (row.get("plant_id") or "").strip() or None

        db.add(Batch(
            plant_id=resolved_plant_id,
            external_id=ext,
            occurred_at=occurred_at,
            target_fck=_f(row.get("target_fck")),
            temperature=_f(row.get("temperature")),
            added_water=_f(row.get("added_water")),
            aggregate_moisture=_f(row.get("aggregate_moisture")),
            target_slump=_f(row.get("target_slump")),
            slump_measured=_f(row.get("slump_measured")),
            notes=row.get("notes") or None,
        ))
        created += 1

    db.commit()
    return {"created": created, "skipped_existing": skipped, "errors": errors}
