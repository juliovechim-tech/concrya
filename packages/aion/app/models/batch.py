from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, String, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Batch(Base):
    __tablename__ = "batches"

    id: Mapped[int] = mapped_column(primary_key=True)
    plant_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("plants.id"), nullable=True, index=True
    )
    external_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime)
    target_fck: Mapped[float]
    temperature: Mapped[float]
    added_water: Mapped[Optional[float]]
    aggregate_moisture: Mapped[Optional[float]]
    target_slump: Mapped[Optional[float]]
    slump_measured: Mapped[Optional[float]]
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    results: Mapped[list["StrengthResult"]] = relationship(back_populates="batch", cascade="all, delete-orphan")
    predictions: Mapped[list["Prediction"]] = relationship(back_populates="batch", cascade="all, delete-orphan")
    alerts: Mapped[list["Alert"]] = relationship(back_populates="batch", cascade="all, delete-orphan")
