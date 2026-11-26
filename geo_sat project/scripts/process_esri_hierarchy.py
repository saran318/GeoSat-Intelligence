"""
CLI Pipeline to process, clip, and analyze Esri 10m LULC data
for Regional, State, District, and City-level analysis.

Usage:
    python scripts/process_esri_hierarchy.py --list
    python scripts/process_esri_hierarchy.py --level city --name Chennai --stats-only
    python scripts/process_esri_hierarchy.py --level district --name Coimbatore --from-year 2019 --to-year 2025 --stats-only
    python scripts/process_esri_hierarchy.py --level city --name Madurai --clip --year 2025  # for future raster extraction
"""

import os
import sys
import json
import argparse
from typing import Optional

# Ensure project root is in system path
_SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(_SCRIPTS_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

import backend_config as bcfg
import utils
from app.services.esri_service import EsriService

logger = utils.get_logger(__name__)

def list_hierarchy():
    hierarchy = EsriService.get_hierarchy()
    print("==================================================")
    print(f"Dataset: {hierarchy.get('dataset')}")
    print(f"Years: {hierarchy.get('years')}")
    print("==================================================")
    for level in ["regions", "states", "districts", "cities"]:
        items = hierarchy.get(level, {})
        print(f"\n[{level.upper()}] ({len(items)} available):")
        for k, v in items.items():
            tile = v.get("tile") or v.get("tiles")
            bbox = v.get("bbox")
            print(f"  - {k} ({v.get('name')}): Tile={tile}, BBox={bbox}")

def run_stats(level: str, name: str, year: int):
    entry = EsriService.get_location_entry(level, name)
    if not entry:
        print(f"Error: {name} not found in {level} hierarchy.")
        return

    tile_target = entry.get("tile", "44P")
    if isinstance(tile_target, list):
        tile_target = tile_target[0]
    tile_id = "43P" if "43P" in str(tile_target) else "44P"

    print(f"Computing stats for {level.capitalize()} '{name}' (Year: {year}, Tile: {tile_id})...")
    stats = EsriService.compute_stats_for_window(tile_id, year, entry["bbox"])

    print(f"\nResults for {name} ({year}):")
    print(f"Total Area: {stats['total_area_km2']:.2f} km²")
    print("Class Breakdown:")
    for c in stats["classes"]:
        if c["area_km2"] > 0:
            print(f"  - {c['class_name']:<20}: {c['area_km2']:>8.2f} km² ({c['percentage']:>5.2f}%)")

def run_change(level: str, name: str, from_year: int, to_year: int):
    entry = EsriService.get_location_entry(level, name)
    if not entry:
        print(f"Error: {name} not found in {level} hierarchy.")
        return

    tile_target = entry.get("tile", "44P")
    if isinstance(tile_target, list):
        tile_target = tile_target[0]
    tile_id = "43P" if "43P" in str(tile_target) else "44P"

    print(f"Analyzing Change for {level.capitalize()} '{name}' ({from_year} -> {to_year})...")
    diff = EsriService.compute_change_stats_for_window(tile_id, from_year, to_year, entry["bbox"])

    print(f"\nNet Transition Analysis for {name} ({from_year} -> {to_year}):")
    print(f"Total Area: {diff['total_area_km2']:.2f} km²")
    print(f"Overall Changed Area Ratio: {diff['change_percentage']:.2f}%")
    print("Class Net Changes:")
    for d in diff["class_diffs"]:
        if abs(d["net_change_km2"]) > 0.01:
            sign = "+" if d["net_change_km2"] > 0 else ""
            print(f"  - {d['class_name']:<20}: {d['from_area_km2']:>7.2f} km² -> {d['to_area_km2']:>7.2f} km² ({sign}{d['net_change_km2']:>6.2f} km², {sign}{d['pct_change']:>5.1f}%)")

def main():
    parser = argparse.ArgumentParser(description="Esri Multi-Level Land Cover Analysis Engine")
    parser.add_argument("--list", action="store_true", help="List all hierarchy levels and entities")
    parser.add_argument("--level", type=str, choices=["region", "state", "district", "city"], default="city")
    parser.add_argument("--name", type=str, default="Chennai", help="Entity name (e.g. Chennai, Coimbatore, Tamil_Nadu)")
    parser.add_argument("--year", type=int, default=2025, help="Single year for analysis")
    parser.add_argument("--from-year", type=int, default=2019, help="Start year for change detection")
    parser.add_argument("--to-year", type=int, default=2025, help="End year for change detection")
    parser.add_argument("--stats-only", action="store_true", help="Run fast windowed stats without extracting full rasters")
    parser.add_argument("--clip", action="store_true", help="Clip full resolution raster subset (heavy processing)")

    args = parser.parse_args()

    if args.list:
        list_hierarchy()
        return

    if args.clip:
        print(f"[Notice] Clipping full 10m raster for {args.name} is configured for future execution. Bypassing heavy processing now.")
        return

    if args.from_year and args.to_year and args.from_year != args.to_year:
        run_change(args.level, args.name, args.from_year, args.to_year)
    else:
        run_stats(args.level, args.name, args.year)

if __name__ == "__main__":
    main()
