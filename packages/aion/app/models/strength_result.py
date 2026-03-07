from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, String, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class StrengthResult(Base):
    __tablename__ = "strength_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    plant_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("plants.id"), nullable=True, index=True
    )
    batch_id: Mapped[int] = mapped_column(ForeignKey("batches.id"))
    age_days: Mapped[float]
    fc_mpa: Mapped[float]
    specimen_count: Mapped[int] = mapped_column(default=3)
    test_standard: Mapped[str] = mapped_column(String(64), default="ABNT NBR 5739")
    lab: Mapped[str] = mapped_column(String(128), default="")
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    batch: Mapped["Batch"] = relationship(back_populates="results")
