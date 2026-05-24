from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal

SourceType = Literal["webcam", "traffic_camera", "audio", "ais", "blocked"]
LegalStatus = Literal["approved", "api_required", "blocked", "unknown"]


@dataclass
class NormalizedLiveSource:
    id: str
    provider: str
    type: SourceType
    title: str
    description: str | None
    lat: float | None
    lon: float | None
    city: str | None
    state: str | None
    country: str | None
    thumbnail_url: str | None
    live_url: str | None
    embed_url: str | None
    source_page_url: str
    refresh_seconds: int
    requires_user_click: bool
    legal_status: LegalStatus
    last_checked: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    diagnostics: dict[str, Any] = field(default_factory=dict)


class LiveSourcePlugin:
    provider_id: str = "base"
    display_name: str = "Base live source"
    source_type: SourceType = "webcam"
    requires_api_key: bool = False
    terms_url: str = ""

    async def fetch_catalog(self) -> list[NormalizedLiveSource]:
        return []

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
        return {
            "provider_id": self.provider_id,
            "display_name": self.display_name,
            "source_type": self.source_type,
            "requires_api_key": self.requires_api_key,
            "terms_url": self.terms_url,
            "status": "degraded",
            "message": "Python provider contract loaded; Next.js runtime adapter owns production ingestion.",
        }
