from datetime import datetime

from sqlalchemy import ForeignKey, String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(primary_key=True)
    batch_id: Mapped[int] = mapped_column(ForeignKey("batches.id"))
    age_days: Mapped[float]
    fc_predicted: Mapped[float]
    model: Mapped[str] = mapped_column(String(32), default="arrhenius")
    fc_inf: Mapped[float]
    k: Mapped[float]
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    batch: Mapped["Batch"] = relationship(back_populates="predictions")
