import os
import sys
import argparse
import time
import json
import numpy as np
import rasterio
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap

# Ensure project root is in system path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.append(project_root)

import backend_config as bcfg
import utils
from scripts.download_dynamic_world import DW_CLASSES, generate_validation_png

# Reuse existing change logic from diff_maps
from src.change_detection.diff_maps import generate_change_map

logger = utils.get_logger(__name__)

def strict_grid_validation(src1, src2):
    if src1.crs != src2.crs: raise ValueError("CRS mismatch")
    if src1.width != src2.width: raise ValueError("Width mismatch")
    if src1.height != src2.height: raise ValueError("Height mismatch")
    if src1.transform != src2.transform: raise ValueError("Transform mismatch")
    if src1.bounds != src2.bounds: raise ValueError("Bounds mismatch")
    if src1.res != src2.res: raise ValueError("Resolution mismatch")
    if src1.count != src2.count: raise ValueError("Band count mismatch")

def compute_area(pixel_count, res_x, res_y):
    # Extremely basic pixel area if it's in degrees vs meters.
    # The requirement said to report area if technically valid, else report explicit area.
    # Since DW output is in EPSG:4326, we don't calculate raw degree area. We will return 0 and omit it.
    return 0

def detect_change(city: str, year1: int, year2: int, out_dir: str = None):
    start_time = time.time()
    
    y1_path = os.path.join(bcfg.PROJECT_ROOT, "data", "results", city, "dynamic_world", str(year1), "mode", f"dynamic_world_{year1}_mode.tif")
    y2_path = os.path.join(bcfg.PROJECT_ROOT, "data", "results", city, "dynamic_world", str(year2), "mode", f"dynamic_world_{year2}_mode.tif")
    
    if not out_dir:
        out_dir = os.path.join(bcfg.PROJECT_ROOT, "data", "results", city, "dynamic_world", "change", f"{year1}_{year2}")
    
    os.makedirs(out_dir, exist_ok=True)
    
    if not os.path.exists(y1_path): raise FileNotFoundError(f"Missing {y1_path}")
    if not os.path.exists(y2_path): raise FileNotFoundError(f"Missing {y2_path}")

    # Validate
    with rasterio.open(y1_path) as src1, rasterio.open(y2_path) as src2:
        logger.info(f"Validating spatial grid between {year1} and {year2}...")
        strict_grid_validation(src1, src2)
        
        meta = src1.meta.copy()
        data1 = src1.read(1)
        data2 = src2.read(1)
        
    valid_mask_1 = (data1 != 255)
    valid_mask_2 = (data2 != 255)
    valid_both = valid_mask_1 & valid_mask_2
    
    invalid_mask_either = ~valid_both
    
    # Check for invalid class values in valid pixels
    invalid_vals_1 = np.unique(data1[valid_mask_1])
    invalid_vals_2 = np.unique(data2[valid_mask_2])
    
    for val in invalid_vals_1:
        if val > 8 and val != 255: raise ValueError(f"Invalid class value {val} in {year1}")
    for val in invalid_vals_2:
        if val > 8 and val != 255: raise ValueError(f"Invalid class value {val} in {year2}")
        
    start_change_time = time.time()
    logger.info("Computing binary change and transitions...")
    # generate_change_map returns (binary_change, transition_codes, changed_pixels)
    binary_change, transition_codes, changed_pixels = generate_change_map(data1, data2, nodata_val=255)
    
    # Overwrite nodata areas that were created by diff_maps which might not enforce strict "either is nodata" perfectly
    # diff_maps sets binary to 255 and transition to 65535 if EITHER is nodata (which is exactly what we want).
    binary_change[invalid_mask_either] = 255
    transition_codes[invalid_mask_either] = 65535
    
    change_time = time.time() - start_change_time
    
    start_stat_time = time.time()
    logger.info("Computing change statistics...")
    total_valid = np.sum(valid_both)
    changed_count = np.sum((binary_change == 1) & valid_both)
    unchanged_count = np.sum((binary_change == 0) & valid_both)
    
    dist1 = np.bincount(data1[valid_both], minlength=9)[:9]
    dist2 = np.bincount(data2[valid_both], minlength=9)[:9]
    
    # 9x9 Transition matrix (rows=year1, cols=year2)
    transitions_flat = transition_codes[valid_both]
    # transitions_flat are c1*100 + c2.
    transition_matrix = np.zeros((9, 9), dtype=int)
    for c1 in range(9):
        for c2 in range(9):
            code = c1 * 100 + c2
            transition_matrix[c1, c2] = np.sum(transitions_flat == code)
            
    # Gains, Losses, Net Change
    gains = np.sum(transition_matrix, axis=0) - np.diag(transition_matrix)
    losses = np.sum(transition_matrix, axis=1) - np.diag(transition_matrix)
    net_change = gains - losses
    
    # Top transitions
    top_trans = []
    for c1 in range(9):
        for c2 in range(9):
            if c1 != c2 and transition_matrix[c1, c2] > 0:
                top_trans.append({
                    "from": DW_CLASSES[c1]["name"],
                    "to": DW_CLASSES[c2]["name"],
                    "count": int(transition_matrix[c1, c2])
                })
    top_trans.sort(key=lambda x: x["count"], reverse=True)
    
    stat_time = time.time() - start_stat_time
    
    # Output rasters
    logger.info("Exporting output rasters...")
    bin_meta = meta.copy()
    bin_meta.update({"dtype": "uint8", "nodata": 255})
    bin_path = os.path.join(out_dir, f"change_{year1}_{year2}.tif")
    with rasterio.open(bin_path, 'w', **bin_meta) as dst:
        dst.write(binary_change.astype(np.uint8), 1)
        
    trans_meta = meta.copy()
    trans_meta.update({"dtype": "uint16", "nodata": 65535})
    trans_path = os.path.join(out_dir, f"transition_{year1}_{year2}.tif")
    with rasterio.open(trans_path, 'w', **trans_meta) as dst:
        dst.write(transition_codes.astype(np.uint16), 1)
        
    # Visualizations
    start_vis_time = time.time()
    logger.info("Generating visualizations...")
    # Binary change map
    cmap_bin = ListedColormap(['#E0E0E0', '#FF0000']) # 0=Grey (unchanged), 1=Red (changed)
    cmap_bin.set_bad(color='white', alpha=0)
    plt.figure(figsize=(10, 10))
    plt.imshow(np.ma.masked_where(binary_change == 255, binary_change), cmap=cmap_bin, vmin=0, vmax=1, interpolation='nearest')
    plt.axis('off')
    plt.savefig(os.path.join(out_dir, f"change_{year1}_{year2}.png"), bbox_inches='tight', pad_inches=0, dpi=300, transparent=True)
    plt.close()
    
    # Transition map visualization (basic representation of changed areas using Year 2 colors)
    # We display unchanged pixels as grey, and changed pixels as their new destination color.
    trans_vis = np.zeros_like(data2)
    trans_vis[binary_change == 0] = 9 # code 9 for unchanged (grey)
    trans_vis[binary_change == 1] = data2[binary_change == 1]
    
    colors = [DW_CLASSES[i]["color"] for i in range(9)] + ['#E0E0E0'] # Add unchanged grey
    cmap_trans = ListedColormap(colors)
    cmap_trans.set_bad(color='white', alpha=0)
    plt.figure(figsize=(10, 10))
    plt.imshow(np.ma.masked_where(binary_change == 255, trans_vis), cmap=cmap_trans, vmin=0, vmax=9, interpolation='nearest')
    plt.axis('off')
    plt.savefig(os.path.join(out_dir, f"transition_{year1}_{year2}.png"), bbox_inches='tight', pad_inches=0, dpi=300, transparent=True)
    plt.close()
    
    # Base mode maps just to be sure they match visually in dimensions
    generate_validation_png(data1, os.path.join(out_dir, f"dynamic_world_{year1}_mode.png"))
    generate_validation_png(data2, os.path.join(out_dir, f"dynamic_world_{year2}_mode.png"))
    vis_time = time.time() - start_vis_time
    
    total_time = time.time() - start_time
    
    # Reporting
    report = {
        "city": city,
        "year1": year1,
        "year2": year2,
        "total_valid_pixels": int(total_valid),
        "changed_pixels": int(changed_count),
        "unchanged_pixels": int(unchanged_count),
        "changed_percentage": round(changed_count / total_valid * 100, 2) if total_valid else 0,
        "unchanged_percentage": round(unchanged_count / total_valid * 100, 2) if total_valid else 0,
        "class_distribution": {
            str(i): {
                "name": DW_CLASSES[i]["name"],
                f"count_{year1}": int(dist1[i]),
                f"count_{year2}": int(dist2[i]),
                "gain": int(gains[i]),
                "loss": int(losses[i]),
                "net_change": int(net_change[i])
            } for i in range(9)
        },
        "top_transitions": top_trans[:10],
        "transition_matrix": {str(c1): {str(c2): int(transition_matrix[c1, c2]) for c2 in range(9)} for c1 in range(9)},
        "performance": {
            "change_detection_time_s": round(change_time, 2),
            "statistics_time_s": round(stat_time, 2),
            "visualization_time_s": round(vis_time, 2),
            "total_processing_time_s": round(total_time, 2)
        }
    }
    
    with open(os.path.join(out_dir, "metadata.json"), "w") as f:
        json.dump(report, f, indent=4)
        
    logger.info("Change Detection Complete!")
    return report

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Dynamic World Change Detection")
    parser.add_argument("--city", type=str, required=True)
    parser.add_argument("--year1", type=int, required=True)
    parser.add_argument("--year2", type=int, required=True)
    parser.add_argument("--out_dir", type=str, default=None)
    args = parser.parse_args()
    
    detect_change(args.city, args.year1, args.year2, args.out_dir)
