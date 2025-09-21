from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

import logging
from .db import session_scope
from .repositories import mark_call_failed, mark_call_launched
from .settings import settings
from .vapi import create_outbound_call


class CallLauncher:
    def __init__(self) -> None:
        self._semaphore = asyncio.Semaphore(settings.concurrency_limit)
        self._logger = logging.getLogger("attendsure.launcher")

    async def launch_call(
        self,
        call_id: int,
        phone: str,
        assistant_id: str,
        variable_values: Dict[str, Any],
        schedule_at: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        # Local scheduling fallback: wait until schedule_at if configured not to use Vapi scheduler
        if schedule_at and not settings.use_vapi_scheduler:
            try:
                target = datetime.fromisoformat(schedule_at.replace("Z", "+00:00"))
                now = datetime.now(timezone.utc)
                # Ensure target is timezone-aware
                if target.tzinfo is None:
                    target = target.replace(tzinfo=timezone.utc)
                delay = (target - now).total_seconds()
                if delay > 0:
                    self._logger.info("Delaying launch until %s (%.1fs)", target.isoformat(), delay)
                    await asyncio.sleep(delay)
            except Exception:
                # If parsing fails, fall through to immediate launch
                self._logger.warning("Failed to parse scheduleAt=%s; launching immediately", schedule_at)

        async with self._semaphore:
            try:
                self._logger.info("Launching call -> callId=%s", call_id)
                resp = await create_outbound_call(
                    phone=phone,
                    assistant_id=assistant_id,
                    variable_values=variable_values,
                    schedule_at=(schedule_at if settings.use_vapi_scheduler else None),
                    metadata=metadata,
                    phone_number_id=settings.vapi_phone_number_id,
                )
                vapi_call_id = resp.get("id") or resp.get("call", {}).get("id")
                with session_scope() as session:
                    mark_call_launched(session, call_id, vapi_call_id=vapi_call_id, status="in_progress")
                self._logger.info("Launched call <- callId=%s vapiCallId=%s", call_id, vapi_call_id)
            except Exception as e:  # noqa: BLE001 - demo simplicity
                with session_scope() as session:
                    mark_call_failed(session, call_id, reason=str(e))
                self._logger.error("Launch failed callId=%s error=%s", call_id, e)


launcher = CallLauncher()


