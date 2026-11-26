import os
import json
import hashlib
import shutil
import subprocess
import tempfile
import threading
import time
from contextlib import ExitStack
import rasterio
from rasterio.enums import Resampling
from rasterio.merge import merge as rasterio_merge
from rasterio.vrt import WarpedVRT
from rasterio.warp import transform_bounds
import numpy as np
from typing import List, Dict, Any, Optional

import backend_config as bcfg
import utils
from app.services.esri_service import EsriService

logger = utils.get_logger(__name__)

# Esri Sentinel-2 Land Cover classes
ESRI_CLASSES = bcfg.ESRI_CLASSES

_RASTER_CACHE_DIR = os.path.join(tempfile.gettempdir(), "geosat_raster_cache")
_RASTER_CACHE_MAX_BYTES = 200 * 1024 * 1024  # 200 MB cap on ephemeral disk
_RASTER_CACHE_MAX_FILES = 8
_MERGE_SEMAPHORE = threading.Semaphore(1)
_CACHE_LOCKS_GUARD = threading.Lock()
_CACHE_LOCKS: Dict[str, threading.Lock] = {}

class DynamicWorldService:
    @staticmethod
    def _get_base_dir(city: str) -> str:
        return os.path.join(bcfg.PROJECT_ROOT, "data", "results", city, "dynamic_world")

    @staticmethod
    def get_available_cities() -> List[str]:
        """Returns exclusively Tamil Nadu regions from Esri config."""
        return EsriService.get_available_cities()

    @staticmethod
    def get_available_years(city: str) -> List[int]:
        """Returns multi-temporal time series from backend config for valid cities."""
        if not EsriService.get_city_config(city):
            return []
        return list(bcfg.ESRI_YEARS)

    @staticmethod
    def get_change_periods(city: str) -> List[str]:
        """Returns available change comparison intervals derived from configured years."""
        if not EsriService.get_city_config(city):
            return []
        years = sorted(bcfg.ESRI_YEARS)
        if len(years) < 2:
            return []
        first, last = years[0], years[-1]
        periods = [f"{first}_{last}"]
        for y in years[1:-1]:
            periods.append(f"{y}_{last}")
        return list(dict.fromkeys(periods))

    @staticmethod
    def _extract_layer_year(layer_id: str) -> Optional[int]:
        """Validates layer_id prefix and extracts the target year."""
        valid_prefixes = ("dynamic_world_", "esri_", "change_", "transition_")
        if not any(layer_id.startswith(p) for p in valid_prefixes):
            return None
        year_digits = "".join([c for c in layer_id if c.isdigit()])
        if len(year_digits) < 4:
            return None
        year = int(year_digits[:4])
        if year not in bcfg.ESRI_YEARS:
            return None
        return year

    @staticmethod
    def _resolve_tiles(city: str) -> List[str]:
        """Normalizes EsriService.resolve_city_tile(city) to a non-empty list of tile IDs."""
        tile_id = EsriService.resolve_city_tile(city)
        if isinstance(tile_id, list):
            tiles = [str(t) for t in tile_id if t]
        elif isinstance(tile_id, str) and tile_id:
            tiles = [tile_id]
        else:
            tiles = []
        return tiles or ["44P"]

    @staticmethod
    def _get_cache_lock(cache_path: str) -> threading.Lock:
        with _CACHE_LOCKS_GUARD:
            lock = _CACHE_LOCKS.get(cache_path)
            if lock is None:
                lock = threading.Lock()
                _CACHE_LOCKS[cache_path] = lock
            return lock

    @staticmethod
    def _canonical_source_id(path: str) -> str:
        """Returns a stable cache-key identifier for local files or presigned /vsicurl/ URLs."""
        if path.startswith("/vsicurl/"):
            return f"vsicurl:{path[len('/vsicurl/'):].split('?', 1)[0]}"
        abs_path = os.path.abspath(path)
        mtime = os.path.getmtime(abs_path) if os.path.exists(abs_path) else 0
        return f"{abs_path}:{mtime}"

    @staticmethod
    def _prune_raster_cache(
        cache_dir: str = _RASTER_CACHE_DIR,
        max_bytes: int = _RASTER_CACHE_MAX_BYTES,
        max_files: int = _RASTER_CACHE_MAX_FILES,
        preserve_path: Optional[str] = None,
    ) -> None:
        """Evicts oldest cached merged GeoTIFFs (LRU by mtime) to cap ephemeral disk usage."""
        if not os.path.isdir(cache_dir):
            return
        entries = []
        total_bytes = 0
        for name in os.listdir(cache_dir):
            if not name.endswith(".tif") or name.endswith(".tmp.tif"):
                continue
            fpath = os.path.join(cache_dir, name)
            try:
                st = os.stat(fpath)
                entries.append((st.st_mtime, st.st_size, fpath))
                total_bytes += st.st_size
            except OSError:
                continue

        entries.sort(key=lambda x: x[0])  # oldest mtime first
        remaining = len(entries)
        for _mtime, size, fpath in entries:
            if total_bytes <= max_bytes and remaining <= max_files:
                break
            if preserve_path and os.path.abspath(fpath) == os.path.abspath(preserve_path):
                continue
            try:
                os.remove(fpath)
                total_bytes -= size
                remaining -= 1
            except OSError:
                pass

    @staticmethod
    def _merge_via_gdalwarp(
        source_paths: List[str],
        tmp_path: str,
        target_crs: Any,
        merge_bounds: Optional[tuple],
    ) -> bool:
        """Streams a bounded-memory multi-tile merge directly to disk using gdalwarp CLI."""
        gdalwarp_bin = shutil.which("gdalwarp")
        if not gdalwarp_bin:
            return False

        cmd = [
            gdalwarp_bin,
            "-r", "near",
            "-srcnodata", "0",
            "-dstnodata", "0",
            "-wm", "32",
            "-co", "TILED=YES",
            "-co", "BLOCKXSIZE=256",
            "-co", "BLOCKYSIZE=256",
            "-co", "COMPRESS=LZW",
            "-overwrite",
        ]
        if target_crs is not None:
            cmd.extend(["-t_srs", str(target_crs)])
        if merge_bounds and len(merge_bounds) == 4:
            cmd.extend(["-te", *[str(v) for v in merge_bounds]])
        cmd.extend(source_paths)
        cmd.append(tmp_path)

        env = os.environ.copy()
        env.setdefault("GDAL_CACHEMAX", "32")
        env.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
        env.setdefault("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".tif,.tiff")
        env.setdefault("VSI_CACHE", "TRUE")
        env.setdefault("VSI_CACHE_SIZE", "16777216")
        env.setdefault("CPL_VSIL_CURL_USE_HEAD", "NO")

        proc = subprocess.run(cmd, env=env, capture_output=True, text=True, check=False)
        if proc.returncode != 0:
            raise RuntimeError(f"gdalwarp exited with code {proc.returncode}: {proc.stderr.strip()}")
        return os.path.exists(tmp_path) and os.path.getsize(tmp_path) > 0

    @staticmethod
    def _merge_via_rasterio_streaming(
        source_paths: List[str],
        tmp_path: str,
        bbox: Optional[List[float]],
    ) -> None:
        """Bounded-memory fallback using WarpedVRT(warp_mem_limit=32) + rasterio_merge(dst_path=...)."""
        with ExitStack() as stack:
            srcs = [stack.enter_context(rasterio.open(p)) for p in source_paths]
            crs_set = {str(s.crs) for s in srcs if s.crs is not None}
            if len(crs_set) > 1:
                target_crs = "EPSG:4326"
                merge_inputs = [
                    stack.enter_context(
                        WarpedVRT(
                            s,
                            crs=target_crs,
                            resampling=Resampling.nearest,
                            warp_mem_limit=32,
                        )
                    )
                    for s in srcs
                ]
            else:
                target_crs = srcs[0].crs
                merge_inputs = srcs

            merge_bounds = None
            if bbox and len(bbox) == 4 and target_crs is not None:
                if str(target_crs).upper() == "EPSG:4326":
                    merge_bounds = tuple(bbox)
                else:
                    merge_bounds = transform_bounds("EPSG:4326", target_crs, *bbox)

            rasterio_merge(
                merge_inputs,
                bounds=merge_bounds,
                nodata=0,
                resampling=Resampling.nearest,
                dst_path=tmp_path,
                dst_kwds={
                    "driver": "GTiff",
                    "compress": "lzw",
                    "tiled": True,
                    "blockxsize": 256,
                    "blockysize": 256,
                },
            )

    @staticmethod
    def resolve_layer_path(city: str, layer_id: str) -> Optional[str]:
        """Resolves to the physical GeoTIFF raster, merging multiple tiles in bounded memory when needed."""
        year = DynamicWorldService._extract_layer_year(layer_id)
        if year is None:
            return None

        city_conf = EsriService.get_city_config(city)
        if not city_conf:
            return None

        tiles = DynamicWorldService._resolve_tiles(city)
        if len(tiles) == 1:
            return EsriService.find_file(tiles[0], year)

        source_paths: List[str] = []
        for tile in tiles:
            fpath = EsriService.find_file(tile, year)
            if not fpath:
                r2_url = EsriService.get_raster_url(tile, year)
                if r2_url:
                    fpath = f"/vsicurl/{r2_url}"
            if not fpath:
                logger.warning(f"Missing raster source for dual-tile {city} ({tile}, {year})")
                return None
            source_paths.append(fpath)

        bbox = city_conf.get("bbox")
        sig_parts = [DynamicWorldService._canonical_source_id(p) for p in source_paths]
        if bbox:
            sig_parts.append(f"bbox:{bbox}")
        sig_hash = hashlib.md5("|".join(sig_parts).encode("utf-8")).hexdigest()[:12]

        os.makedirs(_RASTER_CACHE_DIR, exist_ok=True)
        safe_city = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in city.lower().strip())
        tiles_key = "_".join(tiles)
        cache_path = os.path.join(
            _RASTER_CACHE_DIR,
            f"geosat_{safe_city}_{tiles_key}_{year}_{sig_hash}.tif",
        )

        lock = DynamicWorldService._get_cache_lock(cache_path)
        with lock:
            if os.path.exists(cache_path) and os.path.getsize(cache_path) > 0:
                try:
                    os.utime(cache_path, None)
                except OSError:
                    pass
                return cache_path

            tmp_path = f"{cache_path}.{os.getpid()}.{threading.get_ident()}.tmp.tif"
            try:
                with _MERGE_SEMAPHORE:
                    used_gdalwarp = False
                    if shutil.which("gdalwarp"):
                        with ExitStack() as stack:
                            srcs = [stack.enter_context(rasterio.open(p)) for p in source_paths]
                            crs_set = {str(s.crs) for s in srcs if s.crs is not None}
                            target_crs = "EPSG:4326" if len(crs_set) > 1 else srcs[0].crs
                            merge_bounds = None
                            if bbox and len(bbox) == 4 and target_crs is not None:
                                if str(target_crs).upper() == "EPSG:4326":
                                    merge_bounds = tuple(bbox)
                                else:
                                    merge_bounds = transform_bounds("EPSG:4326", target_crs, *bbox)
                        used_gdalwarp = DynamicWorldService._merge_via_gdalwarp(
                            source_paths, tmp_path, target_crs, merge_bounds
                        )

                    if not used_gdalwarp:
                        DynamicWorldService._merge_via_rasterio_streaming(
                            source_paths, tmp_path, bbox
                        )

                if not (os.path.exists(tmp_path) and os.path.getsize(tmp_path) > 0):
                    raise RuntimeError("Merged GeoTIFF output was empty or missing")

                os.replace(tmp_path, cache_path)
                DynamicWorldService._prune_raster_cache(preserve_path=cache_path)
                return cache_path
            except Exception as e:
                logger.error(f"Failed to merge dual-tile rasters for {city} ({tiles}, {year}): {e}")
                if os.path.exists(tmp_path):
                    try:
                        os.remove(tmp_path)
                    except OSError:
                        pass
                return None

    @staticmethod
    def resolve_layer_url(city: str, layer_id: str) -> Optional[str]:
        """Resolves to the Cloudflare R2 GeoTIFF URL for single-tile districts when R2 is configured."""
        year = DynamicWorldService._extract_layer_year(layer_id)
        if year is None:
            return None
        if not EsriService.get_city_config(city):
            return None
        tiles = DynamicWorldService._resolve_tiles(city)
        if len(tiles) > 1:
            return None
        return EsriService.get_raster_url(tiles[0], year)

    @staticmethod
    def resolve_preview_url(city: str, layer_id: str) -> Optional[str]:
        """Resolves to the Cloudflare R2 RGBA PNG preview URL when R2 is configured."""
        if not EsriService.get_city_config(city):
            return None
        if not EsriService.is_r2_configured():
            return None
        return EsriService.get_preview_url(city, layer_id)

    @staticmethod
    def resolve_preview_path(city: str, layer_id: str) -> Optional[str]:
        """Generates or retrieves RGBA PNG for Leaflet ImageOverlay."""
        return EsriService.get_city_preview_png(city, layer_id)

    @staticmethod
    def get_metadata(city: str, year: int) -> Dict[str, Any]:
        """Returns geographic boundary envelope and raster metadata."""
        return EsriService.get_city_metadata(city, year)

    @staticmethod
    def get_stats(city: str, year: int) -> Dict[str, Any]:
        """Calculates exact class distribution for the city window."""
        city_conf = EsriService.get_city_config(city)
        if not city_conf:
            return {}

        tile_id = EsriService.resolve_city_tile(city)
        raw_stats = EsriService.compute_stats_for_window(tile_id, year, city_conf["bbox"], location_id=city)

        classes_dict = {}
        for c in raw_stats["classes"]:
            classes_dict[c["class_name"]] = {
                "id": c["class_id"],
                "pixels": c["pixel_count"],
                "area_km2": c["area_km2"],
                "percentage": c["percentage"]
            }

        return {
            "city": city,
            "year": year,
            "valid_pixels": raw_stats["total_pixels"],
            "valid_area_km2": raw_stats["total_area_km2"],
            "sampling_meters": raw_stats.get("sampling_meters", 10.0),
            "classes": classes_dict
        }

    @staticmethod
    def get_change_stats(city: str, from_year: int, to_year: int) -> Dict[str, Any]:
        """Calculates multi-year pixel-wise change and net class fluxes."""
        city_conf = EsriService.get_city_config(city)
        if not city_conf:
            return {}

        tile_id = EsriService.resolve_city_tile(city)
        diff = EsriService.compute_change_stats_for_window(tile_id, from_year, to_year, city_conf["bbox"], location_id=city)

        per_class_dict = {}
        for d in diff["class_diffs"]:
            per_class_dict[d["class_name"]] = {
                "count_from": d.get("from_pixels", 0),
                "count_to": d.get("to_pixels", 0),
                "from_area_km2": d["from_area_km2"],
                "to_area_km2": d["to_area_km2"],
                "gain": max(0, d.get("net_change_pixels", 0)),
                "loss": max(0, -d.get("net_change_pixels", 0)),
                "net_change": d.get("net_change_pixels", 0),
                "gain_km2": round(max(0.0, d["net_change_km2"]), 4),
                "loss_km2": round(max(0.0, -d["net_change_km2"]), 4),
                "net_change_km2": round(d["net_change_km2"], 4),
            }

        return {
            "city": city,
            "from_year": from_year,
            "to_year": to_year,
            "valid_pixels": diff["valid_pixels"],
            "valid_area_km2": diff["total_area_km2"],
            "unchanged_pixels": diff["unchanged_pixels"],
            "unchanged_area_km2": diff["unchanged_area_km2"],
            "changed_pixels": diff["changed_pixels"],
            "changed_area_km2": diff["changed_area_km2"],
            "unchanged_percentage": diff["unchanged_percentage"],
            "changed_percentage": diff["change_percentage"],
            "sampling_meters": diff.get("sampling_meters", 10.0),
            "classes": per_class_dict,
            "top_transitions": diff.get("top_transitions", [])
        }

    @staticmethod
    def get_transition_matrix(city: str, from_year: int, to_year: int) -> Dict[str, Any]:
        """Computes real directional transition matrix across Esri classes."""
        city_conf = EsriService.get_city_config(city)
        if not city_conf:
            return {}
        tile_id = EsriService.resolve_city_tile(city)
        diff = EsriService.compute_change_stats_for_window(tile_id, from_year, to_year, city_conf["bbox"], location_id=city)
        class_names = [v for k, v in sorted(bcfg.ESRI_CLASSES.items())]
        return {
            "from_year": from_year,
            "to_year": to_year,
            "classes": class_names,
            "matrix": diff.get("transition_matrix", [[0] * len(class_names) for _ in class_names])
        }
