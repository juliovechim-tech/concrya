from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ParameterUpdateOut(BaseModel):
    id: int
    model: str
    fc_inf_before: float
    k_before: float
    fc_inf_after: float
    k_after: float
    n_samples: int
    triggered_by_result_id: Optional[int]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
