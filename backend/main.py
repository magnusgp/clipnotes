from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.routes import router as api_router
from backend.app.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(title="ClipNotes API", version="0.1.0")

    frontend_origin = str(settings.frontend_url).rstrip("/")
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[frontend_origin, f"{frontend_origin}/"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(api_router)
    return application


app = create_app()
