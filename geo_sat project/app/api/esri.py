import os
from typing import Annotated, List, Optional
from fastapi import APIRouter, HTTPException, Path, Query, status
from fastapi.responses import FileResponse, RedirectResponse

import backend_config as bcfg
from app.schemas.esri import (
    EsriHierarchyResponse,
    EsriTileInfo,
    EsriLocationMetadata,
    EsriClassItem,
    EsriYearStatsResponse,
    EsriChangeStatsResponse,
    EsriVisualResourceResponse,
)
from app.services.esri_service import EsriService

esri_router = APIRouter(
    prefix="/api/esri",
    tags=["Esri Regional Land Cover (2019-2025)"]
)

LevelPath = Annotated[str, Path(min_length=1, max_length=32, pattern=r"^(region|state|district|city)$")]
LocationIdPath = Annotated[str, Path(min_length=1, max_length=100, pattern=r"^[A-Za-z0-9 _-]+$")]
YearPath = Annotated[int, Path(ge=2000, le=2100)]

@esri_router.get("/hierarchy", response_model=EsriHierarchyResponse)
async def get_hierarchy():
    """Returns the full hierarchical catalog (regions, states, districts, cities)."""
    raw = EsriService.get_hierarchy()
    if not raw:
        raise HTTPException(status_code=500, detail="Esri hierarchy configuration not loaded")

    classes = [
        EsriClassItem(
            class_id=int(k),
            name=v,
            color=bcfg.ESRI_COLORS.get(int(k), "#CCCCCC")
        )
        for k, v in raw.get("classes", {}).items()
    ]

    def parse_locations(group_key: str, level_name: str) -> List[EsriLocationMetadata]:
        items = []
        for k, v in raw.get(group_key, {}).items():
            tile_val = v.get("tile") or v.get("tiles", ["44P"])
            if isinstance(tile_val, list):
                tile_str = ", ".join(tile_val)
            else:
                tile_str = str(tile_val)

            items.append(EsriLocationMetadata(
                id=k,
                name=v.get("name", k),
                level=level_name,
                parent=v.get("state") or v.get("district"),
                tile=tile_str,
                crs=v.get("crs", "EPSG:32644"),
                bbox=v.get("bbox", []),
                center=v.get("center", []),
                available_years=raw.get("years", bcfg.ESRI_YEARS),
                description=v.get("description")
            ))
        return items

    return EsriHierarchyResponse(
        dataset=raw.get("dataset", "Esri 10m Annual Land Use Land Cover (2019-2025)"),
        resolution_meters=raw.get("resolution_meters", 10.0),
        years=raw.get("years", bcfg.ESRI_YEARS),
        classes=classes,
        regions=parse_locations("regions", "region"),
        states=parse_locations("states", "state"),
        districts=parse_locations("districts", "district"),
        cities=parse_locations("cities", "city")
    )

@esri_router.get("/tiles", response_model=List[EsriTileInfo])
async def get_tiles():
    """Returns metadata for the indexed Sentinel-2 UTM tiles (43P and 44P)."""
    tiles_dict = EsriService.get_available_tiles()
    return [EsriTileInfo(**info) for info in tiles_dict.values()]

@esri_router.get("/location/{level}/{location_id}", response_model=EsriLocationMetadata)
async def get_location(level: LevelPath, location_id: LocationIdPath):
    """Retrieves spatial metadata and bounding box for a region, state, district, or city."""
    entry = EsriService.get_location_entry(level, location_id)
    if not entry:
        raise HTTPException(
            status_code=404,
            detail=f"Location '{location_id}' at level '{level}' not found in Esri catalog"
        )
    tile_val = entry.get("tile") or entry.get("tiles", "44P")
    if isinstance(tile_val, list):
        tile_str = ", ".join(tile_val)
    else:
        tile_str = str(tile_val)

    return EsriLocationMetadata(
        id=entry.get("id", location_id),
        name=entry.get("name", location_id),
        level=level.lower(),
        parent=entry.get("state") or entry.get("district"),
        tile=tile_str,
        crs=entry.get("crs", "EPSG:32644"),
        bbox=entry.get("bbox", []),
        center=entry.get("center", []),
        available_years=bcfg.ESRI_YEARS,
        description=entry.get("description")
    )

@esri_router.get("/stats/{level}/{location_id}/{year}", response_model=EsriYearStatsResponse)
async def get_year_stats(
    level: LevelPath,
    location_id: LocationIdPath,
    year: YearPath,
):
    """Computes fast windowed area stats for a specific hierarchy level and year."""
    if year not in bcfg.ESRI_YEARS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid year {year}. Available years: {bcfg.ESRI_YEARS}"
        )

    entry = EsriService.get_location_entry(level, location_id)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Location '{location_id}' not found")

    bbox = entry.get("bbox")
    if not bbox or len(bbox) != 4:
        raise HTTPException(status_code=400, detail="Location bounding box is invalid")

    tile_target = entry.get("tiles") or entry.get("tile", ["44P"])
    if isinstance(tile_target, str):
        tile_target = [t.strip() for t in tile_target.split(",")]

    try:
        stats = EsriService.compute_stats_for_window(
            tile_target, year, bbox, location_id=location_id
        )
        tile_str = ", ".join(tile_target) if isinstance(tile_target, list) else str(tile_target)
        return EsriYearStatsResponse(
            location_id=location_id,
            level=level,
            year=year,
            tile_used=tile_str,
            total_area_km2=stats["total_area_km2"],
            classes=stats["classes"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute stats: {str(e)}")

@esri_router.get("/change/{level}/{location_id}", response_model=EsriChangeStatsResponse)
async def get_change_stats(
    level: LevelPath,
    location_id: LocationIdPath,
    from_year: int = Query(2019, ge=2019, le=2025),
    to_year: int = Query(2025, ge=2019, le=2025)
):
    """Computes land cover change and class transitions between two years."""
    if from_year >= to_year:
        raise HTTPException(status_code=400, detail="from_year must be earlier than to_year")

    entry = EsriService.get_location_entry(level, location_id)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Location '{location_id}' not found")

    bbox = entry.get("bbox")
    tile_target = entry.get("tiles") or entry.get("tile", ["44P"])
    if isinstance(tile_target, str):
        tile_target = [t.strip() for t in tile_target.split(",")]

    try:
        diff_stats = EsriService.compute_change_stats_for_window(
            tile_target, from_year, to_year, bbox, location_id=location_id
        )
        return EsriChangeStatsResponse(
            location_id=location_id,
            level=level,
            from_year=from_year,
            to_year=to_year,
            total_area_km2=diff_stats["total_area_km2"],
            changed_pixels=diff_stats["changed_pixels"],
            change_percentage=diff_stats["change_percentage"],
            class_diffs=diff_stats["class_diffs"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute change stats: {str(e)}")

@esri_router.get("/visual-resource", response_model=EsriVisualResourceResponse)
async def get_visual_resource_metadata():
    """Provides metadata about the animated visual timelapse resource."""
    info = EsriService.get_visual_resource_info()
    return EsriVisualResourceResponse(**info)

@esri_router.get("/visual-resource/gif")
async def get_visual_resource_gif():
    """Serves the generated 2019-2025 animated GIF visual resource (local or R2)."""
    gif_path = os.path.join(bcfg.PROJECT_ROOT, "app", "static", "images", "esri_tamil_nadu_2019_2025.gif")
    if os.path.exists(gif_path):
        return FileResponse(gif_path, media_type="image/gif", filename="esri_tamil_nadu_2019_2025.gif")
    r2_url = EsriService.resolve_r2_url("visuals/esri_tamil_nadu_2019_2025.gif")
    if r2_url:
        return RedirectResponse(url=r2_url, status_code=307)
    raise HTTPException(status_code=404, detail="Animated GIF visual resource not found.")
