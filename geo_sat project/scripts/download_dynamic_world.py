import os
import sys
import argparse
import time
import json
import rasterio
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap
from typing import Dict, List, Tuple

# Ensure project root is in system path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.append(project_root)

import backend_config as bcfg
import utils

# Reuse existing GEE logic
from scripts.download_gee import (
    initialize_gee,
    download_region_recursive,
    merge_tiles,
    _validate_geotiff
)

logger = utils.get_logger(__name__)

# Dynamic World Class Metadata
DW_CLASSES = {
    0: {"name": "Water", "color": "#419BDF"},
    1: {"name": "Trees", "color": "#397D49"},
    2: {"name": "Grass", "color": "#88B053"},
    3: {"name": "Flooded vegetation", "color": "#7A87C6"},
    4: {"name": "Crops", "color": "#E49635"},
    5: {"name": "Shrub & scrub", "color": "#DFC35A"},
    6: {"name": "Built", "color": "#C4281B"},
    7: {"name": "Bare", "color": "#A59B8F"},
    8: {"name": "Snow & ice", "color": "#B39FE1"}
}

# The ordered probability bands in GOOGLE/DYNAMICWORLD/V1
PROBABILITY_BANDS = [
    'water', 'trees', 'grass', 'flooded_vegetation', 'crops',
    'shrub_and_scrub', 'built', 'bare', 'snow_and_ice'
]

def load_city_roi(city_name: str) -> List[float]:
    cities_file = os.path.join(bcfg.PROJECT_ROOT, "config", "cities.json")
    with open(cities_file, 'r') as f:
        cities = json.load(f)
    for name, data in cities.items():
        if name.lower() == city_name.lower():
            return data["bbox"]
    raise ValueError(f"City '{city_name}' not found.")

def generate_validation_png(data: np.ndarray, out_png_path: str):
    """Generates a color-mapped PNG for visual validation. Nodata (255) becomes transparent."""
    # Nodata color (transparent/white for visual)
    colors = [DW_CLASSES[i]["color"] for i in range(9)]
    cmap = ListedColormap(colors)
    cmap.set_bad(color='white', alpha=0)
    
    masked_data = np.ma.masked_where(data == 255, data)
    plt.figure(figsize=(10, 10))
    plt.imshow(masked_data, cmap=cmap, vmin=0, vmax=8, interpolation='nearest')
    plt.axis('off')
    plt.savefig(out_png_path, bbox_inches='tight', pad_inches=0, dpi=300, transparent=True)
    plt.close()

def generate_disagreement_png(mode_data: np.ndarray, prob_data: np.ndarray, out_png_path: str):
    """Generates a map highlighting pixels where mode != probability."""
    valid_mask = (mode_data != 255) & (prob_data != 255)
    disagreement_mask = (mode_data != prob_data) & valid_mask
    
    # 0 = agreement, 1 = disagreement, masked = nodata
    result = np.zeros_like(mode_data, dtype=np.uint8)
    result[disagreement_mask] = 1
    
    masked_result = np.ma.masked_where(~valid_mask, result)
    
    cmap = ListedColormap(['#E0E0E0', '#FF0000']) # Grey for agreement, Red for disagreement
    cmap.set_bad(color='white', alpha=0)
    
    plt.figure(figsize=(10, 10))
    plt.imshow(masked_result, cmap=cmap, vmin=0, vmax=1, interpolation='nearest')
    plt.axis('off')
    plt.savefig(out_png_path, bbox_inches='tight', pad_inches=0, dpi=300, transparent=True)
    plt.close()

def compute_statistics(data: np.ndarray) -> Dict:
    valid_mask = data != 255
    invalid_count = np.sum(~valid_mask)
    valid_pixels = data[valid_mask]
    total_valid = valid_pixels.size
    
    counts = np.bincount(valid_pixels, minlength=9) if total_valid > 0 else np.zeros(9, dtype=int)
    
    dist = {}
    for i in range(9):
        dist[str(i)] = {
            "name": DW_CLASSES[i]["name"],
            "count": int(counts[i]),
            "percentage": round(float(counts[i] / total_valid * 100), 2) if total_valid > 0 else 0.0
        }
    
    return {
        "nodata_count": int(invalid_count),
        "total_valid_pixels": int(total_valid),
        "class_distribution": dist
    }

def verify_grid_alignment(src1, src2):
    assert src1.crs == src2.crs, "CRS mismatch"
    assert src1.width == src2.width, "Width mismatch"
    assert src1.height == src2.height, "Height mismatch"
    assert src1.transform == src2.transform, "Transform mismatch"
    assert src1.bounds == src2.bounds, "Bounds mismatch"
    assert src1.res == src2.res, "Resolution mismatch"
    assert src1.count == src2.count, "Band count mismatch"
    assert src1.dtypes == src2.dtypes, "Datatype mismatch"
    assert src1.nodata == src2.nodata, "Nodata mismatch"

def compare_methods(mode_path: str, prob_path: str, output_dir: str):
    logger.info("Comparing Mode and Probability rasters...")
    
    with rasterio.open(mode_path) as mode_src, rasterio.open(prob_path) as prob_src:
        verify_grid_alignment(mode_src, prob_src)
        
        mode_data = mode_src.read(1)
        prob_data = prob_src.read(1)
        
        mode_stats = compute_statistics(mode_data)
        prob_stats = compute_statistics(prob_data)
        
        valid_mask = (mode_data != 255) & (prob_data != 255)
        total_valid = np.sum(valid_mask)
        
        agreement_mask = (mode_data == prob_data) & valid_mask
        agreement_count = np.sum(agreement_mask)
        disagreement_count = total_valid - agreement_count
        
        agreement_pct = (agreement_count / total_valid * 100) if total_valid > 0 else 0
        disagreement_pct = (disagreement_count / total_valid * 100) if total_valid > 0 else 0
        
        # Transition Matrix (Rows: Mode, Cols: Probability)
        # Bincount on 2D mapping mode*9 + prob
        transitions = np.zeros((9, 9), dtype=int)
        if total_valid > 0:
            flat_mode = mode_data[valid_mask].astype(int)
            flat_prob = prob_data[valid_mask].astype(int)
            idx = flat_mode * 9 + flat_prob
            counts = np.bincount(idx, minlength=81)
            transitions = counts.reshape(9, 9)
            
        trans_dict = {}
        for m_class in range(9):
            trans_dict[str(m_class)] = {}
            for p_class in range(9):
                trans_dict[str(m_class)][str(p_class)] = int(transitions[m_class, p_class])
                
        # Visual Validation
        generate_validation_png(mode_data, mode_path.replace(".tif", ".png"))
        generate_validation_png(prob_data, prob_path.replace(".tif", ".png"))
        generate_disagreement_png(mode_data, prob_data, os.path.join(output_dir, "disagreement.png"))
        
        return {
            "mode": {
                "output_path": mode_path,
                **mode_stats
            },
            "probability": {
                "output_path": prob_path,
                **prob_stats
            },
            "comparison": {
                "total_valid_pixels": int(total_valid),
                "agreement_pixels": int(agreement_count),
                "disagreement_pixels": int(disagreement_count),
                "agreement_percentage": round(float(agreement_pct), 2),
                "disagreement_percentage": round(float(disagreement_pct), 2),
                "transition_matrix": trans_dict
            },
            "grid": {
                "crs": str(mode_src.crs),
                "width": mode_src.width,
                "height": mode_src.height,
                "transform": [mode_src.transform.a, mode_src.transform.b, mode_src.transform.c,
                              mode_src.transform.d, mode_src.transform.e, mode_src.transform.f],
                "bounds": [mode_src.bounds.left, mode_src.bounds.bottom, mode_src.bounds.right, mode_src.bounds.top],
                "resolution": mode_src.res,
                "band_count": mode_src.count,
                "datatype": mode_src.dtypes[0],
                "nodata": mode_src.nodata
            }
        }

def download_dynamic_world_data(city: str, year: int, output_dir: str, method: str = "mode"):
    start_time_total = time.time()
    if not initialize_gee():
        raise RuntimeError("Google Earth Engine initialization failed.")
    import ee

    roi_bbox = load_city_roi(city)
    geometry = ee.Geometry.BBox(roi_bbox[0], roi_bbox[1], roi_bbox[2], roi_bbox[3])
    
    start_date = f"{year}-01-01"
    end_date = f"{year+1}-01-01"
    
    dw_collection = (
        ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
        .filterBounds(geometry)
        .filterDate(start_date, end_date)
    )
    
    count = dw_collection.size().getInfo()
    logger.info(f"Found {count} Dynamic World observations.")
    
    # Ensure band existence
    band_names = ee.Image(dw_collection.first()).bandNames().getInfo()
    missing_bands = [b for b in PROBABILITY_BANDS if b not in band_names]
    if missing_bands:
        raise ValueError(f"Missing expected probability bands: {missing_bands}")
    
    if method in ["mode", "compare"]:
        logger.info("Applying Mode strategy...")
        mode_composite = dw_collection.select('label').mode().uint8().unmask(255).clip(geometry)
    
    if method in ["prob", "compare"]:
        logger.info("Applying Probability strategy...")
        prob_mean = dw_collection.select(PROBABILITY_BANDS).mean()
        prob_composite = prob_mean.toArray().arrayArgmax().arrayGet([0]).uint8().unmask(255).clip(geometry)
    
    # Directories
    mode_dir = os.path.join(output_dir, "mode")
    prob_dir = os.path.join(output_dir, "probability")
    comp_dir = os.path.join(output_dir, "comparison")
    os.makedirs(mode_dir, exist_ok=True)
    os.makedirs(prob_dir, exist_ok=True)
    os.makedirs(comp_dir, exist_ok=True)
    
    mode_tif = os.path.join(mode_dir, f"dynamic_world_{year}_mode.tif")
    prob_tif = os.path.join(prob_dir, f"dynamic_world_{year}_probability.tif")
    
    TILE_SIZE_DEGREES = 0.05
    min_lon, min_lat, max_lon, max_lat = roi_bbox
    lon_steps = max(1, int((max_lon - min_lon) / TILE_SIZE_DEGREES) + 1)
    lat_steps = max(1, int((max_lat - min_lat) / TILE_SIZE_DEGREES) + 1)
    
    initial_tiles = []
    for i in range(lon_steps):
        for j in range(lat_steps):
            initial_tiles.append([
                min_lon + i * ((max_lon - min_lon) / lon_steps),
                min_lat + j * ((max_lat - min_lat) / lat_steps),
                min_lon + (i + 1) * ((max_lon - min_lon) / lon_steps),
                min_lat + (j + 1) * ((max_lat - min_lat) / lat_steps)
            ])
            
    # Tiling/download helper
    def download_and_merge(composite, output_tif, name_prefix):
        temp_dir = os.path.join(output_dir, f"tmp_{name_prefix}")
        os.makedirs(temp_dir, exist_ok=True)
        all_paths = []
        for t_idx, t_bbox in enumerate(initial_tiles):
            paths = download_region_recursive(
                band_image=composite,
                band_name=name_prefix,
                year=year,
                bbox=t_bbox,
                output_dir=temp_dir,
                tile_id=f"T{t_idx}",
                depth=0
            )
            all_paths.extend(paths)
        if merge_tiles(all_paths, output_tif):
            # Update nodata flag to 255 for the final tif (merge_tiles might not set it correctly if not present in gee export properly)
            with rasterio.open(output_tif, 'r+') as dst:
                dst.nodata = 255
            # Clean temp
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)
        else:
            raise IOError(f"Failed to merge tiles for {name_prefix}")
            
    start_download = time.time()
    if method in ["mode", "compare"]:
        logger.info("Downloading Mode Composite...")
        download_and_merge(mode_composite, mode_tif, "mode")
        with rasterio.open(mode_tif) as src:
            mode_stats = compute_statistics(src.read(1))
            
    if method in ["prob", "compare"]:
        logger.info("Downloading Probability Composite...")
        download_and_merge(prob_composite, prob_tif, "prob")
        with rasterio.open(prob_tif) as src:
            prob_stats = compute_statistics(src.read(1))
    download_time = time.time() - start_download
    
    comp_results = {}
    if method == "compare":
        start_comp = time.time()
        comp_results = compare_methods(mode_tif, prob_tif, comp_dir)
        comp_time = time.time() - start_comp
    else:
        comp_time = 0.0
        if method == "mode":
            comp_results = {"mode": {"output_path": mode_tif, **mode_stats}}
            with rasterio.open(mode_tif) as src:
                generate_validation_png(src.read(1), mode_tif.replace(".tif", ".png"))
        if method == "prob":
            comp_results = {"probability": {"output_path": prob_tif, **prob_stats}}
            with rasterio.open(prob_tif) as src:
                generate_validation_png(src.read(1), prob_tif.replace(".tif", ".png"))
    
    total_time = time.time() - start_time_total
    
    full_report = {
        "city": city,
        "year": year,
        "roi": roi_bbox,
        "date_range": [start_date, end_date],
        "observation_count": count,
        **comp_results,
        "performance": {
            "download_time_s": round(download_time, 2),
            "comparison_time_s": round(comp_time, 2),
            "total_time_s": round(total_time, 2)
        }
    }
    
    out_meta = os.path.join(mode_dir if method == "mode" else (prob_dir if method == "prob" else comp_dir), "metadata.json")
    with open(out_meta, "w") as f:
        json.dump(full_report, f, indent=4)
        
    logger.info("Dynamic World Processing Complete!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download Dynamic World Data")
    parser.add_argument("--city", type=str, required=True)
    parser.add_argument("--year", type=int, required=True)
    parser.add_argument("--method", type=str, choices=["mode", "prob", "compare"], default="mode", help="Download method (default: mode)")
    args = parser.parse_args()
    
    out_dir = os.path.join(bcfg.PROJECT_ROOT, "data", "results", args.city, "dynamic_world", str(args.year))
    download_dynamic_world_data(args.city, args.year, out_dir, method=args.method)
