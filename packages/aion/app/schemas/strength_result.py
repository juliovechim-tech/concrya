from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.alert import AlertOut


class StrengthResultCreate(BaseModel):
    external_id: str
    age_days: float
    fc_mpa: float
    specimen_count: int = 3
    test_standard: str = "ABNT NBR 5739"
    lab: str = ""
    notes: Optional[str] = None


class StrengthResultOut(BaseModel):
    id: int
    batch_id: int
    age_days: float
    fc_mpa: float
    specimen_count: int
    test_standard: str
    lab: str
    notes: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StrengthResultWithAlertsOut(BaseModel):
    result: StrengthResultOut
    alerts_generated: list[AlertOut] = []
