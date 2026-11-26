"""
GeoSat Intelligence — FastAPI Backend (API-Only Production Entrypoint).
Serves Dynamic World and Esri Land Cover REST endpoints.
"""

import logging
import os
import sys
from contextlib import asynccontextmanager

# Configure bounded GDAL / VSI settings before any rasterio/GDAL imports
for _gdal_k, _gdal_v in {
    "GDAL_CACHEMAX": "64",
    "GDAL_DISABLE_READDIR_ON_OPEN": "EMPTY_DIR",
    "CPL_VSIL_CURL_ALLOWED_EXTENSIONS": ".tif,.tiff",
    "VSI_CACHE": "TRUE",
    "VSI_CACHE_SIZE": "16777216",
    "CPL_VSIL_CURL_USE_HEAD": "NO",
}.items():
    os.environ.setdefault(_gdal_k, _gdal_v)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Ensure project root is in system path for clean imports
_APP_DIR = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(_APP_DIR)
if project_root not in sys.path:
    sys.path.append(project_root)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager that handles server startup and shutdown tasks.
    """
    logger.info("Initializing GeoSat Intelligence API...")
    yield
    logger.info("API Lifespan closing. Cleaning up resources...")


# Initialize API-only FastAPI application
app = FastAPI(
    title="GeoSat Intelligence API",
    description="API-only backend serving Dynamic World and Esri Land Cover analytics.",
    version="3.0.0",
    lifespan=lifespan,
)

# Configure CORS Middleware from ALLOWED_ORIGINS env var (comma-separated), defaulting to * for dev
_raw_origins = os.getenv("ALLOWED_ORIGINS", "*").strip()
_allowed_origins = ["*"] if _raw_origins == "*" else [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=_allowed_origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static assets (e.g. Esri timelapse GIF) and local data dir if present
_static_dir = os.path.join(_APP_DIR, "static")
if os.path.isdir(_static_dir):
    app.mount("/static", StaticFiles(directory=_static_dir), name="static")

_data_dir = os.path.join(project_root, "data")
if os.path.isdir(_data_dir):
    app.mount("/data", StaticFiles(directory=_data_dir), name="data")


@app.get("/", tags=["System"])
async def api_root():
    """API-only root metadata endpoint."""
    return {
        "service": "GeoSat Intelligence API",
        "version": "3.0.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", tags=["System"])
@app.get("/api/health", tags=["System"])
async def health_check():
    """Health check endpoint to verify backend status."""
    return {
        "status": "ok",
        "inference_enabled": False,
        "version": "3.0.0",
    }


# ── INCLUDE DYNAMIC WORLD ROUTER ──
from app.api.dynamic_world import dynamic_world_router
app.include_router(dynamic_world_router)

# ── INCLUDE ESRI LAND COVER ROUTER ──
from app.api.esri import esri_router
app.include_router(esri_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("ENV", "production") == "development",
    )
