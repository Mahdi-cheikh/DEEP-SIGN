"""Pydantic request/response schemas."""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# --- Auth ---


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    full_name: Optional[str] = Field(default=None, max_length=255)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: Optional[str] = None
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


# --- Detection ---


class DetectionResult(BaseModel):
    sign: str
    confidence: float
    hands_detected: int
    annotations: Optional[List[List[float]]] = None  # (x, y) normalised landmarks for overlay


class DetectionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sign: str
    confidence: float
    created_at: datetime


class HistoryStats(BaseModel):
    total: int
    unique_signs: int
    top_sign: Optional[str] = None
    last_seen_at: Optional[datetime] = None
