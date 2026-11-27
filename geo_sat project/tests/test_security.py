import importlib
import os
import sys

import pytest
from fastapi.testclient import TestClient

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.append(project_root)

import app.main as app_main
from app import security


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    security.rate_limiter.reset()
    yield
    security.rate_limiter.reset()


def test_docs_disabled_in_production(monkeypatch):
    monkeypatch.setenv("ENV", "production")
    monkeypatch.delenv("ENABLE_API_DOCS", raising=False)

    importlib.reload(app_main)
    prod_client = TestClient(app_main.app)

    assert prod_client.get("/docs").status_code == 404
    assert prod_client.get("/redoc").status_code == 404
    assert prod_client.get("/openapi.json").status_code == 404

    root_resp = prod_client.get("/")
    assert root_resp.status_code == 200
    assert "docs" not in root_resp.json()
    assert prod_client.get("/api/health").status_code == 200
    assert prod_client.get("/api/dynamic-world/cities").status_code == 200


def test_docs_enabled_in_development(monkeypatch):
    monkeypatch.setenv("ENV", "development")
    monkeypatch.delenv("ENABLE_API_DOCS", raising=False)

    importlib.reload(app_main)
    dev_client = TestClient(app_main.app)

    assert dev_client.get("/docs").status_code == 200
    assert dev_client.get("/openapi.json").status_code == 200
    assert dev_client.get("/").json().get("docs") == "/docs"


def test_cors_strict_origins_and_preflight(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://geosat-app.vercel.app,http://localhost:5173")
    origins, allow_creds = security.parse_allowed_origins()
    assert origins == ["https://geosat-app.vercel.app", "http://localhost:5173"]
    assert allow_creds is False

    # Wildcard is never paired with allow_credentials=True
    monkeypatch.setenv("ALLOWED_ORIGINS", "*")
    wc_origins, wc_creds = security.parse_allowed_origins()
    assert wc_origins == ["*"]
    assert wc_creds is False

    # Reload app with explicit origins and test preflight OPTIONS
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://geosat-app.vercel.app,http://localhost:5173")
    importlib.reload(app_main)
    cors_client = TestClient(app_main.app)

    preflight_ok = cors_client.options(
        "/api/dynamic-world/cities",
        headers={
            "Origin": "https://geosat-app.vercel.app",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert preflight_ok.status_code == 200
    assert preflight_ok.headers.get("access-control-allow-origin") == "https://geosat-app.vercel.app"

    preflight_denied = cors_client.options(
        "/api/dynamic-world/cities",
        headers={
            "Origin": "https://evil.example.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert "access-control-allow-origin" not in preflight_denied.headers


def test_rate_limiting_default_and_expensive_tiers(monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_ENABLED", "true")
    monkeypatch.setattr(security.rate_limiter, "default_limit", 3)
    monkeypatch.setattr(security.rate_limiter, "expensive_limit", 2)
    monkeypatch.setattr(security.rate_limiter, "window_seconds", 60)

    c = TestClient(app_main.app)
    ip_headers = {"X-Forwarded-For": "203.0.113.10"}

    # Default tier allows 3 requests, blocks 4th with 429
    for _ in range(3):
        r = c.get("/api/health", headers=ip_headers)
        assert r.status_code == 200
    blocked = c.get("/api/health", headers=ip_headers)
    assert blocked.status_code == 429
    assert "Retry-After" in blocked.headers

    # Different IP is unaffected
    other_ip = c.get("/api/health", headers={"X-Forwarded-For": "203.0.113.11"})
    assert other_ip.status_code == 200

    # Spoofing leftmost X-Forwarded-For cannot bypass rate limit when rightmost hop is the real IP
    spoof_1 = c.get("/api/health", headers={"X-Forwarded-For": "1.1.1.1, 203.0.113.10"})
    assert spoof_1.status_code == 429
    spoof_2 = c.get("/api/health", headers={"X-Forwarded-For": "8.8.8.8, 203.0.113.10"})
    assert spoof_2.status_code == 429

    # Expensive tier blocks on 3rd request (including /api/esri/change/...)
    exp_ip = {"X-Forwarded-For": "203.0.113.12"}
    assert c.get("/api/dynamic-world/InvalidCity/raster/dynamic_world_2019", headers=exp_ip).status_code == 404
    assert c.get("/api/esri/change/district/InvalidCity", headers=exp_ip).status_code == 404
    exp_blocked = c.get("/api/dynamic-world/InvalidCity/preview/dynamic_world_2019", headers=exp_ip)
    assert exp_blocked.status_code == 429


def test_input_validation_and_size_guards(monkeypatch):
    c = TestClient(app_main.app)

    # Overly long city name (>100 chars) -> 422
    assert c.get(f"/api/dynamic-world/{'a' * 101}/years").status_code == 422
    # Invalid characters in city name -> 422
    assert c.get("/api/dynamic-world/Chennai$bad/years").status_code == 422
    # Invalid year bounds -> 422
    assert c.get("/api/dynamic-world/Chennai/stats/1800").status_code == 422
    assert c.get("/api/esri/stats/district/Chennai/9999").status_code == 422
    # Invalid Esri hierarchy level -> 422
    assert c.get("/api/esri/location/invalid_level/Chennai").status_code == 422

    # Oversized Content-Length -> 413
    oversized = c.post("/api/health", headers={"Content-Length": "5000000"})
    assert oversized.status_code == 413

    # Streamed/chunked body exceeding MAX_REQUEST_BODY_BYTES without Content-Length -> 413
    import asyncio
    from fastapi import FastAPI, Request

    echo_app = FastAPI()

    @echo_app.post("/echo")
    async def _echo(req: Request):
        return {"bytes": len(await req.body())}

    wrapped = security.SecurityMiddleware(echo_app)
    monkeypatch.setenv("MAX_REQUEST_BODY_BYTES", "64")

    async def _send_chunked():
        chunks = [
            {"type": "http.request", "body": b"x" * 40, "more_body": True},
            {"type": "http.request", "body": b"y" * 40, "more_body": False},
        ]
        sent = []

        async def _recv():
            return chunks.pop(0) if chunks else {"type": "http.disconnect"}

        async def _send(msg):
            sent.append(msg)

        scope = {
            "type": "http",
            "method": "POST",
            "path": "/echo",
            "query_string": b"",
            "headers": [],
            "client": ("127.0.0.1", 12345),
        }
        await wrapped(scope, _recv, _send)
        return sent

    sent_msgs = asyncio.run(_send_chunked())
    assert sent_msgs[0]["status"] == 413
    monkeypatch.delenv("MAX_REQUEST_BODY_BYTES", raising=False)

    # Missing ALLOWED_ORIGINS in production denies all cross-origin requests
    monkeypatch.setenv("ENV", "production")
    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
    prod_origins, prod_creds = security.parse_allowed_origins()
    assert prod_origins == []
    assert prod_creds is False

    # Security headers present on normal responses
    ok = c.get("/api/esri/hierarchy")
    assert ok.status_code == 200
    assert ok.headers.get("x-content-type-options") == "nosniff"
    assert ok.headers.get("x-frame-options") == "DENY"
