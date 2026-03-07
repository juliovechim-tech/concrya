from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, String, Text, DateTime, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True)
    plant_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("plants.id"), nullable=True, index=True
    )
    batch_id: Mapped[int] = mapped_column(ForeignKey("batches.id"))
    alert_type: Mapped[str] = mapped_column(String(32))  # NC | DRIFT | LOW_7D
    severity: Mapped[str] = mapped_column(String(16))    # warning | critical
    message: Mapped[str] = mapped_column(Text)
    fc_actual: Mapped[Optional[float]]
    fc_predicted: Mapped[Optional[float]]
    fc_threshold: Mapped[Optional[float]]
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    batch: Mapped["Batch"] = relationship(back_populates="alerts")
