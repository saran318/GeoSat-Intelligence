"""
Security utilities and ASGI middleware for GeoSat Intelligence API:
- Environment-aware API documentation toggle
- Strict CORS origin parsing (no wildcard + credentials; empty in prod if unset)
- Per-IP sliding-window in-memory rate limiting (with stricter limits on expensive routes)
- Spoof-resistant X-Forwarded-For extraction (rightmost proxy hop)
- ASGI-level streaming request body size limit (covers chunked transfer encoding)
- Baseline security headers

Note on multi-instance deployments:
    InMemoryRateLimiter stores per-IP request timestamps in process memory.
    On a single Render instance / single Uvicorn worker this enforces exact limits.
    If scaled to multiple instances or multiple workers, each process maintains its
    own counter; for globally shared limits across instances, back this with Redis.
"""

from __future__ import annotations

import logging
import os
import posixpath
import threading
import time
from collections import deque
from typing import Deque, Dict, List, Tuple

from starlette.datastructures import Headers, MutableHeaders
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

logger = logging.getLogger(__name__)

_DEFAULT_DEV_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

_EXPENSIVE_PATH_MARKERS = ("/raster/", "/preview/", "/change/")


class _RequestBodyTooLarge(Exception):
    """Raised when streamed request body exceeds MAX_REQUEST_BODY_BYTES."""


def is_api_docs_enabled() -> bool:
    """
    Determine whether Swagger UI, ReDoc, and OpenAPI schema should be exposed.
    Controlled by ENABLE_API_DOCS; defaults to False when ENV=production,
    and True otherwise (local development).
    """
    raw = os.getenv("ENABLE_API_DOCS", "").strip().lower()
    if raw in ("1", "true", "yes", "on"):
        return True
    if raw in ("0", "false", "no", "off"):
        return False
    return os.getenv("ENV", "development").strip().lower() != "production"


def parse_allowed_origins() -> Tuple[List[str], bool]:
    """
    Parse ALLOWED_ORIGINS into (origins, allow_credentials).
    - In development, defaults to local Vite origins when unset.
    - In production, returns [] when unset (deny cross-origin until configured).
    - Never returns wildcard '*' with allow_credentials=True.
    """
    raw = os.getenv("ALLOWED_ORIGINS", "").strip()
    is_prod = os.getenv("ENV", "development").strip().lower() == "production"

    if not raw:
        if is_prod:
            logger.warning("ALLOWED_ORIGINS is not set in production; cross-origin requests will be denied.")
            return [], False
        return list(_DEFAULT_DEV_ORIGINS), False

    if raw == "*":
        return ["*"], False

    origins: List[str] = []
    for item in raw.split(","):
        cleaned = item.strip().rstrip("/")
        if cleaned and cleaned != "*":
            origins.append(cleaned)

    if not origins:
        return ([], False) if is_prod else (list(_DEFAULT_DEV_ORIGINS), False)

    return origins, False


class InMemoryRateLimiter:
    """Thread-safe sliding-window per-IP rate limiter."""

    def __init__(
        self,
        default_limit: int = 120,
        expensive_limit: int = 30,
        window_seconds: int = 60,
    ) -> None:
        self.default_limit = max(1, default_limit)
        self.expensive_limit = max(1, expensive_limit)
        self.window_seconds = max(1, window_seconds)
        self._buckets: Dict[Tuple[str, str], Deque[float]] = {}
        self._lock = threading.Lock()
        self._last_prune = time.monotonic()

    def _prune_stale(self, now: float) -> None:
        if now - self._last_prune < self.window_seconds:
            return
        cutoff = now - self.window_seconds
        stale_keys = [k for k, dq in self._buckets.items() if not dq or dq[-1] <= cutoff]
        for k in stale_keys:
            del self._buckets[k]
        self._last_prune = now

    def check(self, client_ip: str, tier: str) -> Tuple[bool, int, int, int]:
        """
        Check whether a request is allowed.
        Returns (allowed, limit, remaining, retry_after_seconds).
        """
        limit = self.expensive_limit if tier == "expensive" else self.default_limit
        now = time.monotonic()
        cutoff = now - self.window_seconds
        bucket_key = (client_ip, tier)

        with self._lock:
            self._prune_stale(now)
            dq = self._buckets.get(bucket_key)
            if dq is None:
                dq = deque()
                self._buckets[bucket_key] = dq

            while dq and dq[0] <= cutoff:
                dq.popleft()

            if len(dq) >= limit:
                retry_after = max(1, int(self.window_seconds - (now - dq[0])) + 1)
                return False, limit, 0, retry_after

            dq.append(now)
            remaining = max(0, limit - len(dq))
            return True, limit, remaining, 0

    def reset(self) -> None:
        with self._lock:
            self._buckets.clear()


def _int_env(name: str, default: int) -> int:
    try:
        val = int(os.getenv(name, str(default)).strip())
        return val if val > 0 else default
    except ValueError:
        return default


def _bool_env(name: str, default: bool) -> bool:
    raw = os.getenv(name, "").strip().lower()
    if raw in ("1", "true", "yes", "on"):
        return True
    if raw in ("0", "false", "no", "off"):
        return False
    return default


def extract_client_ip(headers: Headers, peer_host: str | None) -> str:
    """
    Extract client IP safely behind a reverse proxy (e.g. Render).
    Uses the rightmost trusted hop from X-Forwarded-For (ips[-TRUSTED_PROXY_HOPS])
    so client-supplied leftmost X-Forwarded-For values cannot spoof the IP.
    """
    if _bool_env("TRUST_PROXY_HEADERS", True):
        xff = headers.get("x-forwarded-for", "").strip()
        if xff:
            ips = [part.strip() for part in xff.split(",") if part.strip()]
            if ips:
                hops = _int_env("TRUSTED_PROXY_HOPS", 1)
                idx = max(0, len(ips) - hops)
                return ips[idx]
    return peer_host or "unknown"


def _classify_tier(path: str) -> str:
    normalized = posixpath.normpath(path) if path else "/"
    # Preserve trailing slash semantics for marker matching
    if path.endswith("/") and not normalized.endswith("/"):
        normalized += "/"
    for marker in _EXPENSIVE_PATH_MARKERS:
        if marker in normalized:
            return "expensive"
    return "default"


# Shared singleton so tests can inspect/reset state cleanly
rate_limiter = InMemoryRateLimiter(
    default_limit=_int_env("RATE_LIMIT_DEFAULT_PER_MINUTE", 120),
    expensive_limit=_int_env("RATE_LIMIT_EXPENSIVE_PER_MINUTE", 30),
    window_seconds=_int_env("RATE_LIMIT_WINDOW_SECONDS", 60),
)


class SecurityMiddleware:
    """
    Pure ASGI middleware enforcing:
    - URL length bounds (414)
    - Streaming request body size bounds across Content-Length & chunked encoding (413)
    - Per-IP sliding-window rate limiting (429)
    - Baseline security headers
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = Headers(scope=scope)
        path = scope.get("path", "/")
        query = scope.get("query_string", b"").decode("latin-1")
        full_uri_len = len(path) + (1 + len(query) if query else 0)

        # 1. URL length check
        max_url_len = _int_env("MAX_URL_LENGTH", 2048)
        if full_uri_len > max_url_len:
            resp = JSONResponse({"detail": "Request URI too long."}, status_code=414)
            await resp(scope, receive, send)
            return

        # 2. Content-Length pre-check
        max_body_bytes = _int_env("MAX_REQUEST_BODY_BYTES", 1_048_576)
        content_length = headers.get("content-length")
        if content_length is not None:
            try:
                if int(content_length) > max_body_bytes:
                    resp = JSONResponse({"detail": "Request payload too large."}, status_code=413)
                    await resp(scope, receive, send)
                    return
            except ValueError:
                resp = JSONResponse({"detail": "Invalid Content-Length header."}, status_code=400)
                await resp(scope, receive, send)
                return

        # 3. Per-IP rate limiting (skip CORS preflight OPTIONS)
        rate_headers: Dict[str, str] = {}
        method = scope.get("method", "GET").upper()
        if method != "OPTIONS" and _bool_env("RATE_LIMIT_ENABLED", True):
            peer = scope.get("client")
            peer_host = peer[0] if peer else None
            client_ip = extract_client_ip(headers, peer_host)
            tier = _classify_tier(path)
            allowed, limit, remaining, retry_after = rate_limiter.check(client_ip, tier)
            rate_headers = {
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": str(remaining),
            }
            if not allowed:
                resp = JSONResponse(
                    {"detail": "Rate limit exceeded. Please try again later."},
                    status_code=429,
                    headers={**rate_headers, "Retry-After": str(retry_after)},
                )
                await resp(scope, receive, send)
                return

        # 4. Streamed body size enforcement (blocks chunked / omitted Content-Length)
        bytes_received = 0
        body_too_large = False
        response_started = False

        async def limited_receive() -> Message:
            nonlocal bytes_received, body_too_large
            message = await receive()
            if message["type"] == "http.request":
                chunk = message.get("body", b"")
                bytes_received += len(chunk)
                if bytes_received > max_body_bytes:
                    body_too_large = True
                    raise _RequestBodyTooLarge()
            return message

        async def send_with_headers(message: Message) -> None:
            nonlocal response_started
            if body_too_large:
                return
            if message["type"] == "http.response.start":
                response_started = True
                hdrs = MutableHeaders(scope=message)
                for k, v in rate_headers.items():
                    hdrs.setdefault(k, v)
                hdrs.setdefault("X-Content-Type-Options", "nosniff")
                hdrs.setdefault("X-Frame-Options", "DENY")
                hdrs.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
            await send(message)

        try:
            await self.app(scope, limited_receive, send_with_headers)
        except _RequestBodyTooLarge:
            pass

        if body_too_large and not response_started:
            resp = JSONResponse({"detail": "Request payload too large."}, status_code=413)
            await resp(scope, receive, send_with_headers_or_raw := (lambda m: send(m)))
