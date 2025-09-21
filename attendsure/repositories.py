from __future__ import annotations

import json
from typing import Any, Dict, List, Optional, Tuple

from sqlmodel import Session, select

from .models import Call, CallResult, Patient


REQUIRED_PATIENT_FIELDS = [
    "name",
    "gender",
    "phone",
    "dob",
    "appointment_date",
    "appointment_time",
    "doctor_name",
]


def create_patient(session: Session, data: Dict[str, Any]) -> Patient:
    patient = Patient(**data)
    session.add(patient)
    session.commit()
    session.refresh(patient)
    return patient


def bulk_insert_patients(session: Session, rows: List[Dict[str, Any]]) -> Tuple[int, List[Dict[str, Any]]]:
    inserted = 0
    errors: List[Dict[str, Any]] = []
    for idx, row in enumerate(rows, start=1):
        try:
            payload = {k: (row.get(k) if row.get(k) not in ("", None) else None) for k in REQUIRED_PATIENT_FIELDS}
            if not payload.get("name") or not payload.get("phone"):
                raise ValueError("Missing required fields: name, phone")
            session.add(Patient(**payload))
            inserted += 1
        except Exception as e:  # noqa: BLE001 - demo simplicity
            errors.append({"row": idx, "error": str(e), "data": row})
    session.commit()
    return inserted, errors


def list_patients(session: Session, limit: int = 100, offset: int = 0) -> List[Patient]:
    result = session.exec(select(Patient).offset(offset).limit(limit))
    return list(result)


def create_call_record(
    session: Session,
    patient_id: int,
    scheduled_at: Optional[str] = None,
) -> Call:
    call = Call(patient_id=patient_id, scheduled_at=scheduled_at)
    session.add(call)
    session.commit()
    session.refresh(call)
    return call


def mark_call_launched(
    session: Session,
    call_id: int,
    vapi_call_id: Optional[str],
    status: str = "in_progress",
    started_at: Optional[str] = None,
) -> Call:
    call = session.get(Call, call_id)
    if not call:
        raise ValueError(f"Call {call_id} not found")
    call.vapi_call_id = vapi_call_id
    call.status = status
    if started_at:
        call.started_at = started_at
    session.add(call)
    session.commit()
    session.refresh(call)
    return call


def mark_call_failed(session: Session, call_id: int, reason: str) -> Call:
    call = session.get(Call, call_id)
    if not call:
        raise ValueError(f"Call {call_id} not found")
    call.status = "failed"
    call.fail_reason = reason
    session.add(call)
    session.commit()
    session.refresh(call)
    return call


def update_call_status_by_vapi_id(
    session: Session,
    vapi_call_id: str,
    status: str,
    started_at: Optional[str] = None,
    ended_at: Optional[str] = None,
    fail_reason: Optional[str] = None,
) -> Optional[Call]:
    call = session.exec(select(Call).where(Call.vapi_call_id == vapi_call_id)).first()
    if not call:
        return None
    call.status = status
    if started_at:
        call.started_at = started_at
    if ended_at:
        call.ended_at = ended_at
    if fail_reason:
        call.fail_reason = fail_reason
    session.add(call)
    session.commit()
    session.refresh(call)
    return call


def insert_result_for_call(
    session: Session,
    call_id: int,
    summary: Optional[str],
    structured_json_obj: Optional[Dict[str, Any]],
    raw_payload: Dict[str, Any],
) -> CallResult:
    existing = session.exec(select(CallResult).where(CallResult.call_id == call_id)).first()
    if existing:
        result = existing
        result.summary = summary
        result.structured_json = json.dumps(structured_json_obj) if structured_json_obj is not None else None
        result.raw_payload = json.dumps(raw_payload)
    else:
        result = CallResult(
            call_id=call_id,
            summary=summary,
            structured_json=json.dumps(structured_json_obj) if structured_json_obj is not None else None,
            raw_payload=json.dumps(raw_payload),
        )
        session.add(result)
    session.commit()
    session.refresh(result)
    return result


def get_calls_joined(session: Session) -> List[Dict[str, Any]]:
    calls = session.exec(select(Call)).all()
    results: List[Dict[str, Any]] = []
    for call in calls:
        patient = session.get(Patient, call.patient_id)
        result = session.exec(select(CallResult).where(CallResult.call_id == call.id)).first()
        results.append(
            {
                "call": call,
                "patient": patient,
                "result": result,
            }
        )
    return results


def get_call_detail(session: Session, call_id: int) -> Optional[Dict[str, Any]]:
    call = session.get(Call, call_id)
    if not call:
        return None
    patient = session.get(Patient, call.patient_id)
    result = session.exec(select(CallResult).where(CallResult.call_id == call.id)).first()
    return {"call": call, "patient": patient, "result": result}


def find_call_by_vapi_id(session: Session, vapi_call_id: str) -> Optional[Call]:
    return session.exec(select(Call).where(Call.vapi_call_id == vapi_call_id)).first()


