from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional

import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from .db import get_session
from .models import Patient
from .repositories import (
    create_call_record,
    get_call_detail,
    get_calls_joined,
)
from .services_launcher import launcher
from .settings import settings


router = APIRouter(prefix="/api/calls", tags=["calls"])
logger = logging.getLogger("attendsure.calls")


def _normalize_e164(candidate: str) -> str:
    c = (candidate or "").strip()
    # If it already starts with '+', assume correct
    if c.startswith('+'):
        return c
    # If it looks like digits only and 10-15 length, prefix '+'
    if c.isdigit() and 8 <= len(c) <= 15:
        return '+' + c
    return c


@router.post("/launch")
async def launch_calls(payload: Dict[str, Any], session: Session = Depends(get_session)):
    patient_ids: List[int] = payload.get("patientIds") or []
    schedule_at: Optional[str] = payload.get("scheduleAt")
    if not patient_ids:
        raise HTTPException(status_code=400, detail="patientIds is required")

    call_ids: List[int] = []
    for patient_id in patient_ids:
        patient = session.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
        call = create_call_record(session, patient_id=patient_id, scheduled_at=schedule_at)
        call_ids.append(call.id)

        variable_values = {
            # legacy keys (still sending for backward compat in your assistant)
            "name": patient.name,
            "gender": patient.gender,
            "appointment_date": patient.appointment_date,
            "appointment_time": patient.appointment_time,
            "doctor_name": patient.doctor_name,
            # requested keys
            "app_date": patient.appointment_date,
            "app_time": patient.appointment_time,
            "full_name": patient.name,
            "dob": patient.dob,
            "doctor": patient.doctor_name,
        }

        metadata = {"patientId": patient.id, "callId": call.id}

        # Schedule or immediate launch via launcher (throttled)
        logger.info("Queue launch call -> patientId=%s callId=%s", patient_id, call.id)
        asyncio.create_task(
            launcher.launch_call(
                call_id=call.id,
                phone=_normalize_e164(patient.phone),
                assistant_id=settings.vapi_assistant_id,
                variable_values=variable_values,
                schedule_at=schedule_at,
                metadata=metadata,
            )
        )

    return {"callIds": call_ids}


@router.get("")
async def list_calls(session: Session = Depends(get_session)):
    return get_calls_joined(session)


@router.get("/{call_id}")
async def get_call(call_id: int, session: Session = Depends(get_session)):
    detail = get_call_detail(session, call_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Not found")
    return detail


