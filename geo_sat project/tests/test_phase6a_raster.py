import os
import sys
import time
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import numpy as np
import pytest
import rasterio
from fastapi.testclient import TestClient
from rasterio.transform import from_bounds
from rasterio.warp import transform_bounds

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app  # noqa: E402
from app.services import dynamic_world_service as dws_mod  # noqa: E402
from app.services.dynamic_world_service import DynamicWorldService  # noqa: E402
from app.services.esri_service import EsriService  # noqa: E402

client = TestClient(app)


def _write_synthetic_tile(
    path: Path,
    crs: str,
    bounds: tuple,
    width: int,
    height: int,
    fill_value: int,
) -> None:
    transform = from_bounds(*bounds, width=width, height=height)
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
        compress="lzw",
    ) as dst:
        dst.write(data)


def test_dual_tile_bbox_clipping_and_cache_reuse(tmp_path, monkeypatch):
    """Oversized 43P + 44P tiles must be clipped to Dharmapuri's bbox and cached by canonical key."""
    # Dharmapuri bbox: [77.67573, 11.79239, 78.73387, 12.50736]
    # Create oversized tiles spanning much wider than Dharmapuri
    tile_43 = tmp_path / "43P_2023.tif"
    tile_44 = tmp_path / "44P_2023.tif"
    _write_synthetic_tile(tile_43, "EPSG:32643", (680000, 1250000, 860000, 1450000), 256, 256, 2)
    _write_synthetic_tile(tile_44, "EPSG:32644", (140000, 1250000, 320000, 1450000), 256, 256, 7)

    monkeypatch.setattr(dws_mod, "_RASTER_CACHE_DIR", str(tmp_path / "cache"))
    monkeypatch.setattr(
        EsriService,
        "find_file",
        classmethod(lambda cls, tile, year: str(tile_43 if tile == "43P" else tile_44)),
    )
    monkeypatch.setattr(EsriService, "get_raster_url", classmethod(lambda cls, tile, year: None))

    out_path = DynamicWorldService.resolve_layer_path("Dharmapuri", "dynamic_world_2023")
    assert out_path is not None and os.path.exists(out_path)

    with rasterio.open(out_path) as src:
        wgs84 = transform_bounds(src.crs, "EPSG:4326", *src.bounds)
        # Clipped output should closely match Dharmapuri bbox [77.67573, 11.79239, 78.73387, 12.50736]
        # rather than the ~3.3 deg wide oversized tiles
        assert wgs84[0] >= 77.5 and wgs84[2] <= 78.9
        assert wgs84[1] >= 11.6 and wgs84[3] <= 12.7
        arr = src.read(1)
        assert 2 in arr and 7 in arr

    # Second call hits cache
    out_path_2 = DynamicWorldService.resolve_layer_path("Dharmapuri", "dynamic_world_2023")
    assert out_path_2 == out_path


def test_presigned_url_cache_key_stability(tmp_path, monkeypatch):
    """Varying X-Amz-Signature query params on /vsicurl/ URLs must produce the same cache key."""
    url1 = "/vsicurl/https://r2.example.com/rasters/esri/TN-1/43P_20230101-20240101.tif?X-Amz-Signature=sig1"
    url2 = "/vsicurl/https://r2.example.com/rasters/esri/TN-1/43P_20230101-20240101.tif?X-Amz-Signature=sig2"
    assert DynamicWorldService._canonical_source_id(url1) == DynamicWorldService._canonical_source_id(url2)


def test_lru_raster_cache_pruning(tmp_path):
    """_prune_raster_cache must evict oldest files until under max_bytes and max_files."""
    cache_dir = tmp_path / "lru"
    cache_dir.mkdir()
    files = []
    for i in range(5):
        p = cache_dir / f"geosat_{i}.tif"
        p.write_bytes(b"x" * 100)
        os.utime(p, (1000 + i * 10, 1000 + i * 10))
        files.append(p)

    DynamicWorldService._prune_raster_cache(
        cache_dir=str(cache_dir),
        max_bytes=250,
        max_files=2,
        preserve_path=str(files[-1]),
    )
    remaining = sorted(p.name for p in cache_dir.iterdir())
    assert len(remaining) == 2
    assert files[-1].name in remaining
    assert files[-2].name in remaining


def test_merge_failure_leaves_no_partial_temp_files(tmp_path, monkeypatch):
    """Corrupt or failing raster merge must return None and leave zero .tmp.tif or .tif artifacts."""
    bad_43 = tmp_path / "bad43.tif"
    bad_44 = tmp_path / "bad44.tif"
    bad_43.write_bytes(b"not a geotiff")
    bad_44.write_bytes(b"not a geotiff")

    cache_dir = tmp_path / "cache"
    monkeypatch.setattr(dws_mod, "_RASTER_CACHE_DIR", str(cache_dir))
    monkeypatch.setattr(
        EsriService,
        "find_file",
        classmethod(lambda cls, tile, year: str(bad_43 if tile == "43P" else bad_44)),
    )

    result = DynamicWorldService.resolve_layer_path("Dharmapuri", "dynamic_world_2023")
    assert result is None
    if cache_dir.exists():
        assert list(cache_dir.iterdir()) == []


def test_missing_one_tile_returns_none(monkeypatch):
    """If one tile in a dual-tile district is unavailable locally and in R2, return None cleanly."""
    monkeypatch.setattr(EsriService, "find_file", classmethod(lambda cls, tile, year: None))
    monkeypatch.setattr(
        EsriService,
        "get_raster_url",
        classmethod(lambda cls, tile, year: "https://example.com/43P.tif" if tile == "43P" else None),
    )
    assert DynamicWorldService.resolve_layer_path("Dharmapuri", "dynamic_world_2023") is None


def test_vsicurl_remote_range_read_with_head_403(tmp_path, monkeypatch):
    """Verify GDAL /vsicurl/ reads a remote GeoTIFF when HEAD returns 403 (presigned URL behavior)."""
    tile_43 = tmp_path / "43P_remote.tif"
    tile_44 = tmp_path / "44P_remote.tif"
    _write_synthetic_tile(tile_43, "EPSG:32643", (755000, 1315000, 795000, 1370000), 64, 64, 2)
    _write_synthetic_tile(tile_44, "EPSG:32644", (170000, 1315000, 225000, 1370000), 64, 64, 7)

    file_map = {
        "/rasters/43P_2023.tif": tile_43.read_bytes(),
        "/rasters/44P_2023.tif": tile_44.read_bytes(),
    }

    class RangeHandler(BaseHTTPRequestHandler):
        def log_message(self, format, *args):
            pass

        def do_HEAD(self):
            self.send_response(403)
            self.end_headers()

        def do_GET(self):
            path_only = self.path.split("?", 1)[0]
            data = file_map.get(path_only)
            if data is None:
                self.send_response(404)
                self.end_headers()
                return
            range_hdr = self.headers.get("Range")
            if range_hdr and range_hdr.startswith("bytes="):
                start_s, end_s = range_hdr[6:].split("-", 1)
                start = int(start_s)
                end = int(end_s) if end_s else len(data) - 1
                chunk = data[start : end + 1]
                self.send_response(206)
                self.send_header("Content-Range", f"bytes {start}-{end}/{len(data)}")
                self.send_header("Content-Length", str(len(chunk)))
                self.end_headers()
                self.wfile.write(chunk)
            else:
                self.send_response(200)
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

    server = ThreadingHTTPServer(("127.0.0.1", 0), RangeHandler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        cache_dir = tmp_path / "remote_cache"
        monkeypatch.setattr(dws_mod, "_RASTER_CACHE_DIR", str(cache_dir))
        monkeypatch.setattr(EsriService, "find_file", classmethod(lambda cls, tile, year: None))
        monkeypatch.setattr(
            EsriService,
            "get_raster_url",
            classmethod(
                lambda cls, tile, year: f"http://127.0.0.1:{port}/rasters/{tile}_{year}.tif?X-Amz-Signature=test"
            ),
        )
        out_path = DynamicWorldService.resolve_layer_path("Dharmapuri", "dynamic_world_2023")
        assert out_path is not None and os.path.exists(out_path)
        with rasterio.open(out_path) as src:
            assert src.count == 1
            assert src.width > 0 and src.height > 0
    finally:
        server.shutdown()
        server.server_close()


def test_raster_api_redirect_and_fallback_compatibility(tmp_path, monkeypatch):
    """Verify GET /raster/{layer} 307 redirect (single-tile R2), 200 GeoTIFF (dual-tile), and 404."""
    # 1. Single-tile R2 redirect (307)
    monkeypatch.setattr(
        DynamicWorldService,
        "resolve_layer_url",
        staticmethod(lambda city, layer: "https://r2.example.com/44P.tif" if city == "Chennai" else None),
    )
    res_307 = client.get("/api/dynamic-world/Chennai/raster/dynamic_world_2023", follow_redirects=False)
    assert res_307.status_code == 307
    assert res_307.headers["location"] == "https://r2.example.com/44P.tif"

    # 2. Dual-tile FileResponse (200 image/tiff)
    merged = tmp_path / "merged.tif"
    _write_synthetic_tile(merged, "EPSG:4326", (77.6, 11.7, 78.7, 12.5), 16, 16, 2)
    monkeypatch.setattr(
        DynamicWorldService,
        "resolve_layer_path",
        staticmethod(lambda city, layer: str(merged) if city == "Dharmapuri" else None),
    )
    res_200 = client.get("/api/dynamic-world/Dharmapuri/raster/dynamic_world_2023", follow_redirects=False)
    assert res_200.status_code == 200
    assert res_200.headers["content-type"] == "image/tiff"
    assert res_200.content[:2] in (b"II", b"MM")

    # 3. Missing / invalid city (404)
    res_404 = client.get("/api/dynamic-world/InvalidCity123/raster/dynamic_world_2023", follow_redirects=False)
    assert res_404.status_code == 404
