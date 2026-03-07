from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class PredictionRequest(BaseModel):
    external_id: str
    age_days: float
    model: Literal["arrhenius", "nurse_saul"] = "arrhenius"


class PredictionOut(BaseModel):
    id: int
    batch_id: int
    age_days: float
    fc_predicted: float
    model: str
    fc_inf: float
    k: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
