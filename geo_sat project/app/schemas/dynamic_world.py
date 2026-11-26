from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class DynamicWorldClassDef(BaseModel):
    id: int
    name: str
    color: str

class DynamicWorldCity(BaseModel):
    name: str
    available_years: List[int]
    change_periods: List[str]

class DynamicWorldCitiesResponse(BaseModel):
    cities: List[DynamicWorldCity]
    classes: List[DynamicWorldClassDef] = []

class DynamicWorldYearsResponse(BaseModel):
    city: str
    years: List[int]

class DynamicWorldLayer(BaseModel):
    id: str
    type: str
    year: Optional[int] = None
    from_year: Optional[int] = None
    to_year: Optional[int] = None

class DynamicWorldLayersResponse(BaseModel):
    city: str
    layers: List[DynamicWorldLayer]

class DynamicWorldMetadata(BaseModel):
    city: str
    year: int
    source: str
    method: str
    crs: str
    width: int
    height: int
    resolution: List[float]
    bounds: List[float]
    dtype: str
    nodata: int

class DynamicWorldClassData(BaseModel):
    id: int
    pixels: int
    area_km2: float = 0.0
    percentage: float

class DynamicWorldClassStats(BaseModel):
    city: str
    year: int
    valid_pixels: int
    valid_area_km2: float = 0.0
    sampling_meters: float = 10.0
    classes: Dict[str, DynamicWorldClassData]

class DynamicWorldChangeClassStats(BaseModel):
    count_from: int
    count_to: int
    from_area_km2: float = 0.0
    to_area_km2: float = 0.0
    gain: int
    loss: int
    net_change: int
    gain_km2: float = 0.0
    loss_km2: float = 0.0
    net_change_km2: float = 0.0

class DynamicWorldChangeTopTransition(BaseModel):
    from_class: str
    to_class: str
    count: int
    area_km2: float = 0.0

class DynamicWorldChangeStats(BaseModel):
    city: str
    from_year: int
    to_year: int
    valid_pixels: int
    valid_area_km2: float = 0.0
    unchanged_pixels: int
    unchanged_area_km2: float = 0.0
    changed_pixels: int
    changed_area_km2: float = 0.0
    unchanged_percentage: float
    changed_percentage: float
    sampling_meters: float = 10.0
    classes: Dict[str, DynamicWorldChangeClassStats]
    top_transitions: List[DynamicWorldChangeTopTransition]

class DynamicWorldTransitionMatrix(BaseModel):
    from_year: int
    to_year: int
    classes: List[str]
    matrix: List[List[int]]
