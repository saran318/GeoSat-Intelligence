import os
import sys
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.append(project_root)

import backend_config as bcfg
from app.main import app
from app.services.esri_service import EsriService

client = TestClient(app)


def test_b2_client_initializes_without_r2_account_id(monkeypatch):
    monkeypatch.setenv("B2_ENDPOINT_URL", "https://s3.us-east-005.backblazeb2.com")
    monkeypatch.setenv("B2_REGION", "us-east-005")
    monkeypatch.setenv("B2_BUCKET_NAME", "geosat-assets")
    monkeypatch.setenv("B2_ACCESS_KEY_ID", "test-key-id")
    monkeypatch.setenv("B2_SECRET_ACCESS_KEY", "test-secret-key")
    monkeypatch.delenv("R2_ACCOUNT_ID", raising=False)

    EsriService._s3_init_attempted = False
    EsriService._s3_client = None

    mock_client = MagicMock()
    fake_boto3 = MagicMock()
    fake_boto3.client.return_value = mock_client
    fake_botocore_config = MagicMock()
    monkeypatch.setitem(sys.modules, "boto3", fake_boto3)
    monkeypatch.setitem(sys.modules, "botocore", MagicMock(config=fake_botocore_config))
    monkeypatch.setitem(sys.modules, "botocore.config", fake_botocore_config)

    s3 = EsriService._get_s3_client()
    assert s3 is mock_client
    assert EsriService.is_r2_configured() is True
    _, kwargs = fake_boto3.client.call_args
    assert kwargs["endpoint_url"] == "https://s3.us-east-005.backblazeb2.com"
    assert kwargs["region_name"] == "us-east-005"
    assert kwargs["aws_access_key_id"] == "test-key-id"
    assert kwargs["aws_secret_access_key"] == "test-secret-key"

    EsriService._s3_init_attempted = False
    EsriService._s3_client = None


def test_b2_presigned_url_generation_and_routes(monkeypatch):
    monkeypatch.setenv("B2_BUCKET_NAME", "geosat-assets")
    mock_s3 = MagicMock()
    mock_s3.generate_presigned_url.return_value = (
        "https://s3.us-east-005.backblazeb2.com/geosat-assets/rasters/esri/TN-2/44P_20230101-20240101.tif?X-Amz-Signature=abc"
    )
    monkeypatch.setattr(EsriService, "_get_s3_client", classmethod(lambda cls: mock_s3))

    url = EsriService.get_raster_url("44P", 2023)
    assert url is not None and "s3.us-east-005.backblazeb2.com" in url
    mock_s3.generate_presigned_url.assert_called_with(
        "get_object",
        Params={"Bucket": "geosat-assets", "Key": "rasters/esri/TN-2/44P_20230101-20240101.tif"},
        ExpiresIn=3600,
    )

    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"

    cities = client.get("/api/dynamic-world/cities")
    assert cities.status_code == 200
    assert len(cities.json()["cities"]) > 0

    hierarchy = client.get("/api/esri/hierarchy")
    assert hierarchy.status_code == 200
