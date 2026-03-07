"""
app/routers/reports.py
CONCRYA AION — Router de Relatórios

GET /api/v1/reports/weekly
  Gera o relatório semanal em PDF e retorna para download.
"""

from __future__ import annotations

from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.report_service import WeeklyReportService

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


@router.get(
    "/weekly",
    summary="Relatório semanal da planta (PDF)",
    response_class=FileResponse,
)
def weekly_report(
    plant_id: str = Query(..., description="Identificador da planta (label no relatório)"),
    week_end: Optional[date] = Query(None, description="Fim da semana YYYY-MM-DD (default: hoje)"),
    format: Literal["pdf"] = Query("pdf"),
    db: Session = Depends(get_db),
):
    svc = WeeklyReportService(db)
    try:
        pdf_path = svc.generate_weekly_pdf(plant_id=plant_id, week_end=week_end)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Falha ao gerar relatório: {exc}")

    filename = pdf_path.replace("\\", "/").rsplit("/", 1)[-1]
    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=filename,
    )
