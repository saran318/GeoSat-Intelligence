import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.append(project_root)

import backend_config as bcfg
from scripts.download_dynamic_world import download_dynamic_world_data
from scripts.detect_change_dynamic_world import detect_change


TARGET_CITIES = [
    "Bengaluru", "Hyderabad", "Mumbai", "Delhi", "Kolkata",
    "Pune", "Ahmedabad", "Jaipur", "Surat", "Coimbatore", "Chennai",
]


def load_city_config():
    with open(os.path.join(project_root, "config", "cities.json"), "r", encoding="utf-8") as f:
        return json.load(f)


def valid_mode_raster(city, year):
    path = os.path.join(
        bcfg.PROJECT_ROOT, "data", "results", city,
        "dynamic_world", str(year), "mode",
        f"dynamic_world_{year}_mode.tif",
    )
    return path if os.path.exists(path) and os.path.getsize(path) > 0 else None


def process_city(city, years):
    city_report = {
        "city": city,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "annual": {},
        "change": {},
        "failures": [],
    }

    for year in years:
        year_path = valid_mode_raster(city, year)
        if year_path:
            city_report["annual"][str(year)] = {
                "status": "completed",
                "resumed": True,
                "path": year_path,
            }
            continue

        started = time.time()
        try:
            output_dir = os.path.join(
                bcfg.PROJECT_ROOT, "data", "results", city,
                "dynamic_world", str(year),
            )
            download_dynamic_world_data(city, year, output_dir, method="mode")
            elapsed = time.time() - started
            city_report["annual"][str(year)] = {
                "status": "completed",
                "resumed": False,
                "processing_time_s": round(elapsed, 2),
                "path": valid_mode_raster(city, year),
            }
        except Exception as exc:
            elapsed = time.time() - started
            city_report["annual"][str(year)] = {
                "status": "failed",
                "processing_time_s": round(elapsed, 2),
            }
            city_report["failures"].append({
                "stage": "annual",
                "year": year,
                "error": str(exc),
            })

    for year1, year2 in zip(years, years[1:]):
        change_dir = os.path.join(
            bcfg.PROJECT_ROOT, "data", "results", city,
            "dynamic_world", "change", f"{year1}_{year2}",
        )
        change_tif = os.path.join(change_dir, f"change_{year1}_{year2}.tif")
        transition_tif = os.path.join(change_dir, f"transition_{year1}_{year2}.tif")
        if os.path.exists(change_tif) and os.path.exists(transition_tif):
            city_report["change"][f"{year1}_{year2}"] = {
                "status": "completed",
                "resumed": True,
            }
            continue

        if not valid_mode_raster(city, year1) or not valid_mode_raster(city, year2):
            city_report["change"][f"{year1}_{year2}"] = {
                "status": "skipped",
                "reason": "missing annual composite",
            }
            continue

        try:
            report = detect_change(city, year1, year2)
            city_report["change"][f"{year1}_{year2}"] = {
                "status": "completed",
                "resumed": False,
                "performance": report["performance"],
            }
        except Exception as exc:
            city_report["change"][f"{year1}_{year2}"] = {
                "status": "failed",
                "error": str(exc),
            }
            city_report["failures"].append({
                "stage": "change",
                "period": f"{year1}_{year2}",
                "error": str(exc),
            })

    city_report["completed_at"] = datetime.now(timezone.utc).isoformat()
    report_dir = os.path.join(
        bcfg.PROJECT_ROOT, "data", "results", city, "dynamic_world",
    )
    os.makedirs(report_dir, exist_ok=True)
    report_path = os.path.join(report_dir, "processing_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(city_report, f, indent=2)
    return city_report


def main():
    parser = argparse.ArgumentParser(description="Process Dynamic World cities sequentially")
    parser.add_argument("--cities", nargs="*", default=None)
    parser.add_argument("--start-year", type=int, default=2019)
    parser.add_argument("--end-year", type=int, default=2025)
    args = parser.parse_args()

    city_config = load_city_config()
    requested = args.cities or TARGET_CITIES
    years = list(range(args.start_year, args.end_year + 1))

    batch_report = {
        "started_at": datetime.now(timezone.utc).isoformat(),
        "cities": {},
        "failures": [],
    }
    for city in requested:
        if city not in city_config:
            batch_report["failures"].append({
                "stage": "configuration",
                "city": city,
                "error": "City not found in config/cities.json",
            })
            continue
        print(f"=== Processing {city} {args.start_year}-{args.end_year} ===")
        batch_report["cities"][city] = process_city(city, years)

    batch_report["completed_at"] = datetime.now(timezone.utc).isoformat()
    report_path = os.path.join(
        bcfg.PROJECT_ROOT, "data", "results", "processing_report_dynamic_world.json",
    )
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(batch_report, f, indent=2)
    print(f"Batch report saved to {report_path}")


if __name__ == "__main__":
    main()
