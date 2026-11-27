import os
import glob
import json
import math
import logging
from typing import List, Dict, Any, Optional, Tuple, Union
from urllib.parse import quote

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.windows import from_bounds
from rasterio.warp import transform_bounds
from rasterio.features import geometry_mask
from shapely.geometry import shape, box, mapping
from shapely.ops import transform
import pyproj
from PIL import Image

import backend_config as bcfg
import utils

logger = utils.get_logger(__name__)

# RGBA mapping for Leaflet ImageOverlay (transparent nodata)
ESRI_RGBA_PALETTE = {
    0: (0, 0, 0, 0),          # NoData (Transparent)
    1: (26, 91, 171, 235),    # Water (Blue)
    2: (53, 130, 33, 235),    # Trees (Green)
    4: (135, 209, 158, 235),  # Flooded veg (Teal)
    5: (255, 219, 92, 235),   # Crops (Yellow)
    7: (237, 2, 42, 245),     # Built Area (Red)
    8: (237, 233, 228, 235),  # Bare ground (Grey)
    9: (242, 250, 255, 235),  # Snow/Ice
    10: (200, 200, 200, 210), # Clouds
    11: (238, 207, 168, 235)  # Rangeland (Tan)
}

# Change colors
BINARY_CHANGE_RGBA = {
    0: (0, 0, 0, 0),          # No change
    1: (239, 68, 68, 240)     # Changed pixels (Bright Red)
}

class EsriService:
    _hierarchy_cache: Optional[Dict[str, Any]] = None
    _tiles_cache: Optional[Dict[str, Any]] = None
    _geometry_cache: Dict[str, Any] = {}
    _transformer_cache: Dict[str, Any] = {}
    _utm_geom_cache: Dict[Tuple[int, str], Any] = {}
    _stats_cache: Dict[str, Dict[str, Any]] = {}
    _change_cache: Dict[str, Dict[str, Any]] = {}
    _overview_summary_cache: Optional[Dict[str, Any]] = None
    _supabase_client: Optional[Any] = None
    _supabase_init_attempted: bool = False
    _s3_client: Optional[Any] = None
    _s3_init_attempted: bool = False

    @classmethod
    def _get_supabase_url_and_key(cls) -> Tuple[str, str]:
        url = (os.getenv("SUPABASE_URL") or bcfg.SUPABASE_URL or "").strip()
        key = (
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            or os.getenv("SUPABASE_KEY")
            or os.getenv("SUPABASE_ANON_KEY")
            or bcfg.SUPABASE_KEY
            or ""
        ).strip()
        return url, key

    @classmethod
    def is_supabase_configured(cls) -> bool:
        url, key = cls._get_supabase_url_and_key()
        return bool(url and key)

    @classmethod
    def _get_supabase_client(cls) -> Optional[Any]:
        if cls._supabase_init_attempted:
            return cls._supabase_client
        cls._supabase_init_attempted = True
        url, key = cls._get_supabase_url_and_key()
        if not url or not key:
            return None
        try:
            from supabase import create_client  # type: ignore[import-not-found]
            cls._supabase_client = create_client(url, key)
            logger.info("Supabase client initialized for EsriService.")
        except Exception as e:
            logger.warning(f"Failed to initialize Supabase client: {e}")
            cls._supabase_client = None
        return cls._supabase_client

    @classmethod
    def _get_r2_public_url(cls) -> str:
        """Private Backblaze B2 buckets use presigned GetObject URLs (no public base URL)."""
        return ""

    @classmethod
    def _get_s3_client(cls) -> Optional[Any]:
        if cls._s3_init_attempted:
            return cls._s3_client
        cls._s3_init_attempted = True
        endpoint_url = (os.getenv("B2_ENDPOINT_URL") or bcfg.B2_ENDPOINT_URL or "").strip().rstrip("/")
        region_name = (os.getenv("B2_REGION") or bcfg.B2_REGION or "us-east-005").strip()
        access_key = (os.getenv("B2_ACCESS_KEY_ID") or bcfg.B2_ACCESS_KEY_ID or "").strip()
        secret_key = (os.getenv("B2_SECRET_ACCESS_KEY") or bcfg.B2_SECRET_ACCESS_KEY or "").strip()
        if not (endpoint_url and access_key and secret_key):
            return None
        try:
            import boto3  # type: ignore[import-not-found]
            from botocore.config import Config  # type: ignore[import-not-found]
            cls._s3_client = boto3.client(
                "s3",
                endpoint_url=endpoint_url,
                region_name=region_name,
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                config=Config(signature_version="s3v4"),
            )
        except Exception as e:
            logger.warning(f"Failed to initialize Backblaze B2 S3 client: {e}")
            cls._s3_client = None
        return cls._s3_client

    @classmethod
    def is_r2_configured(cls) -> bool:
        if cls._get_r2_public_url():
            return True
        endpoint_url = (os.getenv("B2_ENDPOINT_URL") or bcfg.B2_ENDPOINT_URL or "").strip()
        access_key = (os.getenv("B2_ACCESS_KEY_ID") or bcfg.B2_ACCESS_KEY_ID or "").strip()
        secret_key = (os.getenv("B2_SECRET_ACCESS_KEY") or bcfg.B2_SECRET_ACCESS_KEY or "").strip()
        return bool(endpoint_url and access_key and secret_key)

    @classmethod
    def resolve_r2_url(cls, r2_key: str, expires_in: int = 3600) -> Optional[str]:
        clean_key = r2_key.lstrip("/")
        public_base = cls._get_r2_public_url()
        if public_base:
            return f"{public_base}/{quote(clean_key, safe='/')}"
        s3 = cls._get_s3_client()
        bucket = (os.getenv("B2_BUCKET_NAME") or bcfg.B2_BUCKET_NAME or "geosat-assets").strip()
        if s3 is not None and bucket:
            try:
                return s3.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": bucket, "Key": clean_key},
                    ExpiresIn=expires_in,
                )
            except Exception as e:
                logger.warning(f"Failed to generate B2 presigned URL for {clean_key}: {e}")
        return None

    @classmethod
    def get_raster_url(cls, tile_id: str, year: int) -> Optional[str]:
        tile_dir = bcfg.ESRI_TILE_DIRS.get(tile_id, "TN-2" if tile_id == "44P" else "TN-1")
        fname = bcfg.get_esri_raster_filename(tile_id, year)
        return cls.resolve_r2_url(f"rasters/esri/{tile_dir}/{fname}")

    @classmethod
    def get_preview_url(cls, city: str, layer_id: str) -> Optional[str]:
        return cls.resolve_r2_url(f"previews/esri/{city.lower()}_{layer_id}.png")

    @classmethod
    def _fetch_year_stats_from_supabase(cls, location_id: str, year: int) -> Optional[Dict[str, Any]]:
        client = cls._get_supabase_client()
        if client is None:
            return None
        loc_norm = location_id.lower().strip()
        try:
            resp = (
                client.table("esri_year_stats")
                .select("cache_key,total_pixels,total_area_km2,classes")
                .eq("location_id", loc_norm)
                .eq("year", int(year))
                .execute()
            )
            rows = resp.data or []
            if not rows:
                return None
            # Prefer highest-resolution cached row (1400_v2) if multiple exist
            rows.sort(key=lambda r: (0 if "1400" in str(r.get("cache_key", "")) else 1, str(r.get("cache_key", ""))))
            row = rows[0]
            return {
                "total_pixels": int(row["total_pixels"]),
                "total_area_km2": float(row["total_area_km2"]),
                "sampling_meters": 20.0 if "1400" in str(row.get("cache_key", "")) else 10.0,
                "classes": row["classes"],
            }
        except Exception as e:
            logger.error(f"Supabase query failed for esri_year_stats ({loc_norm}, {year}): {e}")
            raise RuntimeError(f"Supabase year-stats query failed for {location_id} {year}: {e}") from e

    @classmethod
    def _fetch_bulk_year_stats_from_supabase(
        cls, location_ids: List[str], years: List[int]
    ) -> Dict[Tuple[str, int], Dict[str, Any]]:
        """
        Fetch esri_year_stats rows for multiple locations and years in a single bulk query,
        indexed by (normalized_location_id, year) and preferring '1400' cache keys.
        """
        if not location_ids or not years:
            return {}
        client = cls._get_supabase_client()
        if client is None:
            return {}
        norm_ids = [lid.lower().strip() for lid in location_ids]
        int_years = [int(y) for y in years]
        try:
            resp = (
                client.table("esri_year_stats")
                .select("location_id,year,cache_key,total_pixels,total_area_km2,classes")
                .in_("location_id", norm_ids)
                .in_("year", int_years)
                .execute()
            )
            grouped: Dict[Tuple[str, int], List[Dict[str, Any]]] = {}
            for row in (resp.data or []):
                loc = str(row.get("location_id", "")).lower().strip()
                yr_raw = row.get("year")
                if not loc or yr_raw is None:
                    continue
                grouped.setdefault((loc, int(yr_raw)), []).append(row)

            result: Dict[Tuple[str, int], Dict[str, Any]] = {}
            for key, rows in grouped.items():
                rows.sort(key=lambda r: (0 if "1400" in str(r.get("cache_key", "")) else 1, str(r.get("cache_key", ""))))
                row = rows[0]
                result[key] = {
                    "total_pixels": int(row["total_pixels"]),
                    "total_area_km2": float(row["total_area_km2"]),
                    "sampling_meters": 20.0 if "1400" in str(row.get("cache_key", "")) else 10.0,
                    "classes": row["classes"],
                }
            return result
        except Exception as e:
            logger.warning(f"Bulk Supabase query failed for esri_year_stats: {e}")
            return {}

    @classmethod
    def _fetch_change_stats_from_supabase(
        cls, location_id: str, from_year: int, to_year: int
    ) -> Optional[Dict[str, Any]]:
        client = cls._get_supabase_client()
        if client is None:
            return None
        loc_norm = location_id.lower().strip()
        try:
            resp = (
                client.table("esri_change_stats")
                .select("*")
                .eq("location_id", loc_norm)
                .eq("from_year", int(from_year))
                .eq("to_year", int(to_year))
                .limit(1)
                .execute()
            )
            rows = resp.data or []
            if not rows:
                return None
            row = rows[0]
            trans = row.get("transitions") or {}
            if isinstance(trans, list):
                top_transitions = trans
                transition_matrix = []
                total_area_km2 = 0.0
                unchanged_area_km2 = 0.0
                changed_area_km2 = 0.0
                unchanged_pct = round(100.0 - float(row["change_percentage"]), 2)
                sampling_meters = 10.0
            else:
                top_transitions = trans.get("top_transitions", [])
                transition_matrix = trans.get("transition_matrix", [])
                total_area_km2 = float(trans.get("total_area_km2", 0.0))
                unchanged_area_km2 = float(trans.get("unchanged_area_km2", 0.0))
                changed_area_km2 = float(trans.get("changed_area_km2", 0.0))
                unchanged_pct = float(trans.get("unchanged_percentage", round(100.0 - float(row["change_percentage"]), 2)))
                sampling_meters = float(trans.get("sampling_meters", 10.0))

            return {
                "from_year": int(row["from_year"]),
                "to_year": int(row["to_year"]),
                "valid_pixels": int(row["total_pixels"]),
                "total_area_km2": total_area_km2,
                "unchanged_pixels": int(row["unchanged_pixels"]),
                "unchanged_area_km2": unchanged_area_km2,
                "changed_pixels": int(row["changed_pixels"]),
                "changed_area_km2": changed_area_km2,
                "unchanged_percentage": unchanged_pct,
                "change_percentage": float(row["change_percentage"]),
                "sampling_meters": sampling_meters,
                "class_diffs": row["classes"],
                "top_transitions": top_transitions,
                "transition_matrix": transition_matrix,
            }
        except Exception as e:
            logger.error(f"Supabase query failed for esri_change_stats ({loc_norm}, {from_year}-{to_year}): {e}")
            raise RuntimeError(
                f"Supabase change-stats query failed for {location_id} {from_year}-{to_year}: {e}"
            ) from e

    @classmethod
    def get_preview_dir(cls) -> str:
        preview_dir = os.path.join(bcfg.PROJECT_ROOT, "data", "esri_previews")
        os.makedirs(preview_dir, exist_ok=True)
        return preview_dir

    @classmethod
    def get_stats_cache_dir(cls) -> str:
        stats_dir = os.path.join(bcfg.PROJECT_ROOT, "data", "esri_stats_cache")
        os.makedirs(stats_dir, exist_ok=True)
        return stats_dir

    @classmethod
    def get_candidate_tile_dirs(cls, tile_id: str) -> List[str]:
        return bcfg.ESRI_CANDIDATE_DIRS.get(tile_id, [])

    @classmethod
    def find_file(cls, tile_id: str, year: int) -> Optional[str]:
        for candidate_dir in cls.get_candidate_tile_dirs(tile_id):
            if not os.path.exists(candidate_dir):
                continue
            patterns = [
                f"*{tile_id}*{year}*.tif",
                f"*{tile_id}*{year}*.tiff",
                f"*{year}*.tif"
            ]
            for pattern in patterns:
                matches = glob.glob(os.path.join(candidate_dir, pattern))
                if matches:
                    return matches[0]
        return None

    @classmethod
    def get_hierarchy(cls, force_reload: bool = False) -> Dict[str, Any]:
        if cls._hierarchy_cache is not None and not force_reload:
            return cls._hierarchy_cache

        config_path = os.path.join(bcfg.PROJECT_ROOT, "config", "esri_regions.json")
        if not os.path.exists(config_path):
            logger.warning(f"esri_regions.json not found at {config_path}")
            return {}

        try:
            with open(config_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                cls._hierarchy_cache = data
                return data
        except Exception as e:
            logger.error(f"Failed to read esri_regions.json: {e}")
            return {}

    @classmethod
    def get_available_tiles(cls) -> Dict[str, Any]:
        if cls._tiles_cache is not None:
            return cls._tiles_cache

        tiles = {}
        for tile_id in ["43P", "44P"]:
            years = []
            sample_file = None
            for y in bcfg.ESRI_YEARS:
                fp = cls.find_file(tile_id, y)
                if fp:
                    years.append(y)
                    if sample_file is None:
                        sample_file = fp

            wgs84_bounds = []
            crs_str = ""
            if sample_file and os.path.exists(sample_file):
                try:
                    with rasterio.open(sample_file) as src:
                        crs_str = str(src.crs)
                        wgs84_bounds = list(transform_bounds(src.crs, "EPSG:4326", *src.bounds))
                except Exception as e:
                    logger.error(f"Error inspecting sample file for tile {tile_id}: {e}")
            elif not years and cls.is_r2_configured():
                years = list(bcfg.ESRI_YEARS)
                wgs84_bounds = [72.0, 8.0, 78.0, 16.0] if tile_id == "43P" else [78.0, 8.0, 84.0, 16.0]

            tiles[tile_id] = {
                "tile_id": tile_id,
                "utm_zone": "43N" if tile_id == "43P" else "44N",
                "crs": crs_str or ("EPSG:32643" if tile_id == "43P" else "EPSG:32644"),
                "available_years": sorted(years),
                "wgs84_bounds": wgs84_bounds,
                "file_count": len(years)
            }

        cls._tiles_cache = tiles
        return tiles

    @classmethod
    def get_available_cities(cls) -> List[str]:
        hierarchy = cls.get_hierarchy()
        cities = list(hierarchy.get("cities", {}).keys())
        # Also include districts for full coverage
        districts = list(hierarchy.get("districts", {}).keys())
        combined = list(dict.fromkeys(cities + districts))
        return combined

    @classmethod
    def get_city_config(cls, city: str) -> Optional[Dict[str, Any]]:
        hierarchy = cls.get_hierarchy()
        # 1. Check districts first so true district polygons take precedence
        dist_dict = hierarchy.get("districts", {})
        for k, v in dist_dict.items():
            if k.lower() == city.lower() or v.get("name", "").lower() == city.lower():
                res = dict(v)
                res["city_id"] = k
                return res

        # 2. Check cities
        city_dict = hierarchy.get("cities", {})
        for k, v in city_dict.items():
            if k.lower() == city.lower() or v.get("name", "").lower() == city.lower():
                res = dict(v)
                res["city_id"] = k
                dist_name = res.get("district")
                if dist_name and dist_name in dist_dict:
                    # Inherit true boundary and tiles from parent district if not set
                    if not res.get("boundary"):
                        res["boundary"] = dist_dict[dist_name].get("boundary")
                    if not res.get("tiles"):
                        res["tiles"] = dist_dict[dist_name].get("tiles")
                return res
        return None

    @classmethod
    def get_city_metadata(cls, city: str, year: int) -> Dict[str, Any]:
        city_conf = cls.get_city_config(city)
        if not city_conf:
            return {}

        bbox = city_conf.get("bbox", [])
        tiles = cls.resolve_city_tile(city)
        tile_id = tiles[0] if isinstance(tiles, list) and tiles else "44P"

        # Derive actual sampled dimensions & effective spatial resolution from the GeoTIFF window
        width, height = 0, 0
        res_m = 10.0
        crs_str = "EPSG:4326"
        fpath = cls.find_file(tile_id, year)
        if fpath and len(bbox) == 4:
            try:
                with rasterio.open(fpath) as src:
                    left, bottom, right, top = transform_bounds("EPSG:4326", src.crs, *bbox)
                    left = max(left, src.bounds.left)
                    bottom = max(bottom, src.bounds.bottom)
                    right = min(right, src.bounds.right)
                    top = min(top, src.bounds.top)
                    win = from_bounds(left, bottom, right, top, src.transform)
                    win_w = int(max(1, round(win.width)))
                    win_h = int(max(1, round(win.height)))
                    step = max(1, int(max(win_w, win_h) / 1400))
                    width = max(1, win_w // step)
                    height = max(1, win_h // step)
                    res_m = round(10.0 * math.sqrt((win.width / width) * (win.height / height)), 1)
            except Exception as e:
                logger.warning(f"Failed to inspect metadata for {city} {year}: {e}")
        elif len(bbox) == 4:
            # Estimate sampled dimensions from WGS84 bbox when GeoTIFFs are hosted remotely on R2
            min_lon, min_lat, max_lon, max_lat = bbox
            mid_lat_rad = math.radians((min_lat + max_lat) / 2.0)
            est_w = max(1, int(round((max_lon - min_lon) * 111320.0 * math.cos(mid_lat_rad) / 10.0)))
            est_h = max(1, int(round((max_lat - min_lat) * 111320.0 / 10.0)))
            step = max(1, int(max(est_w, est_h) / 1400))
            width = max(1, est_w // step)
            height = max(1, est_h // step)
            res_m = round(10.0 * step, 1)

        return {
            "city": city,
            "year": year,
            "source": "Sentinel-2 / Esri 10m Land Cover",
            "method": "mode",
            "crs": crs_str,
            "width": width,
            "height": height,
            "resolution": [res_m, res_m],
            "bounds": bbox, # [min_lon, min_lat, max_lon, max_lat]
            "dtype": "uint8",
            "nodata": 0
        }

    @classmethod
    def get_location_entry(cls, level: str, location_id: str) -> Optional[Dict[str, Any]]:
        hierarchy = cls.get_hierarchy()
        level_key = level.lower()
        if not level_key.endswith("s"):
            plural_map = {"region": "regions", "state": "states", "district": "districts", "city": "cities"}
            level_key = plural_map.get(level_key, level_key)

        group = hierarchy.get(level_key, {})
        for k, v in group.items():
            if k.lower() == location_id.lower() or v.get("name", "").lower() == location_id.lower():
                entry = dict(v)
                entry["id"] = k
                entry["level"] = level.lower()
                return entry
        return None

    @classmethod
    def load_boundary_geometry(cls, location_entry_or_name: Union[Dict, str]) -> Optional[Any]:
        """Loads and caches the shapely polygon boundary geometry (EPSG:4326)."""
        boundary_path = None
        key_name = ""

        if isinstance(location_entry_or_name, str):
            key_name = location_entry_or_name.lower().strip()
            conf = cls.get_city_config(location_entry_or_name)
            if conf and "boundary" in conf:
                boundary_path = conf["boundary"]
            elif conf and "district" in conf:
                boundary_path = f"boundaries/{conf['district'].lower().replace(' ', '_')}.geojson"
            else:
                boundary_path = f"boundaries/{key_name.replace(' ', '_')}.geojson"
        elif isinstance(location_entry_or_name, dict):
            boundary_path = location_entry_or_name.get("boundary")
            dist_field = location_entry_or_name.get("district")
            name_field = location_entry_or_name.get("name", location_entry_or_name.get("city_id", ""))
            if not boundary_path:
                if dist_field:
                    boundary_path = f"boundaries/{dist_field.lower().replace(' ', '_')}.geojson"
                else:
                    boundary_path = f"boundaries/{name_field.lower().replace(' ', '_')}.geojson"
            key_name = (dist_field or name_field or location_entry_or_name.get("city_id", "")).lower().strip()

        if key_name in cls._geometry_cache:
            return cls._geometry_cache[key_name]

        fname = os.path.basename(boundary_path) if boundary_path else f"{key_name.replace(' ', '_')}.geojson"
        candidates = [
            boundary_path,
            os.path.join(bcfg.PROJECT_ROOT, boundary_path) if boundary_path else None,
            os.path.join(os.path.dirname(bcfg.PROJECT_ROOT), boundary_path) if boundary_path else None,
            os.path.join(bcfg.PROJECT_ROOT, "boundaries", fname),
            os.path.join(os.path.dirname(bcfg.PROJECT_ROOT), "boundaries", fname),
            os.path.join("boundaries", fname),
        ]

        for p in candidates:
            if p and os.path.exists(p):
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    features = data.get("features", [])
                    if features:
                        geom = shape(features[0]["geometry"])
                        cls._geometry_cache[key_name] = geom
                        return geom
                except Exception as e:
                    logger.warning(f"Failed to load boundary from {p}: {e}")

        return None

    @classmethod
    def _read_window_data(
        cls,
        tile_id: str,
        year: int,
        bbox_wgs84: List[float],
        max_pixels: int = 1400,
        polygon_geom: Optional[Any] = None
    ) -> Tuple[np.ndarray, float]:
        """Reads clipped raster window, reprojects polygon to tile CRS, and masks outside pixels to 0."""
        fpath = cls.find_file(tile_id, year)
        if not fpath:
            r2_url = cls.get_raster_url(tile_id, year)
            if r2_url:
                fpath = f"/vsicurl/{r2_url}"
            else:
                raise FileNotFoundError(
                    f"GeoTIFF not found locally or on R2 for tile {tile_id} year {year}"
                )

        with rasterio.open(fpath) as src:
            min_lon, min_lat, max_lon, max_lat = bbox_wgs84
            left, bottom, right, top = transform_bounds("EPSG:4326", src.crs, min_lon, min_lat, max_lon, max_lat)

            left = max(left, src.bounds.left)
            bottom = max(bottom, src.bounds.bottom)
            right = min(right, src.bounds.right)
            top = min(top, src.bounds.top)

            win = from_bounds(left, bottom, right, top, src.transform)

            win_w = int(max(1, round(win.width)))
            win_h = int(max(1, round(win.height)))
            step = max(1, int(max(win_w, win_h) / max_pixels))
            out_w = max(1, win_w // step)
            out_h = max(1, win_h // step)

            # Use GDAL overviews via out_shape + Resampling.nearest (10-50x faster than full-res read + slice)
            data = src.read(
                1,
                window=win,
                out_shape=(out_h, out_w),
                resampling=Resampling.nearest,
                boundless=True,
                fill_value=0,
            )
            scale_x = win.width / out_w
            scale_y = win.height / out_h
            win_transform = rasterio.windows.transform(win, src.transform) * rasterio.Affine.scale(scale_x, scale_y)

            # Reproject polygon to src.crs (cached) and mask pixels outside it to 0
            if polygon_geom is not None and not polygon_geom.is_empty:
                try:
                    crs_str = str(src.crs)
                    geom_key = (id(polygon_geom), crs_str)
                    geom_utm = cls._utm_geom_cache.get(geom_key)
                    if geom_utm is None:
                        proj = cls._transformer_cache.get(crs_str)
                        if proj is None:
                            proj = pyproj.Transformer.from_crs("EPSG:4326", src.crs, always_xy=True).transform
                            cls._transformer_cache[crs_str] = proj
                        geom_utm = transform(proj, polygon_geom)
                        cls._utm_geom_cache[geom_key] = geom_utm
                    inside_mask = geometry_mask([geom_utm], out_shape=data.shape, transform=win_transform, invert=True)
                    data = np.where(inside_mask, data, 0)
                except Exception as e:
                    logger.warning(f"Failed to mask polygon for tile {tile_id}: {e}")

        pixel_area_km2 = (10.0 * 10.0 * scale_x * scale_y) / 1_000_000.0
        return data, pixel_area_km2

    @classmethod
    def compute_stats_for_window(
        cls,
        tile_id: Any,
        year: int,
        bbox_wgs84: List[float],
        max_pixels: int = 1400,
        polygon_geom: Optional[Any] = None,
        location_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Computes land cover class stats. Supports single tile and dual tile (43P + 44P)
        without double counting by splitting along 78.0° longitude meridian.
        Uses in-memory + disk JSON cache for instant repeat/district-switch loads.
        """
        cache_key = f"{location_id.lower().strip()}_{year}_{max_pixels}_v2" if location_id else None
        if cache_key and cache_key in cls._stats_cache:
            return cls._stats_cache[cache_key]

        if location_id and cls.is_supabase_configured():
            sb_stats = cls._fetch_year_stats_from_supabase(location_id, year)
            if sb_stats is not None:
                if cache_key:
                    cls._stats_cache[cache_key] = sb_stats
                return sb_stats

        if cache_key:
            stats_file = os.path.join(cls.get_stats_cache_dir(), f"{cache_key}.json")
            if os.path.exists(stats_file):
                try:
                    with open(stats_file, "r", encoding="utf-8") as f:
                        cached = json.load(f)
                        cls._stats_cache[cache_key] = cached
                        return cached
                except Exception:
                    pass

        # Resolve polygon if not provided
        if polygon_geom is None and location_id:
            polygon_geom = cls.load_boundary_geometry(location_id)

        # Check for dual tiles
        is_dual = False
        tiles_list = ["44P"]
        if isinstance(tile_id, list):
            tiles_list = tile_id
            if "43P" in tiles_list and "44P" in tiles_list:
                is_dual = True
        elif isinstance(tile_id, str):
            if "43P" in tile_id and "44P" in tile_id:
                is_dual = True
                tiles_list = ["43P", "44P"]
            elif "43P" in tile_id:
                tiles_list = ["43P"]
            else:
                tiles_list = ["44P"]

        min_lon, min_lat, max_lon, max_lat = bbox_wgs84
        if min_lon < 78.0 < max_lon and ("43P" in tiles_list and "44P" in tiles_list):
            is_dual = True

        if is_dual:
            # Dual tile: partition along 78.0 lon seam
            west_box = box(-180, -90, 78.0, 90)
            east_box = box(78.0, -90, 180, 90)

            geom_w = polygon_geom.intersection(west_box) if polygon_geom else None
            geom_e = polygon_geom.intersection(east_box) if polygon_geom else None

            bbox_w = [min_lon, min_lat, min(78.0, max_lon), max_lat]
            bbox_e = [max(78.0, min_lon), min_lat, max_lon, max_lat]

            data_w, area_km2_w = cls._read_window_data("43P", year, bbox_w, max_pixels, geom_w)
            data_e, area_km2_e = cls._read_window_data("44P", year, bbox_e, max_pixels, geom_e)

            # Aggregate stats without double counting
            total_valid_pixels = int(np.sum(data_w > 0) + np.sum(data_e > 0))
            total_area_km2 = round(np.sum(data_w > 0) * area_km2_w + np.sum(data_e > 0) * area_km2_e, 4)
            sampling_meters = round(math.sqrt(max(area_km2_w, area_km2_e) * 1_000_000.0), 1)

            classes_list = []
            for class_id, class_name in bcfg.ESRI_CLASSES.items():
                cnt_w = int(np.sum(data_w == class_id))
                cnt_e = int(np.sum(data_e == class_id))
                total_cnt = cnt_w + cnt_e
                area = round(cnt_w * area_km2_w + cnt_e * area_km2_e, 4)
                pct = round((total_cnt / total_valid_pixels * 100.0), 2) if total_valid_pixels > 0 else 0.0
                classes_list.append({
                    "class_id": class_id,
                    "class_name": class_name,
                    "color": bcfg.ESRI_COLORS.get(class_id, "#CCCCCC"),
                    "pixel_count": total_cnt,
                    "area_km2": area,
                    "percentage": pct
                })

            res_dual = {
                "total_pixels": total_valid_pixels,
                "total_area_km2": total_area_km2,
                "sampling_meters": sampling_meters,
                "classes": classes_list
            }
            if cache_key:
                cls._stats_cache[cache_key] = res_dual
                try:
                    with open(os.path.join(cls.get_stats_cache_dir(), f"{cache_key}.json"), "w", encoding="utf-8") as f:
                        json.dump(res_dual, f)
                except Exception:
                    pass
            return res_dual

        # Single tile path
        single_tile = tiles_list[0] if tiles_list else ("43P" if min_lon < 78.0 else "44P")
        data, pixel_area_km2 = cls._read_window_data(single_tile, year, bbox_wgs84, max_pixels, polygon_geom)

        valid_mask = (data > 0)
        total_valid_pixels = int(np.sum(valid_mask))
        total_area_km2 = round(total_valid_pixels * pixel_area_km2, 4)
        sampling_meters = round(math.sqrt(pixel_area_km2 * 1_000_000.0), 1)

        classes_list = []
        for class_id, class_name in bcfg.ESRI_CLASSES.items():
            count = int(np.sum(data == class_id))
            area_km2 = round(count * pixel_area_km2, 4)
            pct = round((count / total_valid_pixels * 100.0), 2) if total_valid_pixels > 0 else 0.0
            classes_list.append({
                "class_id": class_id,
                "class_name": class_name,
                "color": bcfg.ESRI_COLORS.get(class_id, "#CCCCCC"),
                "pixel_count": count,
                "area_km2": area_km2,
                "percentage": pct
            })

        res_single = {
            "total_pixels": total_valid_pixels,
            "total_area_km2": total_area_km2,
            "sampling_meters": sampling_meters,
            "classes": classes_list
        }
        if cache_key:
            cls._stats_cache[cache_key] = res_single
            try:
                with open(os.path.join(cls.get_stats_cache_dir(), f"{cache_key}.json"), "w", encoding="utf-8") as f:
                    json.dump(res_single, f)
            except Exception:
                pass
        return res_single

    @classmethod
    def compute_change_stats_for_window(
        cls,
        tile_id: Any,
        from_year: int,
        to_year: int,
        bbox_wgs84: List[float],
        polygon_geom: Optional[Any] = None,
        location_id: Optional[str] = None,
        max_pixels: int = 1400
    ) -> Dict[str, Any]:
        """Computes pixel-wise change statistics, real 9x9 transition matrix, and top transitions."""
        cache_key = f"chg_{location_id.lower().strip()}_{from_year}_{to_year}_{max_pixels}_v2" if location_id else None
        if cache_key and cache_key in cls._change_cache:
            return cls._change_cache[cache_key]

        if location_id and cls.is_supabase_configured():
            sb_chg = cls._fetch_change_stats_from_supabase(location_id, from_year, to_year)
            if sb_chg is not None:
                if cache_key:
                    cls._change_cache[cache_key] = sb_chg
                return sb_chg

        if cache_key:
            chg_file = os.path.join(cls.get_stats_cache_dir(), f"{cache_key}.json")
            if os.path.exists(chg_file):
                try:
                    with open(chg_file, "r", encoding="utf-8") as f:
                        cached = json.load(f)
                        cls._change_cache[cache_key] = cached
                        return cached
                except Exception:
                    pass

        if polygon_geom is None and location_id:
            polygon_geom = cls.load_boundary_geometry(location_id)

        tiles_list = tile_id if isinstance(tile_id, list) else (["43P", "44P"] if isinstance(tile_id, str) and "43P" in tile_id and "44P" in tile_id else [tile_id or "44P"])
        min_lon, min_lat, max_lon, max_lat = bbox_wgs84
        is_dual = ("43P" in tiles_list and "44P" in tiles_list) and (min_lon < 78.0 < max_lon)

        class_items = sorted(bcfg.ESRI_CLASSES.items())
        class_ids = [cid for cid, _ in class_items]
        id_to_idx = {cid: idx for idx, cid in enumerate(class_ids)}
        n_cls = len(class_ids)
        matrix = np.zeros((n_cls, n_cls), dtype=np.int64)
        matrix_area = np.zeros((n_cls, n_cls), dtype=np.float64)

        def _accumulate_pair(d1: np.ndarray, d2: np.ndarray, px_area: float):
            mh = min(d1.shape[0], d2.shape[0])
            mw = min(d1.shape[1], d2.shape[1])
            a1 = d1[:mh, :mw]
            a2 = d2[:mh, :mw]
            valid = (a1 > 0) & (a2 > 0)
            v1 = a1[valid]
            v2 = a2[valid]
            # Vectorized 2D histogram over class pairs
            codes = v1.astype(np.int32) * 32 + v2.astype(np.int32)
            uniq_codes, counts = np.unique(codes, return_counts=True)
            for code, cnt in zip(uniq_codes, counts):
                c1 = int(code // 32)
                c2 = int(code % 32)
                i1 = id_to_idx.get(c1)
                i2 = id_to_idx.get(c2)
                if i1 is not None and i2 is not None:
                    matrix[i1, i2] += int(cnt)
                    matrix_area[i1, i2] += float(cnt) * px_area
            n_val = int(v1.size)
            n_chg = int(np.sum(v1 != v2))
            return n_val, n_chg, px_area

        if is_dual:
            west_box = box(-180, -90, 78.0, 90)
            east_box = box(78.0, -90, 180, 90)
            geom_w = polygon_geom.intersection(west_box) if polygon_geom else None
            geom_e = polygon_geom.intersection(east_box) if polygon_geom else None
            bbox_w = [min_lon, min_lat, min(78.0, max_lon), max_lat]
            bbox_e = [max(78.0, min_lon), min_lat, max_lon, max_lat]

            dw1, aw = cls._read_window_data("43P", from_year, bbox_w, max_pixels, geom_w)
            dw2, _ = cls._read_window_data("43P", to_year, bbox_w, max_pixels, geom_w)
            de1, ae = cls._read_window_data("44P", from_year, bbox_e, max_pixels, geom_e)
            de2, _ = cls._read_window_data("44P", to_year, bbox_e, max_pixels, geom_e)

            vw, cw, _ = _accumulate_pair(dw1, dw2, aw)
            ve, ce, _ = _accumulate_pair(de1, de2, ae)
            valid_pixels = vw + ve
            changed_pixels = cw + ce
            valid_area = float(np.sum(matrix_area))
            changed_area = float(np.sum(matrix_area) - np.trace(matrix_area))
            sampling_meters = round(math.sqrt(max(aw, ae) * 1_000_000.0), 1)
        else:
            single_tile = tiles_list[0] if tiles_list else ("43P" if min_lon < 78.0 else "44P")
            d1, px_area = cls._read_window_data(single_tile, from_year, bbox_wgs84, max_pixels, polygon_geom)
            d2, _ = cls._read_window_data(single_tile, to_year, bbox_wgs84, max_pixels, polygon_geom)
            valid_pixels, changed_pixels, _ = _accumulate_pair(d1, d2, px_area)
            valid_area = float(np.sum(matrix_area))
            changed_area = float(np.sum(matrix_area) - np.trace(matrix_area))
            sampling_meters = round(math.sqrt(px_area * 1_000_000.0), 1)

        unchanged_pixels = max(0, valid_pixels - changed_pixels)
        unchanged_area = max(0.0, valid_area - changed_area)
        change_pct = round((changed_pixels / valid_pixels * 100.0), 2) if valid_pixels > 0 else 0.0
        unchanged_pct = round((unchanged_pixels / valid_pixels * 100.0), 2) if valid_pixels > 0 else 0.0

        class_diffs = []
        for idx, (class_id, class_name) in enumerate(class_items):
            f_px = int(np.sum(matrix[idx, :]))
            t_px = int(np.sum(matrix[:, idx]))
            f_area = round(float(np.sum(matrix_area[idx, :])), 4)
            t_area = round(float(np.sum(matrix_area[:, idx])), 4)
            net_area = round(t_area - f_area, 4)
            pct_chg = round(((t_area - f_area) / f_area * 100.0), 2) if f_area > 0 else 0.0
            class_diffs.append({
                "class_id": class_id,
                "class_name": class_name,
                "from_pixels": f_px,
                "to_pixels": t_px,
                "net_change_pixels": t_px - f_px,
                "from_area_km2": f_area,
                "to_area_km2": t_area,
                "net_change_km2": net_area,
                "pct_change": pct_chg
            })

        # Real top off-diagonal transitions sorted by pixel count
        top_transitions = []
        for i in range(n_cls):
            for j in range(n_cls):
                if i == j:
                    continue
                cnt = int(matrix[i, j])
                if cnt > 0:
                    top_transitions.append({
                        "from_class": class_items[i][1],
                        "to_class": class_items[j][1],
                        "count": cnt,
                        "area_km2": round(float(matrix_area[i, j]), 4)
                    })
        top_transitions.sort(key=lambda x: x["count"], reverse=True)

        res_chg = {
            "from_year": from_year,
            "to_year": to_year,
            "valid_pixels": valid_pixels,
            "total_area_km2": round(valid_area, 4),
            "unchanged_pixels": unchanged_pixels,
            "unchanged_area_km2": round(unchanged_area, 4),
            "changed_pixels": changed_pixels,
            "changed_area_km2": round(changed_area, 4),
            "unchanged_percentage": unchanged_pct,
            "change_percentage": change_pct,
            "sampling_meters": sampling_meters,
            "class_diffs": class_diffs,
            "top_transitions": top_transitions[:12],
            "transition_matrix": matrix.tolist()
        }
        if cache_key:
            cls._change_cache[cache_key] = res_chg
            try:
                with open(os.path.join(cls.get_stats_cache_dir(), f"{cache_key}.json"), "w", encoding="utf-8") as f:
                    json.dump(res_chg, f)
            except Exception:
                pass
        return res_chg

    @classmethod
    def resolve_city_tile(cls, city: str) -> Union[str, List[str]]:
        conf = cls.get_city_config(city)
        if not conf:
            return "44P"
        tiles = conf.get("tiles") or conf.get("tile", "44P")
        if isinstance(tiles, list):
            return tiles
        return [tiles]

    @classmethod
    def get_city_preview_png(cls, city: str, layer_id: str) -> Optional[str]:
        """
        Generates or retrieves a cached RGBA PNG preview for Leaflet ImageOverlay.
        Supports:
          - esri_YYYY / dynamic_world_YYYY
          - change_YYYY_YYYY
          - transition_YYYY_YYYY
        Masks pixels outside the polygon boundary to transparent alpha (0).
        For dual-tile districts (43P + 44P), composites both tiles seamlessly.
        """
        city_conf = cls.get_city_config(city)
        if not city_conf:
            return None

        bbox = city_conf.get("bbox")
        if not bbox or len(bbox) != 4:
            return None

        tiles = city_conf.get("tiles") or city_conf.get("tile", ["44P"])
        if isinstance(tiles, str):
            tiles = [tiles]

        polygon_geom = cls.load_boundary_geometry(city_conf)
        preview_dir = cls.get_preview_dir()

        cache_name = f"{city.lower()}_{layer_id}.png"
        cache_path = os.path.join(preview_dir, cache_name)
        if os.path.exists(cache_path) and os.path.getsize(cache_path) > 0:
            return cache_path

        min_lon, min_lat, max_lon, max_lat = bbox
        is_dual = ("43P" in tiles and "44P" in tiles) or (min_lon < 78.0 < max_lon and len(tiles) > 1)

        target_w = 1000
        target_h = max(200, int(target_w * (max_lat - min_lat) / max(0.01, (max_lon - min_lon))))

        try:
            if is_dual:
                # Dual-tile compositing
                west_box = box(-180, -90, 78.0, 90)
                east_box = box(78.0, -90, 180, 90)

                geom_w = polygon_geom.intersection(west_box) if polygon_geom else None
                geom_e = polygon_geom.intersection(east_box) if polygon_geom else None

                split_x = max(1, min(target_w - 1, int((78.0 - min_lon) / (max_lon - min_lon) * target_w)))
                bbox_w = [min_lon, min_lat, 78.0, max_lat]
                bbox_e = [78.0, min_lat, max_lon, max_lat]

                if "change_" in layer_id:
                    parts = layer_id.replace("change_", "").split("_")
                    y1, y2 = int(parts[0]), int(parts[1])

                    dw1, _ = cls._read_window_data("43P", y1, bbox_w, max_pixels=600, polygon_geom=geom_w)
                    dw2, _ = cls._read_window_data("43P", y2, bbox_w, max_pixels=600, polygon_geom=geom_w)
                    de1, _ = cls._read_window_data("44P", y1, bbox_e, max_pixels=600, polygon_geom=geom_e)
                    de2, _ = cls._read_window_data("44P", y2, bbox_e, max_pixels=600, polygon_geom=geom_e)

                    # West change
                    mh_w = min(dw1.shape[0], dw2.shape[0])
                    mw_w = min(dw1.shape[1], dw2.shape[1])
                    chg_w = (dw1[:mh_w, :mw_w] > 0) & (dw2[:mh_w, :mw_w] > 0) & (dw1[:mh_w, :mw_w] != dw2[:mh_w, :mw_w])
                    rgba_w = np.zeros((mh_w, mw_w, 4), dtype=np.uint8)
                    rgba_w[chg_w] = (239, 68, 68, 245)
                    img_w = Image.fromarray(rgba_w).resize((split_x, target_h), resample=Image.NEAREST)

                    # East change
                    mh_e = min(de1.shape[0], de2.shape[0])
                    mw_e = min(de1.shape[1], de2.shape[1])
                    chg_e = (de1[:mh_e, :mw_e] > 0) & (de2[:mh_e, :mw_e] > 0) & (de1[:mh_e, :mw_e] != de2[:mh_e, :mw_e])
                    rgba_e = np.zeros((mh_e, mw_e, 4), dtype=np.uint8)
                    rgba_e[chg_e] = (239, 68, 68, 245)
                    img_e = Image.fromarray(rgba_e).resize((target_w - split_x, target_h), resample=Image.NEAREST)

                elif "transition_" in layer_id:
                    parts = layer_id.replace("transition_", "").split("_")
                    y1, y2 = int(parts[0]), int(parts[1])

                    dw1, _ = cls._read_window_data("43P", y1, bbox_w, max_pixels=600, polygon_geom=geom_w)
                    dw2, _ = cls._read_window_data("43P", y2, bbox_w, max_pixels=600, polygon_geom=geom_w)
                    de1, _ = cls._read_window_data("44P", y1, bbox_e, max_pixels=600, polygon_geom=geom_e)
                    de2, _ = cls._read_window_data("44P", y2, bbox_e, max_pixels=600, polygon_geom=geom_e)

                    mh_w = min(dw1.shape[0], dw2.shape[0])
                    mw_w = min(dw1.shape[1], dw2.shape[1])
                    rgba_w = np.zeros((mh_w, mw_w, 4), dtype=np.uint8)
                    d1_w = dw1[:mh_w, :mw_w]
                    d2_w = dw2[:mh_w, :mw_w]
                    rgba_w[(d1_w != 7) & (d2_w == 7) & (d1_w > 0)] = (220, 38, 38, 245) # Urban
                    rgba_w[(d1_w == 2) & (d2_w != 2) & (d2_w > 0)] = (245, 158, 11, 245) # Tree loss
                    rgba_w[(d1_w == 1) & (d2_w != 1) & (d2_w > 0)] = (59, 130, 246, 245) # Water
                    img_w = Image.fromarray(rgba_w).resize((split_x, target_h), resample=Image.NEAREST)

                    mh_e = min(de1.shape[0], de2.shape[0])
                    mw_e = min(de1.shape[1], de2.shape[1])
                    rgba_e = np.zeros((mh_e, mw_e, 4), dtype=np.uint8)
                    d1_e = de1[:mh_e, :mw_e]
                    d2_e = de2[:mh_e, :mw_e]
                    rgba_e[(d1_e != 7) & (d2_e == 7) & (d1_e > 0)] = (220, 38, 38, 245)
                    rgba_e[(d1_e == 2) & (d2_e != 2) & (d2_e > 0)] = (245, 158, 11, 245)
                    rgba_e[(d1_e == 1) & (d2_e != 1) & (d2_e > 0)] = (59, 130, 246, 245)
                    img_e = Image.fromarray(rgba_e).resize((target_w - split_x, target_h), resample=Image.NEAREST)

                else:
                    year_str = "".join([c for c in layer_id if c.isdigit()])
                    year = int(year_str) if year_str else 2025

                    dw, _ = cls._read_window_data("43P", year, bbox_w, max_pixels=600, polygon_geom=geom_w)
                    de, _ = cls._read_window_data("44P", year, bbox_e, max_pixels=600, polygon_geom=geom_e)

                    rgba_w = np.zeros((dw.shape[0], dw.shape[1], 4), dtype=np.uint8)
                    for k, col in ESRI_RGBA_PALETTE.items():
                        rgba_w[dw == k] = col
                    img_w = Image.fromarray(rgba_w).resize((split_x, target_h), resample=Image.NEAREST)

                    rgba_e = np.zeros((de.shape[0], de.shape[1], 4), dtype=np.uint8)
                    for k, col in ESRI_RGBA_PALETTE.items():
                        rgba_e[de == k] = col
                    img_e = Image.fromarray(rgba_e).resize((target_w - split_x, target_h), resample=Image.NEAREST)

                final_img = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
                final_img.paste(img_w, (0, 0))
                final_img.paste(img_e, (split_x, 0))
                final_img.save(cache_path, compress_level=1)
                return cache_path

            # Single tile branch
            tile_id = tiles[0] if tiles else ("43P" if min_lon < 78.0 else "44P")

            if "change_" in layer_id:
                parts = layer_id.replace("change_", "").split("_")
                y1, y2 = int(parts[0]), int(parts[1])
                data1, _ = cls._read_window_data(tile_id, y1, bbox, max_pixels=1000, polygon_geom=polygon_geom)
                data2, _ = cls._read_window_data(tile_id, y2, bbox, max_pixels=1000, polygon_geom=polygon_geom)

                min_h = min(data1.shape[0], data2.shape[0])
                min_w = min(data1.shape[1], data2.shape[1])
                d1 = data1[:min_h, :min_w]
                d2 = data2[:min_h, :min_w]

                changed = (d1 > 0) & (d2 > 0) & (d1 != d2)
                rgba = np.zeros((min_h, min_w, 4), dtype=np.uint8)
                rgba[changed] = (239, 68, 68, 245) # Bright red
                img = Image.fromarray(rgba)
                img.save(cache_path, compress_level=1)
                return cache_path

            elif "transition_" in layer_id:
                parts = layer_id.replace("transition_", "").split("_")
                y1, y2 = int(parts[0]), int(parts[1])
                data1, _ = cls._read_window_data(tile_id, y1, bbox, max_pixels=1000, polygon_geom=polygon_geom)
                data2, _ = cls._read_window_data(tile_id, y2, bbox, max_pixels=1000, polygon_geom=polygon_geom)
                min_h = min(data1.shape[0], data2.shape[0])
                min_w = min(data1.shape[1], data2.shape[1])
                d1 = data1[:min_h, :min_w]
                d2 = data2[:min_h, :min_w]

                rgba = np.zeros((min_h, min_w, 4), dtype=np.uint8)
                rgba[(d1 != 7) & (d2 == 7) & (d1 > 0)] = (220, 38, 38, 245) # Red
                rgba[(d1 == 2) & (d2 != 2) & (d2 > 0)] = (245, 158, 11, 245) # Amber
                rgba[(d1 == 1) & (d2 != 1) & (d2 > 0)] = (59, 130, 246, 245) # Blue

                img = Image.fromarray(rgba)
                img.save(cache_path, compress_level=1)
                return cache_path

            else:
                year_str = "".join([c for c in layer_id if c.isdigit()])
                year = int(year_str) if year_str else 2025
                data, _ = cls._read_window_data(tile_id, year, bbox, max_pixels=1000, polygon_geom=polygon_geom)

                h, w = data.shape
                rgba = np.zeros((h, w, 4), dtype=np.uint8)
                for k, col in ESRI_RGBA_PALETTE.items():
                    rgba[data == k] = col

                img = Image.fromarray(rgba)
                img.save(cache_path, compress_level=1)
                return cache_path

        except Exception as e:
            logger.error(f"Failed to generate preview PNG for {city} {layer_id}: {e}")
            return None

    @classmethod
    def get_overview_summary(cls) -> Dict[str, Any]:
        """
        Aggregates real 2019-2025 statewide Tamil Nadu land cover metrics across the 38 districts
        (excluding aggregate CMA to avoid double counting), plus top-5 built-area growth districts
        and top-5 changed classes. Cached in memory and on disk for instant loads.
        """
        if cls._overview_summary_cache is not None:
            return cls._overview_summary_cache

        cache_path = os.path.join(cls.get_stats_cache_dir(), "overview_summary_v1.json")
        if os.path.exists(cache_path):
            try:
                with open(cache_path, "r", encoding="utf-8") as f:
                    cached = json.load(f)
                    cls._overview_summary_cache = cached
                    return cached
            except Exception:
                pass

        hierarchy = cls.get_hierarchy()
        districts_dict = hierarchy.get("districts", {})
        # Exclude aggregate regions like Chennai Metropolitan Area from statewide sum
        district_names = [
            k for k in districts_dict.keys()
            if "metropolitan" not in k.lower()
        ]
        years = sorted(bcfg.ESRI_YEARS)
        first_year, last_year = years[0], years[-1]

        valid_districts: List[Tuple[str, Dict[str, Any]]] = []
        for d_name in district_names:
            conf = cls.get_city_config(d_name)
            if conf:
                valid_districts.append((d_name, conf))

        bulk_stats: Dict[Tuple[str, int], Dict[str, Any]] = {}
        if cls.is_supabase_configured() and valid_districts:
            bulk_stats = cls._fetch_bulk_year_stats_from_supabase(
                [d_name for d_name, _ in valid_districts],
                years,
            )
            for (loc_norm, yr), st_val in bulk_stats.items():
                cls._stats_cache[f"{loc_norm}_{yr}_700_v2"] = st_val

        # Aggregate area per year per class across all 38 districts
        yearly_totals: Dict[int, Dict[str, float]] = {y: {cname: 0.0 for cname in bcfg.ESRI_CLASSES.values()} for y in years}
        yearly_area_sum: Dict[int, float] = {y: 0.0 for y in years}
        built_growth_rows = []

        for d_name, conf in valid_districts:
            tiles = conf.get("tiles") or conf.get("tile", ["44P"])
            bbox = conf["bbox"]
            loc_norm = d_name.lower().strip()

            d_2019_built = 0.0
            d_2019_total = 0.0
            d_2025_built = 0.0
            d_2025_total = 0.0

            for y in years:
                st = bulk_stats.get((loc_norm, y))
                if st is None:
                    st = cls.compute_stats_for_window(tiles, y, bbox, max_pixels=700, location_id=d_name)
                tot_km2 = float(st.get("total_area_km2", 0.0))
                yearly_area_sum[y] += tot_km2
                for c in st.get("classes", []):
                    cname = c["class_name"]
                    c_km2 = float(c.get("area_km2", 0.0))
                    yearly_totals[y][cname] = yearly_totals[y].get(cname, 0.0) + c_km2
                    if cname == "Built Area":
                        if y == first_year:
                            d_2019_built = c_km2
                            d_2019_total = tot_km2
                        elif y == last_year:
                            d_2025_built = c_km2
                            d_2025_total = tot_km2

            if d_2019_total > 0 and d_2025_total > 0:
                pct_19 = (d_2019_built / d_2019_total) * 100.0
                pct_25 = (d_2025_built / d_2025_total) * 100.0
                built_growth_rows.append({
                    "district": d_name,
                    "built_2019_pct": round(pct_19, 2),
                    "built_2025_pct": round(pct_25, 2),
                    "growth_pp": round(pct_25 - pct_19, 2),
                    "growth_km2": round(d_2025_built - d_2019_built, 2),
                })

        built_growth_rows.sort(key=lambda x: x["growth_pp"], reverse=True)

        # Build 4 KPI cards (Built Area, Water, Crops, Trees) with 2019-2025 trend sparklines
        kpi_classes = ["Built Area", "Water", "Crops", "Trees"]
        color_by_name = {cname: bcfg.ESRI_COLORS.get(cid, "#CCCCCC") for cid, cname in bcfg.ESRI_CLASSES.items()}
        kpis = []
        for cname in kpi_classes:
            trend = []
            for y in years:
                tot = yearly_area_sum[y] or 1.0
                area = yearly_totals[y].get(cname, 0.0)
                trend.append({
                    "year": y,
                    "share_pct": round((area / tot) * 100.0, 2),
                    "area_km2": round(area, 1),
                })
            s19 = trend[0]
            s25 = trend[-1]
            kpis.append({
                "class_name": cname,
                "color": color_by_name.get(cname, "#CCCCCC"),
                "share_2025_pct": s25["share_pct"],
                "area_2025_km2": s25["area_km2"],
                "share_2019_pct": s19["share_pct"],
                "area_2019_km2": s19["area_km2"],
                "change_pp": round(s25["share_pct"] - s19["share_pct"], 2),
                "change_km2": round(s25["area_km2"] - s19["area_km2"], 1),
                "trend": trend,
            })

        # Top 5 changed classes statewide
        tot19 = yearly_area_sum[first_year] or 1.0
        tot25 = yearly_area_sum[last_year] or 1.0
        class_changes = []
        for cname in bcfg.ESRI_CLASSES.values():
            a19 = yearly_totals[first_year].get(cname, 0.0)
            a25 = yearly_totals[last_year].get(cname, 0.0)
            p19 = (a19 / tot19) * 100.0
            p25 = (a25 / tot25) * 100.0
            if a19 > 0 or a25 > 0:
                class_changes.append({
                    "class_name": cname,
                    "color": color_by_name.get(cname, "#CCCCCC"),
                    "share_2019_pct": round(p19, 2),
                    "share_2025_pct": round(p25, 2),
                    "change_pp": round(p25 - p19, 2),
                    "change_km2": round(a25 - a19, 1),
                })
        class_changes.sort(key=lambda x: abs(x["change_pp"]), reverse=True)

        version_file = os.path.join(bcfg.WORKSPACE_ROOT, "VERSION")
        app_version = "N/A"
        if os.path.exists(version_file):
            try:
                with open(version_file, "r", encoding="utf-8") as vf:
                    app_version = vf.read().strip()
            except Exception:
                pass

        result = {
            "district_count": len(district_names),
            "years": years,
            "first_year": first_year,
            "last_year": last_year,
            "total_area_km2": round(tot25, 1),
            "kpis": kpis,
            "top_built_growth": built_growth_rows[:5],
            "top_changed_classes": class_changes[:5],
            "system_info": {
                "version": app_version,
                "tiles": ["43P", "44P"],
                "model_name": bcfg.MODEL_NAME,
                "input_tensor": f"3 × {bcfg.IMAGE_SIZE} × {bcfg.IMAGE_SIZE}",
                "resnet_num_classes": bcfg.NUM_CLASSES,
                "resnet_classes": list(bcfg.CLASS_NAMES),
                "esri_classes": [
                    {"id": cid, "name": cname, "color": bcfg.ESRI_COLORS.get(cid, "#CCCCCC")}
                    for cid, cname in sorted(bcfg.ESRI_CLASSES.items())
                ],
            },
        }
        cls._overview_summary_cache = result
        try:
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(result, f)
        except Exception:
            pass
        return result

    @classmethod
    def get_visual_resource_info(cls) -> Dict[str, Any]:
        gif_path = os.path.join(bcfg.PROJECT_ROOT, "app", "static", "images", "esri_tamil_nadu_2019_2025.gif")
        if os.path.exists(gif_path):
            size_mb = os.path.getsize(gif_path) / (1024 * 1024)
            file_url = "/static/images/esri_tamil_nadu_2019_2025.gif"
        else:
            size_mb = 0.0
            file_url = cls.resolve_r2_url("visuals/esri_tamil_nadu_2019_2025.gif") or "/static/images/esri_tamil_nadu_2019_2025.gif"

        return {
            "title": "Tamil Nadu Regional Land Cover Timelapse (2019–2025)",
            "resource_type": "animated_gif",
            "file_url": file_url,
            "file_size_mb": round(size_mb, 2),
            "years_covered": bcfg.ESRI_YEARS,
            "spatial_coverage": "Tamil Nadu State & South India (Tiles 43P & 44P)",
            "description": "7-year annual time-lapse synthesized from Esri 10m Land Use Land Cover Sentinel-2 classification."
        }
