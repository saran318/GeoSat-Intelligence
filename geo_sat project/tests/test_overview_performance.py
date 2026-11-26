import os
import sys
from types import SimpleNamespace
from unittest.mock import patch, MagicMock
import pytest

# Ensure project root is in system path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

import backend_config as bcfg
from app.services.esri_service import EsriService


class _FakeQueryBuilder:
    def __init__(self, table_name: str, rows: list, call_log: list):
        self.table_name = table_name
        self._rows = rows
        self._call_log = call_log
        self._filters = {}

    def select(self, *args, **kwargs):
        return self

    def in_(self, column: str, values: list):
        self._filters[column] = set(values)
        return self

    def eq(self, column: str, value):
        self._filters[column] = {value}
        return self

    def execute(self):
        self._call_log.append((self.table_name, dict(self._filters)))
        filtered = []
        for row in self._rows:
            match = True
            for col, allowed in self._filters.items():
                if row.get(col) not in allowed:
                    match = False
                    break
            if match:
                filtered.append(row)
        return SimpleNamespace(data=filtered)


class _FakeSupabaseClient:
    def __init__(self, rows: list):
        self.rows = rows
        self.query_calls = []

    def table(self, name: str):
        return _FakeQueryBuilder(name, self.rows, self.query_calls)


def _make_sample_classes(built_area_km2: float, total_area_km2: float = 1000.0):
    water = 50.0
    trees = 200.0
    crops = total_area_km2 - built_area_km2 - water - trees
    return [
        {"class_id": 1, "class_name": "Water", "area_km2": water, "percentage": round(water / total_area_km2 * 100, 2)},
        {"class_id": 2, "class_name": "Trees", "area_km2": trees, "percentage": round(trees / total_area_km2 * 100, 2)},
        {"class_id": 5, "class_name": "Crops", "area_km2": crops, "percentage": round(crops / total_area_km2 * 100, 2)},
        {"class_id": 7, "class_name": "Built Area", "area_km2": built_area_km2, "percentage": round(built_area_km2 / total_area_km2 * 100, 2)},
    ]


@pytest.fixture(autouse=True)
def _reset_esri_caches():
    orig_overview = EsriService._overview_summary_cache
    orig_stats = dict(EsriService._stats_cache)
    EsriService._overview_summary_cache = None
    EsriService._stats_cache = {}
    yield
    EsriService._overview_summary_cache = orig_overview
    EsriService._stats_cache = orig_stats


def test_overview_summary_cold_start_single_bulk_query_and_memory_cache(tmp_path):
    years = sorted(bcfg.ESRI_YEARS)
    district_names = [f"District_{i:02d}" for i in range(1, 39)]  # 38 districts
    hierarchy = {
        "districts": {
            **{d: {} for d in district_names},
            "Chennai Metropolitan Area": {},  # Should be excluded
        }
    }

    rows = []
    for idx, d_name in enumerate(district_names):
        loc_norm = d_name.lower()
        for y_idx, y in enumerate(years):
            built = 100.0 + idx * 2.0 + y_idx * 5.0
            # Add a 700_v2 row and a 1400_v2 row for District_01 in first year to verify 1400 preference
            if idx == 0 and y_idx == 0:
                rows.append({
                    "location_id": loc_norm,
                    "year": y,
                    "cache_key": f"{loc_norm}_{y}_700_v2",
                    "total_pixels": 10000,
                    "total_area_km2": 999.0,
                    "classes": _make_sample_classes(built_area_km2=50.0, total_area_km2=999.0),
                })
            rows.append({
                "location_id": loc_norm,
                "year": y,
                "cache_key": f"{loc_norm}_{y}_1400_v2",
                "total_pixels": 40000,
                "total_area_km2": 1000.0,
                "classes": _make_sample_classes(built_area_km2=built, total_area_km2=1000.0),
            })

    fake_client = _FakeSupabaseClient(rows)

    with (
        patch.object(EsriService, "get_stats_cache_dir", return_value=str(tmp_path)),
        patch.object(EsriService, "is_supabase_configured", return_value=True),
        patch.object(EsriService, "_get_supabase_client", return_value=fake_client),
        patch.object(EsriService, "get_hierarchy", return_value=hierarchy),
        patch.object(EsriService, "get_city_config", return_value={"tiles": ["44P"], "bbox": [79.0, 12.0, 80.5, 13.5]}),
        patch.object(EsriService, "compute_stats_for_window", side_effect=AssertionError("Should not fall back when all rows exist")) as mock_compute,
    ):
        # Cold start (no overview_summary_v1.json on disk)
        summary = EsriService.get_overview_summary()

        assert len(fake_client.query_calls) == 1
        assert fake_client.query_calls[0][0] == "esri_year_stats"
        assert mock_compute.call_count == 0

        # Verify 1400 row was preferred over 700 row for District_01 in first year
        prewarmed = EsriService._stats_cache.get(f"district_01_{years[0]}_700_v2")
        assert prewarmed is not None
        assert prewarmed["total_area_km2"] == 1000.0
        assert prewarmed["sampling_meters"] == 20.0

        # Verify contract fields
        assert summary["district_count"] == 38
        assert summary["years"] == years
        assert summary["first_year"] == years[0]
        assert summary["last_year"] == years[-1]
        assert summary["total_area_km2"] == 38000.0
        assert len(summary["kpis"]) == 4
        for kpi in summary["kpis"]:
            assert "trend" in kpi
            assert len(kpi["trend"]) == len(years)
        assert len(summary["top_built_growth"]) == 5
        assert len(summary["top_changed_classes"]) <= 5
        assert "system_info" in summary

        # Remove disk cache to prove second call hits in-memory cache with 0 queries and 0 disk reads
        disk_cache = tmp_path / "overview_summary_v1.json"
        if disk_cache.exists():
            disk_cache.unlink()

        summary_2 = EsriService.get_overview_summary()
        assert summary_2 is summary
        assert len(fake_client.query_calls) == 1  # Still 1 total query (0 additional)


def test_overview_summary_falls_back_only_for_missing_district_year(tmp_path):
    years = sorted(bcfg.ESRI_YEARS)
    district_names = ["District_A", "District_B"]
    hierarchy = {"districts": {d: {} for d in district_names}}

    rows = []
    for d_name in district_names:
        for y in years:
            # Omit District_B for last_year to test selective fallback
            if d_name == "District_B" and y == years[-1]:
                continue
            rows.append({
                "location_id": d_name.lower(),
                "year": y,
                "cache_key": f"{d_name.lower()}_{y}_1400_v2",
                "total_pixels": 40000,
                "total_area_km2": 1000.0,
                "classes": _make_sample_classes(built_area_km2=120.0, total_area_km2=1000.0),
            })

    fake_client = _FakeSupabaseClient(rows)
    fallback_stats = {
        "total_pixels": 10000,
        "total_area_km2": 1000.0,
        "sampling_meters": 20.0,
        "classes": _make_sample_classes(built_area_km2=150.0, total_area_km2=1000.0),
    }

    with (
        patch.object(EsriService, "get_stats_cache_dir", return_value=str(tmp_path)),
        patch.object(EsriService, "is_supabase_configured", return_value=True),
        patch.object(EsriService, "_get_supabase_client", return_value=fake_client),
        patch.object(EsriService, "get_hierarchy", return_value=hierarchy),
        patch.object(EsriService, "get_city_config", return_value={"tiles": ["44P"], "bbox": [79.0, 12.0, 80.5, 13.5]}),
        patch.object(EsriService, "compute_stats_for_window", return_value=fallback_stats) as mock_compute,
    ):
        summary = EsriService.get_overview_summary()

        assert len(fake_client.query_calls) == 1
        assert mock_compute.call_count == 1
        assert mock_compute.call_args.kwargs["location_id"] == "District_B"
        assert mock_compute.call_args.args[1] == years[-1]
        assert summary["district_count"] == 2
