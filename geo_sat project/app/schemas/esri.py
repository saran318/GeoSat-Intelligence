from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class EsriClassItem(BaseModel):
    class_id: int
    name: str
    color: str

class EsriTileInfo(BaseModel):
    tile_id: str
    utm_zone: str
    crs: str
    available_years: List[int]
    wgs84_bounds: List[float]
    file_count: int

class EsriLocationMetadata(BaseModel):
    id: str
    name: str
    level: str  # "region" | "state" | "district" | "city"
    parent: Optional[str] = None
    tile: str
    crs: str
    bbox: List[float]
    center: List[float]
    available_years: List[int]
    description: Optional[str] = None

class EsriHierarchyResponse(BaseModel):
    dataset: str
    resolution_meters: float
    years: List[int]
    classes: List[EsriClassItem]
    regions: List[EsriLocationMetadata]
    states: List[EsriLocationMetadata]
    districts: List[EsriLocationMetadata]
    cities: List[EsriLocationMetadata]

class EsriClassAreaStat(BaseModel):
    class_id: int
    class_name: str
    color: str
    pixel_count: int
    area_km2: float
    percentage: float

class EsriYearStatsResponse(BaseModel):
    location_id: str
    level: str
    year: int
    tile_used: str
    total_area_km2: float
    classes: List[EsriClassAreaStat]

class EsriChangeClassDiff(BaseModel):
    class_id: int
    class_name: str
    from_area_km2: float
    to_area_km2: float
    net_change_km2: float
    pct_change: float

class EsriChangeStatsResponse(BaseModel):
    location_id: str
    level: str
    from_year: int
    to_year: int
    total_area_km2: float
    changed_pixels: int
    change_percentage: float
    class_diffs: List[EsriChangeClassDiff]

class EsriVisualResourceResponse(BaseModel):
    title: str
    resource_type: str  # "animated_gif" | "timelapse_frames"
    file_url: str
    file_size_mb: float
    years_covered: List[int]
    spatial_coverage: str
    description: str
