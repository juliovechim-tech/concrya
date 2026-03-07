from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ParameterUpdate(Base):
    __tablename__ = "parameter_updates"

    id: Mapped[int] = mapped_column(primary_key=True)
    model: Mapped[str] = mapped_column(String(32))
    fc_inf_before: Mapped[float]
    k_before: Mapped[float]
    fc_inf_after: Mapped[float]
    k_after: Mapped[float]
    n_samples: Mapped[int]
    triggered_by_result_id: Mapped[Optional[int]] = mapped_column(ForeignKey("strength_results.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
