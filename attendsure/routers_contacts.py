from __future__ import annotations

import io
from typing import Any, Dict, List, Optional

import csv
import logging
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlmodel import Session

from .db import get_session
from .repositories import bulk_insert_patients, create_patient, list_patients


router = APIRouter(prefix="/api/contacts", tags=["contacts"])
logger = logging.getLogger("attendsure.contacts")


@router.post("/upload")
async def upload_contacts(
    file: UploadFile = File(None),
    rows: Optional[List[Dict[str, Any]]] = None,
    session: Session = Depends(get_session),
):
    if file is None and rows is None:
        raise HTTPException(status_code=400, detail="Provide CSV file or JSON array of rows")

    parsed_rows: List[Dict[str, Any]] = []
    if file is not None:
        content = await file.read()
        text_stream = io.StringIO(content.decode("utf-8"))
        reader = csv.DictReader(text_stream)
        # Validate required headers
        required = {"name", "gender", "phone", "dob", "appointment_date", "appointment_time", "doctor_name"}
        headers = set(reader.fieldnames or [])
        missing = sorted(list(required - headers))
        if missing:
            raise HTTPException(status_code=400, detail=f"Missing required columns: {', '.join(missing)}")
        for row in reader:
            parsed_rows.append({k: (v.strip() if isinstance(v, str) else v) for k, v in row.items()})
    else:
        parsed_rows = rows or []

    inserted, errors = bulk_insert_patients(session, parsed_rows)
    logger.info("CSV upload processed inserted=%s errors=%s", inserted, len(errors))
    return {"inserted": inserted, "errors": errors}


@router.post("/upload-json")
async def upload_contacts_json(
    rows: List[Dict[str, Any]],
    session: Session = Depends(get_session),
):
    inserted, errors = bulk_insert_patients(session, rows)
    return {"inserted": inserted, "errors": errors}


@router.post("")
async def create_contact(payload: Dict[str, Any], session: Session = Depends(get_session)):
    patient = create_patient(session, payload)
    return {"id": patient.id}


@router.get("")
async def get_contacts(limit: int = 100, offset: int = 0, session: Session = Depends(get_session)):
    patients = list_patients(session, limit=limit, offset=offset)
    return patients


