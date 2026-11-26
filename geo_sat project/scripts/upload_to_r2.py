"""
Upload GeoTIFFs, preview PNGs, city results, and visual timelapse assets to Cloudflare R2.

Usage:
  python scripts/upload_to_r2.py --dry-run
  python scripts/upload_to_r2.py
"""

import argparse
import mimetypes
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
WORKSPACE_ROOT = PROJECT_ROOT.parent
load_dotenv(PROJECT_ROOT / ".env")


def collect_assets():
    """Collect (local_path, r2_key) pairs without deleting any local files."""
    assets = []

    # 1. Esri GeoTIFFs (TN-1 / TN-2)
    for tile_dir in ("TN-1", "TN-2"):
        root = WORKSPACE_ROOT / tile_dir
        if root.is_dir():
            for f in sorted(root.glob("*.tif*")):
                assets.append((f, f"rasters/esri/{tile_dir}/{f.name}"))

    # 2. Esri Previews (PNG)
    previews_dir = PROJECT_ROOT / "data" / "esri_previews"
    if previews_dir.is_dir():
        for f in sorted(previews_dir.glob("*.png")):
            assets.append((f, f"previews/esri/{f.name}"))

    # 3. City results (PNG, GeoTIFF, JSON, CSV)
    results_dir = PROJECT_ROOT / "data" / "results"
    if results_dir.is_dir():
        for f in sorted(results_dir.rglob("*")):
            if f.is_file():
                rel = f.relative_to(results_dir).as_posix()
                assets.append((f, f"results/{rel}"))

    # 4. Animated timelapse GIF (optional)
    gif_path = PROJECT_ROOT / "app" / "static" / "images" / "esri_tamil_nadu_2019_2025.gif"
    if gif_path.is_file():
        assets.append((gif_path, "visuals/esri_tamil_nadu_2019_2025.gif"))

    return assets


def main():
    parser = argparse.ArgumentParser(description="Upload GeoSat raster/preview/result assets to Cloudflare R2")
    parser.add_argument("--dry-run", action="store_true", help="List files and target R2 keys without uploading")
    args = parser.parse_args()

    assets = collect_assets()
    total_mb = sum(p.stat().st_size for p, _ in assets) / (1024 * 1024)
    print(f"Found {len(assets)} assets totaling {total_mb:.2f} MB")

    if args.dry_run:
        for local_path, r2_key in assets[:25]:
            print(f"  [DRY-RUN] {local_path} -> s3://{os.getenv('R2_BUCKET_NAME', 'geosat-assets')}/{r2_key}")
        if len(assets) > 25:
            print(f"  ... and {len(assets) - 25} more files")
        return

    import boto3

    account_id = os.environ["R2_ACCOUNT_ID"]
    bucket = os.environ["R2_BUCKET_NAME"]
    s3 = boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
    )

    for idx, (local_path, r2_key) in enumerate(assets, start=1):
        content_type, _ = mimetypes.guess_type(str(local_path))
        extra = {"ContentType": content_type} if content_type else {}
        s3.upload_file(str(local_path), bucket, r2_key, ExtraArgs=extra)
        if idx % 20 == 0 or idx == len(assets):
            print(f"Uploaded {idx}/{len(assets)}: {r2_key}")


if __name__ == "__main__":
    main()
