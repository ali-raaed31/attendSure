from __future__ import annotations

import os
import logging
from typing import Any, Dict, Optional

import httpx


VAPI_BASE = "https://api.vapi.ai"
VAPI_KEY = os.getenv("VAPI_API_KEY", "")
logger = logging.getLogger("attendsure.vapi")


async def create_outbound_call(
    phone: str,
    assistant_id: str,
    variable_values: Dict[str, Any],
    schedule_at: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    phone_number_id: Optional[str] = None,
) -> Dict[str, Any]:
    body: Dict[str, Any] = {
        "assistantId": assistant_id,
        "type": "outboundPhoneCall",
        "customer": {"number": phone},
        "assistantOverrides": {"variableValues": variable_values},
        "metadata": metadata or {},
    }
    if schedule_at:
        body["scheduleAt"] = schedule_at
    if phone_number_id:
        body["phoneNumberId"] = phone_number_id

    headers = {"Authorization": f"Bearer {VAPI_KEY}"}
    async with httpx.AsyncClient(timeout=30) as client:
        logger.info("Vapi create call -> %s", {
            "assistantId": assistant_id,
            "hasScheduleAt": bool(schedule_at),
            "hasMetadata": bool(metadata),
            "hasVariables": bool(variable_values),
            "phoneNumberId": phone_number_id,
        })
        resp = await client.post(f"{VAPI_BASE}/call", json=body, headers=headers)
        if resp.status_code >= 400:
            # Log full text for debugging
            logger.error("Vapi error %s: %s", resp.status_code, resp.text)
        resp.raise_for_status()
        data = resp.json()
        logger.info("Vapi create call <- %s", {"id": data.get("id") or data})
        return data


