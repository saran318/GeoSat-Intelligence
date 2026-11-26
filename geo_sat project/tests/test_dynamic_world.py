import os
import sys
import pytest
import numpy as np

# Ensure project root is in system path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.append(project_root)

import backend_config as bcfg
from scripts.download_dynamic_world import (
    load_city_roi,
    DW_CLASSES,
    PROBABILITY_BANDS,
    compute_statistics
)

def test_dynamic_world_classes():
    """Verify that class IDs map correctly and we have exactly 9 classes."""
    assert len(DW_CLASSES) == 9
    assert DW_CLASSES[0]["name"] == "Water"
    assert DW_CLASSES[6]["name"] == "Built"

def test_probability_bands():
    """Verify we have exactly 9 probability bands mapped properly."""
    assert len(PROBABILITY_BANDS) == 9
    assert PROBABILITY_BANDS[0] == "water"
    assert PROBABILITY_BANDS[6] == "built"
    assert PROBABILITY_BANDS[-1] == "snow_and_ice"

def test_load_city_roi():
    """Verify Chennai ROI is parsed correctly from config."""
    roi = load_city_roi("Chennai")
    # Expected Phase 1 ROI
    assert roi == [80.13, 12.85, 80.34, 13.24]
    
    # Check coordinate bounds order (min_lon, min_lat, max_lon, max_lat)
    assert roi[0] < roi[2], "Longitude order incorrect"
    assert roi[1] < roi[3], "Latitude order incorrect"

def test_expanded_city_rois():
    expected_cities = {
        "Bengaluru", "Hyderabad", "Mumbai", "Delhi", "Kolkata",
        "Pune", "Ahmedabad", "Jaipur", "Surat", "Coimbatore", "Chennai",
    }
    from pathlib import Path
    import json

    config_path = Path(project_root) / "config" / "cities.json"
    config = json.loads(config_path.read_text(encoding="utf-8"))
    assert expected_cities.issubset(config.keys())

    for city in expected_cities:
        roi = config[city]["bbox"]
        assert len(roi) == 4
        assert roi[0] < roi[2]
        assert roi[1] < roi[3]

def test_default_year_range():
    import json
    config_path = os.path.join(project_root, "config", "cities.json")
    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)
    for city in ["Bengaluru", "Hyderabad", "Mumbai", "Delhi", "Kolkata",
                 "Pune", "Ahmedabad", "Jaipur", "Surat", "Coimbatore", "Chennai"]:
        assert config[city]["default_years"] == [2019, 2020, 2021, 2022, 2023, 2024, 2025]

def test_compute_statistics_nodata_handling():
    """Verify nodata (255) is explicitly excluded from class distribution."""
    # Mock data: 3 water (0), 2 built (6), 5 nodata (255)
    data = np.array([0, 0, 0, 6, 6, 255, 255, 255, 255, 255], dtype=np.uint8)
    stats = compute_statistics(data)
    
    assert stats["nodata_count"] == 5
    assert stats["total_valid_pixels"] == 5
    assert stats["class_distribution"]["0"]["count"] == 3
    assert stats["class_distribution"]["6"]["count"] == 2
    assert stats["class_distribution"]["0"]["percentage"] == 60.0
    assert stats["class_distribution"]["6"]["percentage"] == 40.0
    assert stats["class_distribution"]["1"]["count"] == 0
    
def test_compute_statistics_water_preservation():
    """Verify water pixels (0) are not confused with nodata (255)."""
    data = np.array([0, 255], dtype=np.uint8)
    stats = compute_statistics(data)
    
    assert stats["total_valid_pixels"] == 1
    assert stats["class_distribution"]["0"]["count"] == 1
    assert stats["nodata_count"] == 1
