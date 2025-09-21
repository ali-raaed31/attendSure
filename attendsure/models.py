from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class Patient(SQLModel, table=True):
    __tablename__ = "patients"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    gender: Optional[str] = Field(default=None, description="male|female|other")
    phone: str
    dob: Optional[str] = None
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    doctor_name: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class Call(SQLModel, table=True):
    __tablename__ = "calls"

    id: Optional[int] = Field(default=None, primary_key=True)
    patient_id: int = Field(foreign_key="patients.id")
    vapi_call_id: Optional[str] = Field(default=None, unique=True, index=True)
    status: str = Field(default="queued", description="queued|in_progress|completed|failed")
    scheduled_at: Optional[str] = None
    started_at: Optional[str] = None
    ended_at: Optional[str] = None
    fail_reason: Optional[str] = None


class CallResult(SQLModel, table=True):
    __tablename__ = "call_results"

    id: Optional[int] = Field(default=None, primary_key=True)
    call_id: int = Field(foreign_key="calls.id")
    summary: Optional[str] = None
    structured_json: Optional[str] = None
    raw_payload: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


