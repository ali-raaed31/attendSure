from __future__ import annotations

import json
from typing import Any, Dict, Optional

import logging
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlmodel import Session

from .db import get_session
from .repositories import find_call_by_vapi_id, insert_result_for_call, update_call_status_by_vapi_id
from .settings import settings


router = APIRouter(tags=["webhooks"])
logger = logging.getLogger("attendsure.webhooks")


@router.post("/webhooks/vapi/end-of-call")
async def vapi_end_of_call(
    request: Request,
    session: Session = Depends(get_session),
    x_vapi_signature: Optional[str] = Header(default=None, alias="X-Vapi-Signature"),
):
    if settings.webhook_secret:
        if not x_vapi_signature or x_vapi_signature != settings.webhook_secret:
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    payload: Dict[str, Any] = await request.json()
    call_payload: Dict[str, Any] = payload.get("call") or payload
    logger.info("Webhook end-of-call <- status=%s id=%s", call_payload.get("status"), call_payload.get("id"))

    vapi_call_id = call_payload.get("id")
    status = call_payload.get("status")
    analysis = call_payload.get("analysis") or {}
    summary = analysis.get("summary")
    structured = analysis.get("structuredData")
    # Also capture new structured outputs format, if present
    artifact = call_payload.get("artifact") or {}
    structured_outputs = artifact.get("structuredOutputs")
    # Combine for storage to aid UI parsing
    combined_structured: Dict[str, Any] = {}
    if structured is not None:
        combined_structured["analysisStructuredData"] = structured
    if structured_outputs is not None:
        combined_structured["structuredOutputs"] = structured_outputs
    started_at = call_payload.get("startedAt")
    ended_at = call_payload.get("endedAt")

    if not vapi_call_id:
        raise HTTPException(status_code=400, detail="Missing call id")

    call = find_call_by_vapi_id(session, vapi_call_id)
    if not call:
        # Not yet recorded; attempt update by vapi id will no-op, but we still store payload unattached? For demo, 200 OK.
        update_call_status_by_vapi_id(session, vapi_call_id, status=status or "completed", started_at=started_at, ended_at=ended_at)
        return {"ok": True}

    update_call_status_by_vapi_id(
        session,
        vapi_call_id,
        status=status or "completed",
        started_at=started_at,
        ended_at=ended_at,
        fail_reason=None,
    )

    insert_result_for_call(
        session,
        call.id,
        summary=summary,
        structured_json_obj=(combined_structured if combined_structured else structured),
        raw_payload=payload,
    )
    logger.info("Webhook processed for vapiCallId=%s callId=%s", vapi_call_id, call.id)
    return {"ok": True}


