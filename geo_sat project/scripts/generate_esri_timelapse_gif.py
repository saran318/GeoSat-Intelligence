"""
Generates an animated GIF visual resource from the 2019-2025 Esri 10m Land Cover time series.
Leverages rasterio overview pyramids for instantaneous, low-memory extraction.
"""

import os
import sys
import glob
import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.warp import transform_bounds
from PIL import Image, ImageDraw, ImageFont

# Add project root to sys.path
_SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(_SCRIPTS_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

import backend_config as bcfg

# RGB palette for Esri classes
ESRI_RGB_PALETTE = {
    0: (0, 0, 0),        # No data
    1: (26, 91, 171),    # Water (Blue)
    2: (53, 130, 33),    # Trees (Green)
    4: (135, 209, 158),  # Flooded vegetation (Teal)
    5: (255, 219, 92),   # Crops (Yellow)
    7: (237, 2, 42),     # Built Area (Red)
    8: (237, 233, 228),  # Bare ground (Grey)
    9: (242, 250, 255),  # Snow/Ice
    10: (200, 200, 200), # Clouds
    11: (238, 207, 168)  # Rangeland (Tan)
}

def find_tile_file(tile_id: str, year: int) -> str:
    """Finds the GeoTIFF file for a given tile and year."""
    candidate_dirs = bcfg.ESRI_CANDIDATE_DIRS.get(tile_id, [])
    for cdir in candidate_dirs:
        if not os.path.exists(cdir):
            continue
        patterns = [
            f"*{tile_id}*{year}*.tif",
            f"*{tile_id}*{year}*.tiff",
            f"*{year}*.tif"
        ]
        for p in patterns:
            matches = glob.glob(os.path.join(cdir, p))
            if matches:
                return matches[0]
    return ""

def colorize_raster(data: np.ndarray) -> np.ndarray:
    """Converts 2D integer class array to 3D RGB uint8 image."""
    h, w = data.shape
    rgb = np.zeros((h, w, 3), dtype=np.uint8)
    for cls_val, color in ESRI_RGB_PALETTE.items():
        mask = (data == cls_val)
        rgb[mask] = color
    return rgb

def create_timelapse_gif(
    tile_id: str = "44P",
    out_paths: list = None,
    target_size: tuple = (640, 640),
    duration_ms: int = 750
):
    """
    Creates an animated GIF of the 2019-2025 land cover progression.
    Fast overview extraction ensures lightweight memory footprint.
    """
    if out_paths is None:
        out_paths = [
            os.path.join(PROJECT_ROOT, "app", "static", "images", "esri_tamil_nadu_2019_2025.gif"),
            os.path.join(bcfg.WORKSPACE_ROOT, "frontend", "public", "assets", "esri_tamil_nadu_2019_2025.gif")
        ]

    years = sorted(bcfg.ESRI_YEARS)
    frames = []

    print(f"Generating Esri Land Cover Timelapse GIF for Tile {tile_id} (Years: {years})...")

    for year in years:
        fpath = find_tile_file(tile_id, year)
        if not fpath:
            print(f"Warning: File not found for {tile_id} year {year}, skipping.")
            continue

        with rasterio.open(fpath) as src:
            # Quick decimation read using nearest resampling (preserves discrete class values)
            data = src.read(
                1,
                out_shape=(target_size[1], target_size[0]),
                resampling=Resampling.nearest
            )

        rgb_array = colorize_raster(data)
        img = Image.fromarray(rgb_array)

        # Draw annotation banner
        draw = ImageDraw.Draw(img)
        # Top banner background
        draw.rectangle([(0, 0), (target_size[0], 50)], fill=(15, 23, 42, 220))
        # Text label
        title_text = f"Esri 10m Land Cover | Tile {tile_id} (Tamil Nadu Region)"
        year_text = f"Year: {year}"
        draw.text((16, 8), title_text, fill=(255, 255, 255))
        draw.text((16, 26), year_text, fill=(255, 215, 0))

        # Bottom legend strip
        draw.rectangle([(0, target_size[1] - 26), (target_size[0], target_size[1])], fill=(15, 23, 42, 230))
        legend_items = [
            ("Water", (26, 91, 171)),
            ("Trees", (53, 130, 33)),
            ("Flooded", (135, 209, 158)),
            ("Crops", (255, 219, 92)),
            ("Built", (237, 2, 42)),
            ("Rangeland", (238, 207, 168)),
        ]
        x_offset = 12
        for name, col in legend_items:
            draw.rectangle([(x_offset, target_size[1] - 18), (x_offset + 10, target_size[1] - 8)], fill=col)
            draw.text((x_offset + 14, target_size[1] - 20), name, fill=(220, 220, 220))
            x_offset += 95

        frames.append(img)

    if not frames:
        print("Error: No frames generated.")
        return None

    # Save to all target paths
    for p in out_paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        frames[0].save(
            p,
            save_all=True,
            append_images=frames[1:],
            duration=duration_ms,
            loop=0,
            optimize=True
        )
        size_mb = os.path.getsize(p) / (1024 * 1024)
        print(f"Successfully generated animated GIF: {p} ({size_mb:.2f} MB)")

    return out_paths[0]

if __name__ == "__main__":
    create_timelapse_gif(tile_id="44P")
