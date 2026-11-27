"""
Configuration settings for the Person 2 Backend & Inference module.
Centrally stores all configurable hyperparameters, file paths, supported formats,
and class definitions to ensure consistency across CLI and REST API modules.
"""

import os

try:
    import torch  # type: ignore[import-not-found]
except ImportError:
    torch = None

# Base Directories
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(PROJECT_ROOT, "models")

# Model Configuration
MODEL_PATH = os.path.join(MODELS_DIR, "resnet50_best.pt")
MODEL_NAME = "resnet50"
NUM_CLASSES = 10
MODEL_DOWNLOAD_URL = "https://github.com/Antigravity/geo_sat_project/releases/download/v1.0.0/resnet50_best.pt"

# Image & Preprocessing Parameters
IMAGE_SIZE = 64  # Input spatial dimension (64x64) expected by ResNet50 model
SUPPORTED_FORMATS = [".tif", ".tiff", ".jp2"]

# Device Auto-detection with optimization settings
DEVICE = "cuda" if (torch is not None and torch.cuda.is_available()) else "cpu"

# Centralized list of land-use classes in alphabetical order
CLASS_NAMES = [
    "AnnualCrop",
    "Forest",
    "HerbaceousVegetation",
    "Highway",
    "Industrial",
    "Pasture",
    "PermanentCrop",
    "Residential",
    "River",
    "SeaLake"
]

# Esri 10m Annual Land Use / Land Cover (2019-2025) Configuration
WORKSPACE_ROOT = os.path.dirname(PROJECT_ROOT)
ESRI_CANDIDATE_DIRS = {
    "43P": [
        os.path.join(WORKSPACE_ROOT, "TN-1"),
        os.path.join(PROJECT_ROOT, "data", "esri", "TN-1"),
        os.path.join(PROJECT_ROOT, "TN-1")
    ],
    "44P": [
        os.path.join(WORKSPACE_ROOT, "TN-2"),
        os.path.join(PROJECT_ROOT, "data", "esri", "TN-2"),
        os.path.join(PROJECT_ROOT, "TN-2")
    ]
}

ESRI_CLASSES = {
    1: "Water",
    2: "Trees",
    4: "Flooded vegetation",
    5: "Crops",
    7: "Built Area",
    8: "Bare ground",
    9: "Snow/Ice",
    10: "Clouds",
    11: "Rangeland"
}

ESRI_COLORS = {
    1: "#1A5BAB",
    2: "#358221",
    4: "#87D19E",
    5: "#FFDB5C",
    7: "#ED022A",
    8: "#EDE9E4",
    9: "#F2FAFF",
    10: "#C8C8C8",
    11: "#EECFA8"
}

ESRI_YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025]
ESRI_TILE_DIRS = {"43P": "TN-1", "44P": "TN-2"}


def get_esri_raster_filename(tile_id: str, year: int) -> str:
    """Returns canonical Esri 10m LULC GeoTIFF filename for a tile and year."""
    if year >= 2024:
        return f"{tile_id}_{year}0101-{year}1231.tif"
    return f"{tile_id}_{year}0101-{year + 1}0101.tif"


# ── Supabase (Structured Analytics) ──────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or os.getenv("SUPABASE_KEY")
    or os.getenv("SUPABASE_ANON_KEY")
    or ""
).strip()

# ── Backblaze B2 (GeoTIFFs, Previews, Visual Assets) ─────────────────────────
B2_ENDPOINT_URL = os.getenv("B2_ENDPOINT_URL", "https://s3.us-east-005.backblazeb2.com").strip().rstrip("/")
B2_REGION = os.getenv("B2_REGION", "us-east-005").strip()
B2_BUCKET_NAME = os.getenv("B2_BUCKET_NAME", "geosat-assets").strip()
B2_ACCESS_KEY_ID = os.getenv("B2_ACCESS_KEY_ID", "").strip()
B2_SECRET_ACCESS_KEY = os.getenv("B2_SECRET_ACCESS_KEY", "").strip()

# Logging Configuration
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
LOG_LEVEL = "INFO"
