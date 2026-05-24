from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

SourceType = Literal[
    "webcam",
    "traffic_camera",
    "audio",
    "ais",
    "adsb",
    "weather",
    "wildfire",
    "earthquake",
    "rf_presence",
    "generic_stream",
    "manual",
    "blocked",
]
LegalStatus = Literal["approved", "user_added", "api_required", "blocked", "unknown"]
Severity = Literal["info", "low", "medium", "high", "critical"]


@dataclass
class NormalizedLiveSource:
    id: str
    source_id: str
    provider: str
    source_type: SourceType
    title: str
    description: str | None
    lat: float | None
    lon: float | None
    alt: float | None = None
    heading: float | None = None
    speed: float | None = None
    status: str | None = "active"
    severity: Severity | None = "info"
    confidence: float = 0.5
    trust_score: float = 0.5
    freshness_score: float = 1.0
    last_seen: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    first_seen: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expires_at: str | None = None
    thumbnail_url: str | None = None
    live_url: str | None = None
    embed_url: str | None = None
    source_page_url: str | None = None
    requires_user_click: bool = True
    legal_status: LegalStatus = "unknown"
    tags: list[str] = field(default_factory=list)
    raw: dict[str, Any] = field(default_factory=dict)
    diagnostics: dict[str, Any] = field(default_factory=dict)


class LiveSourcePlugin:
    provider_id: str = "base"
    display_name: str = "Base live source"
    source_type: SourceType = "webcam"
    requires_api_key: bool = False
    terms_url: str = ""
    min_refresh_seconds: int = 60
    rate_limit_policy: dict[str, Any] = {"min_refresh_seconds": 60}
    failure_policy: dict[str, Any] = {
        "mark_stale_after_failures": 2,
        "backoff_multiplier": 2,
        "max_backoff_seconds": 300,
    }

    async def fetch_catalog(self) -> list[NormalizedLiveSource]:
        return []

    async def fetch_updates(self, since_timestamp: str | None = None) -> list[NormalizedLiveSource]:
        return await self.fetch_catalog()

    def normalize_item(self, raw: Any) -> NormalizedLiveSource | None:
        raise NotImplementedError

    async def get_live_url(self, item_id: str) -> dict[str, Any]:
        return {
            "item_id": item_id,
            "live_url": None,
            "embed_url": None,
            "source_page_url": self.terms_url,
            "requires_user_click": True,
            "legal_status": "unknown",
            "diagnostics": {"reason": "Provider exposes source-page handoff only."},
        }

    async def healthcheck(self) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        return {
            "provider_id": self.provider_id,
            "display_name": self.display_name,
            "source_type": self.source_type,
            "requires_api_key": self.requires_api_key,
            "terms_url": self.terms_url,
            "status": "degraded",
            "last_refresh": now.isoformat(),
            "next_refresh": (now + timedelta(seconds=self.min_refresh_seconds)).isoformat(),
            "refresh_interval_seconds": self.min_refresh_seconds,
            "message": "Python provider contract loaded; Next.js runtime adapter owns production ingestion.",
        }
