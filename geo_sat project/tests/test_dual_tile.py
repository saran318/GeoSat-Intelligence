import os
import sys
import numpy as np
import pytest
import rasterio
from rasterio.transform import from_bounds
from PIL import Image

# Ensure project root is in system path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.append(project_root)

from app.services.dynamic_world_service import DynamicWorldService
from app.services.esri_service import EsriService


def _write_synthetic_geotiff(path: str, bounds, crs: str, fill_value: int, width: int = 20, height: int = 20):
    transform = from_bounds(*bounds, width, height)
    data = np.full((1, height, width), fill_value, dtype=np.uint8)
    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        height=height,
        width=width,
        count=1,
        dtype="uint8",
        crs=crs,
        transform=transform,
        nodata=0,
    ) as dst:
        dst.write(data)


def test_single_tile_district_returns_r2_url(monkeypatch):
    """Single-tile district (Chennai -> ['44P']) returns direct R2 URL when R2 is configured."""
    monkeypatch.setattr(
        EsriService,
        "get_raster_url",
        classmethod(lambda cls, tile_id, year: f"https://r2.example.com/rasters/esri/TN-2/{tile_id}_{year}.tif"),
    )
    url = DynamicWorldService.resolve_layer_url("Chennai", "dynamic_world_2023")
    assert url == "https://r2.example.com/rasters/esri/TN-2/44P_2023.tif"


def test_dual_tile_district_returns_none_url_and_merges_rasters(tmp_path, monkeypatch):
    """Dual-tile district (Dharmapuri -> ['43P', '44P']) returns None for URL and merges both tiles."""
    # Even when R2 is configured, dual-tile districts must return None so get_raster falls through to merge
    monkeypatch.setattr(
        EsriService,
        "get_raster_url",
        classmethod(lambda cls, tile_id, year: f"https://r2.example.com/rasters/esri/{tile_id}_{year}.tif"),
    )
    assert DynamicWorldService.resolve_layer_url("Dharmapuri", "dynamic_world_2023") is None

    # Create synthetic 43P (west of 78.0) and 44P (east of 78.0) GeoTIFFs in their respective UTM CRSs
    # Dharmapuri bbox in esri_regions.json: [77.67573, 11.79239, 78.73387, 12.50736]
    tif_43p = str(tmp_path / "43P_2023.tif")
    tif_44p = str(tmp_path / "44P_2023.tif")
    # Use EPSG:4326 bounds directly or UTM CRS; let's test cross-CRS (EPSG:32643 & EPSG:32644)
    from rasterio.warp import transform_bounds
    b43 = transform_bounds("EPSG:4326", "EPSG:32643", 77.5, 11.7, 78.05, 12.6)
    b44 = transform_bounds("EPSG:4326", "EPSG:32644", 77.95, 11.7, 78.8, 12.6)
    _write_synthetic_geotiff(tif_43p, b43, "EPSG:32643", fill_value=2)  # Trees
    _write_synthetic_geotiff(tif_44p, b44, "EPSG:32644", fill_value=7)  # Built Area

    def fake_find_file(cls, tile_id, year):
        if tile_id == "43P" and year == 2023:
            return tif_43p
        if tile_id == "44P" and year == 2023:
            return tif_44p
        return None

    monkeypatch.setattr(EsriService, "find_file", classmethod(fake_find_file))

    merged_path = DynamicWorldService.resolve_layer_path("Dharmapuri", "dynamic_world_2023")
    assert merged_path is not None
    assert os.path.exists(merged_path)

    with rasterio.open(merged_path) as src:
        arr = src.read(1)
        # Merged extent must contain values from both 43P (2) and 44P (7)
        unique_vals = set(np.unique(arr).tolist())
        assert 2 in unique_vals
        assert 7 in unique_vals
        # Extent should span across the 78.0 meridian
        wgs84_bounds = transform_bounds(src.crs, "EPSG:4326", *src.bounds)
        assert wgs84_bounds[0] < 78.0 < wgs84_bounds[2]


def test_dual_tile_preview_covers_both_tiles(tmp_path, monkeypatch):
    """Dual-tile preview renders non-empty pixels from both 43P (west) and 44P (east) tiles."""
    tif_43p = str(tmp_path / "43P_2023.tif")
    tif_44p = str(tmp_path / "44P_2023.tif")
    from rasterio.warp import transform_bounds
    b43 = transform_bounds("EPSG:4326", "EPSG:32643", 77.5, 11.7, 78.05, 12.6)
    b44 = transform_bounds("EPSG:4326", "EPSG:32644", 77.95, 11.7, 78.8, 12.6)
    _write_synthetic_geotiff(tif_43p, b43, "EPSG:32643", fill_value=2)
    _write_synthetic_geotiff(tif_44p, b44, "EPSG:32644", fill_value=7)

    monkeypatch.setattr(
        EsriService,
        "find_file",
        classmethod(lambda cls, tile_id, year: tif_43p if tile_id == "43P" else (tif_44p if tile_id == "44P" else None)),
    )
    monkeypatch.setattr(EsriService, "get_preview_dir", classmethod(lambda cls: str(tmp_path)))
    monkeypatch.setattr(EsriService, "load_boundary_geometry", classmethod(lambda cls, conf: None))

    preview_path = DynamicWorldService.resolve_preview_path("Dharmapuri", "dynamic_world_2023")
    assert preview_path is not None
    assert os.path.exists(preview_path)

    with Image.open(preview_path) as img:
        rgba = np.array(img)
        w = rgba.shape[1]
        west_alpha = rgba[:, : w // 3, 3]
        east_alpha = rgba[:, (2 * w) // 3 :, 3]
        assert np.any(west_alpha > 0), "West (43P) side of dual-tile preview is empty"
        assert np.any(east_alpha > 0), "East (44P) side of dual-tile preview is empty"
