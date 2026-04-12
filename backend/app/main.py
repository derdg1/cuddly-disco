"""FastAPI application entry point."""
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import files, jobs, preflight, process, workflows
from app.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize DB and create storage dirs
    await init_db()
    for d in ["./uploads", "./outputs"]:
        Path(d).mkdir(parents=True, exist_ok=True)
    yield
    # Shutdown: nothing special needed


def create_app() -> FastAPI:
    app = FastAPI(
        title="PrePress Studio API",
        description="Professional PDF prepress processing – similar to Esko / PackZ",
        version="1.0.0",
        lifespan=lifespan,
    )

    # CORS – allow Vite dev server
    origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register API routes
    prefix = "/api"
    app.include_router(files.router, prefix=prefix)
    app.include_router(preflight.router, prefix=prefix)
    app.include_router(process.router, prefix=prefix)
    app.include_router(workflows.router, prefix=prefix)
    app.include_router(jobs.router, prefix=prefix)

    @app.get("/api/health")
    async def health():
        return {"status": "ok", "version": "1.0.0"}

    return app


app = create_app()
