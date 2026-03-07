from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AlertOut(BaseModel):
    id: int
    batch_id: int
    alert_type: str
    severity: str
    message: str
    fc_actual: Optional[float]
    fc_predicted: Optional[float]
    fc_threshold: Optional[float]
    resolved: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
