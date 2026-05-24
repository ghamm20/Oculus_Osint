from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
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
Severity = Literal["info", "low", "medium", "high", "critical"]
LegalStatus = Literal["approved", "user_added", "api_required", "blocked", "unknown"]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class EvidenceEntity:
    id: str
    source_id: str
    provider: str
    source_type: SourceType
    title: str
    description: str | None = None
    lat: float | None = None
    lon: float | None = None
    alt: float | None = None
    heading: float | None = None
    speed: float | None = None
    status: str | None = "active"
    severity: Severity | None = "info"
    confidence: float = 0.5
    trust_score: float = 0.5
    freshness_score: float = 1.0
    last_seen: str = field(default_factory=utc_now)
    first_seen: str = field(default_factory=utc_now)
    updated_at: str = field(default_factory=utc_now)
    expires_at: str | None = None
    source_page_url: str | None = None
    live_url: str | None = None
    embed_url: str | None = None
    thumbnail_url: str | None = None
    requires_user_click: bool = True
    legal_status: LegalStatus = "unknown"
    tags: list[str] = field(default_factory=list)
    raw: dict[str, Any] = field(default_factory=dict)
    diagnostics: dict[str, Any] = field(default_factory=dict)


@dataclass
class ProviderHealth:
    provider_id: str
    display_name: str
    source_type: SourceType
    health: str
    requires_api_key: bool
    terms_url: str
    entity_count: int = 0
    stale_count: int = 0
    refresh_interval_seconds: int = 60
    last_refresh: str | None = None
    next_refresh: str | None = None
    error_state: str | None = None
    message: str = ""
    diagnostics: dict[str, Any] = field(default_factory=dict)


@dataclass
class SensorEvent:
    id: str
    type: str
    title: str
    summary: str
    severity: Severity = "info"
    confidence: float = 0.5
    created_at: str = field(default_factory=utc_now)
    entity_id: str | None = None
    provider: str | None = None
    location: str | None = None
    payload: dict[str, Any] = field(default_factory=dict)
