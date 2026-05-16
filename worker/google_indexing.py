"""
Google Indexing API — notify Google about new/updated SEO pages.
Uses Service Account JWT auth (no external google-auth library needed).
"""
import json
import logging
import os
import time
import base64
import hashlib
import hmac
from typing import Literal

import httpx

logger = logging.getLogger(__name__)

KEY_PATH = os.getenv("GOOGLE_INDEXING_KEY_PATH", "")
INDEXING_ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish"
TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
SCOPE = "https://www.googleapis.com/auth/indexing"


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _make_jwt(credentials: dict) -> str:
    now = int(time.time())
    header = _b64(json.dumps({"alg": "RS256", "typ": "JWT"}).encode())
    payload = _b64(json.dumps({
        "iss": credentials["client_email"],
        "scope": SCOPE,
        "aud": TOKEN_ENDPOINT,
        "iat": now,
        "exp": now + 3600,
    }).encode())
    msg = f"{header}.{payload}".encode()

    # Sign with RSA private key using cryptography library
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding

    private_key = serialization.load_pem_private_key(
        credentials["private_key"].encode(), password=None
    )
    signature = private_key.sign(msg, padding.PKCS1v15(), hashes.SHA256())
    return f"{header}.{payload}.{_b64(signature)}"


async def _get_access_token(credentials: dict) -> str:
    jwt = _make_jwt(credentials)
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(TOKEN_ENDPOINT, data={
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": jwt,
        })
        resp.raise_for_status()
        return resp.json()["access_token"]


async def notify_google(url: str, type: Literal["URL_UPDATED", "URL_DELETED"] = "URL_UPDATED") -> None:
    """Submit URL to Google Indexing API. Safe to call — logs warning on any error."""
    if not KEY_PATH:
        logger.debug("[google_indexing] GOOGLE_INDEXING_KEY_PATH not set, skipping")
        return

    try:
        with open(KEY_PATH) as f:
            credentials = json.load(f)

        token = await _get_access_token(credentials)

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                INDEXING_ENDPOINT,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={"url": url, "type": type},
            )
            if resp.status_code in (200, 202):
                logger.info(f"[google_indexing] {resp.status_code} — {url}")
            else:
                logger.warning(f"[google_indexing] {resp.status_code}: {resp.text[:200]}")

    except Exception as e:
        logger.warning(f"[google_indexing] error (non-critical): {e}")
