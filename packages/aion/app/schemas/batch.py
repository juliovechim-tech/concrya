from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class BatchCreate(BaseModel):
    plant_id: Optional[str] = None
    external_id: str
    occurred_at: datetime
    target_fck: float
    temperature: float
    added_water: Optional[float] = None
    aggregate_moisture: Optional[float] = None
    target_slump: Optional[float] = None
    slump_measured: Optional[float] = None
    notes: Optional[str] = None


class BatchOut(BatchCreate):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
