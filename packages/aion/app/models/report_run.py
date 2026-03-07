from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database import Base


class ReportRun(Base):
    """Registro de cada relatório PDF gerado — histórico auditável."""

    __tablename__ = "report_runs"

    id:          Mapped[int]           = mapped_column(Integer, primary_key=True)
    plant_id:    Mapped[str]           = mapped_column(String(64), ForeignKey("plants.id", ondelete="CASCADE"), nullable=False)
    report_type: Mapped[str]           = mapped_column(String(32), nullable=False, default="weekly")
    week_end:    Mapped[date]          = mapped_column(Date, nullable=False)
    file_path:   Mapped[str]           = mapped_column(String(512), nullable=False)
    created_at:  Mapped[datetime]      = mapped_column(DateTime, nullable=False, server_default=func.now())
    meta_json:   Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Indexes alinham com a migration c3e4f5a6b7d8
    __table_args__ = (
        Index("ix_report_runs_plant_week",    "plant_id", "week_end"),
        Index("ix_report_runs_plant_created", "plant_id", "created_at"),
    )
