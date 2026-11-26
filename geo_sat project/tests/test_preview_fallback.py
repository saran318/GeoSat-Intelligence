import os
import sys
from unittest.mock import MagicMock, patch

import pytest
import requests
from fastapi.testclient import TestClient

# Ensure project root is in system path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.append(project_root)

from app.api import dynamic_world as dw_api
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def clear_preview_cache():
    dw_api._R2_PREVIEW_EXISTS_CACHE.clear()
    yield
    dw_api._R2_PREVIEW_EXISTS_CACHE.clear()


def test_r2_preview_exists_returns_307_and_caches_head(monkeypatch):
    r2_url = "https://cdn.example.com/previews/esri/chennai_dynamic_world_2019.png"
    monkeypatch.setattr(dw_api.DynamicWorldService, "resolve_preview_url", lambda city, layer: r2_url)
    monkeypatch.setattr(dw_api.EsriService, "_get_r2_public_url", classmethod(lambda cls: "https://cdn.example.com"))

    head_resp = MagicMock(status_code=200)
    with patch("app.api.dynamic_world.requests.head", return_value=head_resp) as mock_head:
        resp1 = client.get("/api/dynamic-world/Chennai/preview/dynamic_world_2019", follow_redirects=False)
        resp2 = client.get("/api/dynamic-world/Chennai/preview/dynamic_world_2019", follow_redirects=False)

    assert resp1.status_code == 307
    assert resp1.headers["location"] == r2_url
    assert resp2.status_code == 307
    assert resp2.headers["location"] == r2_url
    mock_head.assert_called_once_with(r2_url, timeout=3, allow_redirects=True)


def test_r2_preview_missing_falls_back_to_local_png(monkeypatch, tmp_path):
    r2_url = "https://cdn.example.com/previews/esri/chennai_dynamic_world_2019.png"
    local_png = tmp_path / "chennai_dynamic_world_2019.png"
    local_png.write_bytes(b"\x89PNG\r\n\x1a\nfake-png-bytes")

    monkeypatch.setattr(dw_api.DynamicWorldService, "resolve_preview_url", lambda city, layer: r2_url)
    monkeypatch.setattr(dw_api.DynamicWorldService, "resolve_preview_path", lambda city, layer: str(local_png))
    monkeypatch.setattr(dw_api.EsriService, "_get_r2_public_url", classmethod(lambda cls: "https://cdn.example.com"))

    head_resp = MagicMock(status_code=404)
    with patch("app.api.dynamic_world.requests.head", return_value=head_resp) as mock_head:
        resp = client.get("/api/dynamic-world/Chennai/preview/dynamic_world_2019", follow_redirects=False)

    assert resp.status_code == 200
    assert resp.headers["content-type"] == "image/png"
    assert resp.headers["cache-control"] == "no-cache, no-store, must-revalidate"
    assert resp.content == b"\x89PNG\r\n\x1a\nfake-png-bytes"
    mock_head.assert_called_once_with(r2_url, timeout=3, allow_redirects=True)


def test_r2_preview_missing_and_local_unavailable_returns_404(monkeypatch):
    r2_url = "https://cdn.example.com/previews/esri/chennai_dynamic_world_3000.png"
    monkeypatch.setattr(dw_api.DynamicWorldService, "resolve_preview_url", lambda city, layer: r2_url)
    monkeypatch.setattr(dw_api.DynamicWorldService, "resolve_preview_path", lambda city, layer: None)
    monkeypatch.setattr(dw_api.EsriService, "_get_r2_public_url", classmethod(lambda cls: "https://cdn.example.com"))

    head_resp = MagicMock(status_code=404)
    with patch("app.api.dynamic_world.requests.head", return_value=head_resp):
        resp = client.get("/api/dynamic-world/Chennai/preview/dynamic_world_3000", follow_redirects=False)

    assert resp.status_code == 404


def test_r2_head_request_error_falls_back_to_local_png(monkeypatch, tmp_path):
    r2_url = "https://cdn.example.com/previews/esri/chennai_dynamic_world_2019.png"
    local_png = tmp_path / "chennai_dynamic_world_2019.png"
    local_png.write_bytes(b"\x89PNG\r\n\x1a\nfallback-png")

    monkeypatch.setattr(dw_api.DynamicWorldService, "resolve_preview_url", lambda city, layer: r2_url)
    monkeypatch.setattr(dw_api.DynamicWorldService, "resolve_preview_path", lambda city, layer: str(local_png))
    monkeypatch.setattr(dw_api.EsriService, "_get_r2_public_url", classmethod(lambda cls: "https://cdn.example.com"))

    with patch("app.api.dynamic_world.requests.head", side_effect=requests.Timeout("timed out")):
        resp = client.get("/api/dynamic-world/Chennai/preview/dynamic_world_2019", follow_redirects=False)

    assert resp.status_code == 200
    assert resp.content == b"\x89PNG\r\n\x1a\nfallback-png"


def test_r2_s3_head_object_hit_and_miss(monkeypatch, tmp_path):
    presigned_url = "https://acc.r2.cloudflarestorage.com/geosat-assets/previews/esri/chennai_dynamic_world_2019.png?X-Amz-Signature=abc"
    local_png = tmp_path / "chennai_dynamic_world_2019.png"
    local_png.write_bytes(b"\x89PNG\r\n\x1a\ns3-fallback")

    mock_s3 = MagicMock()
    monkeypatch.setattr(dw_api.DynamicWorldService, "resolve_preview_url", lambda city, layer: presigned_url)
    monkeypatch.setattr(dw_api.DynamicWorldService, "resolve_preview_path", lambda city, layer: str(local_png))
    monkeypatch.setattr(dw_api.EsriService, "_get_r2_public_url", classmethod(lambda cls: ""))
    monkeypatch.setattr(dw_api.EsriService, "_get_s3_client", classmethod(lambda cls: mock_s3))

    # Hit: head_object succeeds -> 307
    mock_s3.head_object.return_value = {}
    resp_hit = client.get("/api/dynamic-world/Chennai/preview/dynamic_world_2019", follow_redirects=False)
    assert resp_hit.status_code == 307
    assert resp_hit.headers["location"] == presigned_url

    # Miss: clear cache, head_object raises -> 200 fallback PNG
    dw_api._R2_PREVIEW_EXISTS_CACHE.clear()
    mock_s3.head_object.side_effect = Exception("NotFound")
    resp_miss = client.get("/api/dynamic-world/Chennai/preview/dynamic_world_2019", follow_redirects=False)
    assert resp_miss.status_code == 200
    assert resp_miss.content == b"\x89PNG\r\n\x1a\ns3-fallback"
