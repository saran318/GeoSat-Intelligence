import pytest
from fastapi.testclient import TestClient
import os
import sys

# Ensure project root is in system path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.append(project_root)

from app.main import app

client = TestClient(app)

def test_cities_endpoint():
    response = client.get("/api/dynamic-world/cities")
    assert response.status_code == 200
    data = response.json()
    assert "cities" in data
    # Chennai should be discovered
    chennai_found = any(c["name"] == "Chennai" for c in data["cities"])
    assert chennai_found

def test_years_endpoint():
    response = client.get("/api/dynamic-world/Chennai/years")
    assert response.status_code == 200
    data = response.json()
    assert data["city"] == "Chennai"
    assert 2019 in data["years"]
    assert 2023 in data["years"]

def test_layers_endpoint():
    response = client.get("/api/dynamic-world/Chennai/layers")
    assert response.status_code == 200
    data = response.json()
    layer_ids = [layer["id"] for layer in data["layers"]]
    assert "dynamic_world_2019" in layer_ids
    assert "dynamic_world_2023" in layer_ids
    assert "change_2019_2025" in layer_ids
    assert "transition_2019_2025" in layer_ids

def test_metadata_endpoint():
    response = client.get("/api/dynamic-world/Chennai/metadata/2023")
    assert response.status_code == 200
    data = response.json()
    assert data["city"] == "Chennai"
    assert data["year"] == 2023
    assert data["method"] == "mode"
    assert data["nodata"] == 0

def test_stats_endpoint():
    response = client.get("/api/dynamic-world/Chennai/stats/2023")
    assert response.status_code == 200
    data = response.json()
    assert "Water" in data["classes"]
    assert data["classes"]["Water"]["id"] == 1
    # verify nodata is excluded (no 0 class)
    assert "0" not in data["classes"]
    assert "Nodata" not in data["classes"]

def test_change_stats_endpoint():
    response = client.get("/api/dynamic-world/Chennai/change/2019/2023/stats")
    assert response.status_code == 200
    data = response.json()
    assert data["from_year"] == 2019
    assert data["to_year"] == 2023
    assert "classes" in data
    assert "Built Area" in data["classes"]

def test_transition_matrix_endpoint():
    response = client.get("/api/dynamic-world/Chennai/change/2019/2023/transitions")
    assert response.status_code == 200
    data = response.json()
    assert len(data["classes"]) == 9
    assert data["classes"][0] == "Water"
    assert len(data["matrix"]) == 9
    assert len(data["matrix"][0]) == 9

def test_raster_endpoint():
    response = client.get("/api/dynamic-world/Chennai/raster/dynamic_world_2019")
    assert response.status_code == 200
    assert response.headers["content-type"] in ["image/tiff", "application/octet-stream"]
    assert len(response.content) > 0

def test_path_traversal_blocked():
    # Attempting to load an arbitrary file via layer id
    response = client.get("/api/dynamic-world/Chennai/raster/../../../../service_account.json")
    # Our resolution logic strictly checks prefix "dynamic_world_", "change_", etc.
    # so arbitrary strings return 404 (not found / unrecognized layer)
    assert response.status_code == 404

def test_invalid_city():
    response = client.get("/api/dynamic-world/InvalidCity123/years")
    assert response.status_code == 404

def test_missing_file_behavior():
    response = client.get("/api/dynamic-world/Chennai/raster/dynamic_world_3000")
    assert response.status_code == 404
