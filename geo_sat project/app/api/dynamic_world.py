import os
import time
import requests
import backend_config as bcfg
from fastapi import APIRouter, HTTPException, Path, status
from fastapi.responses import FileResponse, RedirectResponse
from starlette.concurrency import run_in_threadpool
from typing import Annotated, Dict, List, Tuple

from app.schemas.dynamic_world import (
    DynamicWorldCitiesResponse,
    DynamicWorldCity,
    DynamicWorldClassDef,
    DynamicWorldYearsResponse,
    DynamicWorldLayersResponse,
    DynamicWorldLayer,
    DynamicWorldMetadata,
    DynamicWorldClassStats,
    DynamicWorldChangeStats,
    DynamicWorldTransitionMatrix
)
from app.services.dynamic_world_service import DynamicWorldService
from app.services.esri_service import EsriService

dynamic_world_router = APIRouter(
    prefix="/api/dynamic-world",
    tags=["Dynamic World Land Cover"]
)

CityPath = Annotated[str, Path(min_length=1, max_length=100, pattern=r"^[A-Za-z0-9 _-]+$")]
YearPath = Annotated[int, Path(ge=2000, le=2100)]
LayerPath = Annotated[str, Path(min_length=1, max_length=100, pattern=r"^[A-Za-z0-9_.-]+$")]

@dynamic_world_router.get("/cities", response_model=DynamicWorldCitiesResponse)
async def get_cities():
    cities = DynamicWorldService.get_available_cities()
    city_data = []
    for city in cities:
        years = DynamicWorldService.get_available_years(city)
        periods = DynamicWorldService.get_change_periods(city)
        city_data.append(DynamicWorldCity(name=city, available_years=years, change_periods=periods))
    classes_data = [
        DynamicWorldClassDef(id=cid, name=cname, color=bcfg.ESRI_COLORS.get(cid, "#CCCCCC"))
        for cid, cname in sorted(bcfg.ESRI_CLASSES.items())
    ]
    return DynamicWorldCitiesResponse(cities=city_data, classes=classes_data)

@dynamic_world_router.get("/overview/summary")
async def get_overview_summary():
    """Returns real statewide 2019-2025 Tamil Nadu snapshot, top movers, and config metadata."""
    return EsriService.get_overview_summary()

@dynamic_world_router.get("/{city}/years", response_model=DynamicWorldYearsResponse)
async def get_years(city: CityPath):
    years = DynamicWorldService.get_available_years(city)
    if not years:
        raise HTTPException(status_code=404, detail=f"Dynamic World data not found for city: {city}")
    return DynamicWorldYearsResponse(city=city, years=years)

@dynamic_world_router.get("/{city}/layers", response_model=DynamicWorldLayersResponse)
async def get_layers(city: CityPath):
    years = DynamicWorldService.get_available_years(city)
    periods = DynamicWorldService.get_change_periods(city)
    
    if not years and not periods:
        raise HTTPException(status_code=404, detail=f"Dynamic World data not found for city: {city}")
        
    layers = []
    for year in years:
        layers.append(DynamicWorldLayer(id=f"dynamic_world_{year}", type="landcover", year=year))
        
    for period in periods:
        try:
            y1, y2 = map(int, period.split("_"))
            layers.append(DynamicWorldLayer(id=f"change_{period}", type="change", from_year=y1, to_year=y2))
            layers.append(DynamicWorldLayer(id=f"transition_{period}", type="transition", from_year=y1, to_year=y2))
        except:
            continue
            
    return DynamicWorldLayersResponse(city=city, layers=layers)

@dynamic_world_router.get("/{city}/metadata/{year}", response_model=DynamicWorldMetadata)
async def get_metadata(city: CityPath, year: YearPath):
    metadata = DynamicWorldService.get_metadata(city, year)
    if not metadata:
        raise HTTPException(status_code=404, detail=f"Metadata not found for {city} {year}")
    return DynamicWorldMetadata(**metadata)

@dynamic_world_router.get("/{city}/stats/{year}", response_model=DynamicWorldClassStats)
async def get_stats(city: CityPath, year: YearPath):
    stats = DynamicWorldService.get_stats(city, year)
    if not stats:
        raise HTTPException(status_code=404, detail=f"Statistics not found for {city} {year}")
    return DynamicWorldClassStats(**stats)

@dynamic_world_router.get("/{city}/change/{from_year}/{to_year}/stats", response_model=DynamicWorldChangeStats)
async def get_change_stats(city: CityPath, from_year: YearPath, to_year: YearPath):
    stats = DynamicWorldService.get_change_stats(city, from_year, to_year)
    if not stats:
        raise HTTPException(status_code=404, detail=f"Change statistics not found for {city} {from_year}-{to_year}")
    return DynamicWorldChangeStats(**stats)

@dynamic_world_router.get("/{city}/change/{from_year}/{to_year}/transitions", response_model=DynamicWorldTransitionMatrix)
async def get_transitions(city: CityPath, from_year: YearPath, to_year: YearPath):
    matrix = DynamicWorldService.get_transition_matrix(city, from_year, to_year)
    if not matrix:
        raise HTTPException(status_code=404, detail=f"Transition matrix not found for {city} {from_year}-{to_year}")
    return DynamicWorldTransitionMatrix(**matrix)

@dynamic_world_router.get("/{city}/raster/{layer}")
async def get_raster(city: CityPath, layer: LayerPath):
    r2_url = DynamicWorldService.resolve_layer_url(city, layer)
    if r2_url:
        return RedirectResponse(url=r2_url, status_code=307)
    path = await run_in_threadpool(DynamicWorldService.resolve_layer_path, city, layer)
    if path:
        return FileResponse(path, media_type="image/tiff")
    raise HTTPException(status_code=404, detail=f"Layer {layer} not found for {city}")

_R2_PREVIEW_EXISTS_CACHE: Dict[str, Tuple[bool, float]] = {}
_R2_PREVIEW_CACHE_TTL_SECONDS = 300.0


def _r2_preview_exists(r2_url: str, city: str, layer: str) -> bool:
    """Verify whether the preview PNG exists in R2, with a short-TTL in-memory cache."""
    cache_key = r2_url.split("?", 1)[0]
    now = time.monotonic()
    cached = _R2_PREVIEW_EXISTS_CACHE.get(cache_key)
    if cached is not None:
        exists, expires_at = cached
        if now < expires_at:
            return exists

    exists = False
    if EsriService._get_r2_public_url() or EsriService._get_s3_client() is None:
        try:
            resp = requests.head(r2_url, timeout=3, allow_redirects=True)
            exists = resp.status_code == 200
        except requests.RequestException:
            exists = False
    else:
        s3_client = EsriService._get_s3_client()
        bucket = (os.getenv("B2_BUCKET_NAME") or bcfg.B2_BUCKET_NAME or "geosat-assets").strip()
        key = f"previews/esri/{city.lower()}_{layer}.png"
        if s3_client is not None and bucket:
            try:
                s3_client.head_object(Bucket=bucket, Key=key)
                exists = True
            except Exception:
                exists = False

    _R2_PREVIEW_EXISTS_CACHE[cache_key] = (exists, now + _R2_PREVIEW_CACHE_TTL_SECONDS)
    return exists


@dynamic_world_router.get("/{city}/preview/{layer}")
async def get_preview(city: CityPath, layer: LayerPath):
    r2_url = DynamicWorldService.resolve_preview_url(city, layer)
    if r2_url and _r2_preview_exists(r2_url, city, layer):
        return RedirectResponse(url=r2_url, status_code=307)
    path = DynamicWorldService.resolve_preview_path(city, layer)
    if not path:
        raise HTTPException(status_code=404, detail=f"Preview {layer} not found for {city}")
    return FileResponse(
        path,
        media_type="image/png",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

@dynamic_world_router.get("/{city}/boundary")
@dynamic_world_router.get("/boundary/{city}")
async def get_boundary(city: CityPath):
    """Returns the GeoJSON polygon boundary for the requested city or district."""
    conf = EsriService.get_city_config(city)
    boundary_path = None
    if conf and "boundary" in conf:
        boundary_path = conf["boundary"]
    else:
        boundary_path = f"boundaries/{city.lower().replace(' ', '_')}.geojson"

    fname = os.path.basename(boundary_path)
    candidates = [
        boundary_path,
        os.path.join(bcfg.PROJECT_ROOT, boundary_path),
        os.path.join(os.path.dirname(bcfg.PROJECT_ROOT), boundary_path),
        os.path.join(bcfg.PROJECT_ROOT, "boundaries", fname),
        os.path.join(os.path.dirname(bcfg.PROJECT_ROOT), "boundaries", fname),
        os.path.join("boundaries", fname)
    ]
    for p in candidates:
        if p and os.path.exists(p):
            return FileResponse(p, media_type="application/geo+json")

    raise HTTPException(status_code=404, detail=f"Boundary not found for '{city}'")
