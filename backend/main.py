from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.routes import router as api_router, system_router
from backend.app.core.config import get_settings
from backend.app.db import ensure_database_ready

import os

from backend.app.api.middleware.request_counter import RequestCounterMiddleware

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
PREVIEW_ORIGIN_REGEX = os.getenv("PREVIEW_ORIGIN_REGEX")

@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    await ensure_database_ready(settings.database_url)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(title="ClipNotes API", version="0.1.0", lifespan=lifespan)

    frontend_origin = str(settings.frontend_url).rstrip("/")
    origins: set[str] = {frontend_origin, f"{frontend_origin}/"}
    
    application.add_middleware(
        RequestCounterMiddleware,
        database_url=settings.database_url,
    )

    application.include_router(system_router)
    application.include_router(api_router)
    
    application.add_middleware(
    CORSMiddleware,
        allow_origins=[
            "https://clipnotes.vercel.app",
            "https://clipnotes-sepia.vercel.app"
        ],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
        max_age=86400,
    )
    return application


app = create_app()
