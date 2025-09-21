from __future__ import annotations

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import init_db
from .routers_calls import router as calls_router
from .routers_contacts import router as contacts_router
from .routers_webhooks import router as webhooks_router
from .settings import settings


def create_app() -> FastAPI:
    init_db()
    app = FastAPI(title="AttendSure API")
    logging.basicConfig(level=logging.INFO)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health():
        return {"ok": True}

    app.include_router(contacts_router)
    app.include_router(calls_router)
    app.include_router(webhooks_router)
    return app


app = create_app()


