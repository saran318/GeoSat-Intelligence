"""
Seed Supabase with Esri region hierarchy and cached year-stats JSONs.
Does NOT delete any local JSON files.

Usage:
  python scripts/seed_supabase.py --dry-run
  python scripts/seed_supabase.py
"""

import argparse
import json
import os
import re
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

FILENAME_RE = re.compile(r"^(.+?)_(\d{4})_(.+)\.json$")
CHANGE_FILENAME_RE = re.compile(r"^chg_(.+?)_(\d{4})_(\d{4})_(.+)\.json$")


def load_regions():
    config_path = PROJECT_ROOT / "config" / "esri_regions.json"
    with open(config_path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    rows = []
    for group_key, level_name in (
        ("regions", "region"),
        ("states", "state"),
        ("districts", "district"),
        ("cities", "city"),
    ):
        for loc_id, entry in raw.get(group_key, {}).items():
            tile_val = entry.get("tile") or entry.get("tiles", ["44P"])
            tile_str = ", ".join(tile_val) if isinstance(tile_val, list) else str(tile_val)
            rows.append({
                "id": loc_id,
                "name": entry.get("name", loc_id),
                "level": level_name,
                "parent": entry.get("state") or entry.get("district"),
                "tile": tile_str,
                "crs": entry.get("crs", "EPSG:32644"),
                "bbox": entry.get("bbox", []),
                "center": entry.get("center", []),
                "description": entry.get("description"),
            })
    return rows


def load_year_stats():
    cache_dir = PROJECT_ROOT / "data" / "esri_stats_cache"
    rows = []
    if not cache_dir.is_dir():
        return rows

    for path in sorted(cache_dir.glob("*.json")):
        if path.name.startswith("chg_") or path.name.startswith("overview_"):
            continue
        m = FILENAME_RE.match(path.name)
        if not m:
            continue
        loc_id, year_str, _suffix = m.groups()
        with open(path, "r", encoding="utf-8") as f:
            payload = json.load(f)
        rows.append({
            "location_id": loc_id,
            "year": int(year_str),
            "cache_key": path.stem,
            "total_pixels": int(payload.get("total_pixels", 0)),
            "total_area_km2": float(payload.get("total_area_km2", 0.0)),
            "classes": payload.get("classes", []),
        })
    return rows


def load_change_stats():
    cache_dir = PROJECT_ROOT / "data" / "esri_stats_cache"
    by_key = {}
    if not cache_dir.is_dir():
        return []

    for path in sorted(cache_dir.glob("chg_*.json")):
        m = CHANGE_FILENAME_RE.match(path.name)
        if not m:
            continue
        loc_id, from_str, to_str, suffix = m.groups()
        key = (loc_id, int(from_str), int(to_str))
        # Prefer 1400_v2 over lower-resolution caches if both exist
        if key in by_key and "1400" not in suffix:
            continue
        with open(path, "r", encoding="utf-8") as f:
            payload = json.load(f)
        by_key[key] = {
            "location_id": loc_id,
            "from_year": int(from_str),
            "to_year": int(to_str),
            "total_pixels": int(payload.get("valid_pixels", 0)),
            "changed_pixels": int(payload.get("changed_pixels", 0)),
            "unchanged_pixels": int(payload.get("unchanged_pixels", 0)),
            "change_percentage": float(payload.get("change_percentage", 0.0)),
            "classes": payload.get("class_diffs", []),
            "transitions": {
                "total_area_km2": float(payload.get("total_area_km2", 0.0)),
                "unchanged_area_km2": float(payload.get("unchanged_area_km2", 0.0)),
                "changed_area_km2": float(payload.get("changed_area_km2", 0.0)),
                "unchanged_percentage": float(payload.get("unchanged_percentage", 0.0)),
                "sampling_meters": float(payload.get("sampling_meters", 10.0)),
                "top_transitions": payload.get("top_transitions", []),
                "transition_matrix": payload.get("transition_matrix", []),
            },
        }
    return list(by_key.values())


def main():
    parser = argparse.ArgumentParser(description="Seed Supabase with GeoSat Esri analytics")
    parser.add_argument("--dry-run", action="store_true", help="Parse and count rows without writing to Supabase")
    args = parser.parse_args()

    region_rows = load_regions()
    stat_rows = load_year_stats()
    change_rows = load_change_stats()
    print(
        f"Prepared {len(region_rows)} region rows, "
        f"{len(stat_rows)} year-stat rows, and {len(change_rows)} change-stat rows."
    )

    if args.dry_run:
        return

    from supabase import create_client

    url = os.environ["SUPABASE_URL"]
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.environ["SUPABASE_KEY"]
    client = create_client(url, key)

    if region_rows:
        client.table("esri_regions").upsert(region_rows, on_conflict="id").execute()
        print(f"Upserted {len(region_rows)} regions.")

    batch_size = 100
    for i in range(0, len(stat_rows), batch_size):
        batch = stat_rows[i : i + batch_size]
        client.table("esri_year_stats").upsert(batch, on_conflict="cache_key").execute()
    print(f"Upserted {len(stat_rows)} year-stat rows.")

    for i in range(0, len(change_rows), batch_size):
        batch = change_rows[i : i + batch_size]
        client.table("esri_change_stats").upsert(batch, on_conflict="location_id,from_year,to_year").execute()
    print(f"Upserted {len(change_rows)} change-stat rows.")


if __name__ == "__main__":
    main()
