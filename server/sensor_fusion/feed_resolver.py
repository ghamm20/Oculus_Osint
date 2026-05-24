from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Literal

from .stream_schema import EvidenceEntity

FeedMethod = Literal[
    "iframe_embed",
    "hls_video",
    "mjpeg_video",
    "rtsp_proxy_required",
    "snapshot_only",
    "audio_stream",
    "source_page_only",
    "unavailable",
    "blocked",
]
FeedStatus = Literal["playable", "source-page-only", "unavailable", "blocked", "api-required"]


@dataclass
class FeedResolution:
    entity_id: str
    provider: str
    source_type: str
    title: str
    method: FeedMethod
    status: FeedStatus
    playable: bool
    viewable: bool
    live_url: str | None
    embed_url: str | None
    thumbnail_url: str | None
    snapshot_url: str | None
    source_page_url: str | None
    failure_reason: str | None
    diagnostics: dict

    def to_dict(self) -> dict:
        return asdict(self)


def _lower(value: str | None) -> str:
    return (value or "").strip().lower()


def _is_hls(url: str | None) -> bool:
    return ".m3u8" in _lower(url)


def _is_mjpeg(url: str | None) -> bool:
    value = _lower(url)
    return "mjpeg" in value or ".mjpg" in value or "axis-cgi/mjpg" in value


def _is_snapshot(url: str | None) -> bool:
    value = _lower(url)
    return any(ext in value for ext in [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", "snapshot", "/image?"])


def resolve_feed(entity: EvidenceEntity) -> FeedResolution:
    method: FeedMethod = "unavailable"
    status: FeedStatus = "unavailable"
    reason: str | None = "No live URL, embed URL, thumbnail, or source page is available."

    if entity.legal_status == "blocked" or entity.source_type == "blocked":
        method, status, reason = "blocked", "blocked", "Provider is blocked for authorization or privacy reasons."
    elif entity.embed_url:
        method, status, reason = "iframe_embed", "playable", None
    elif entity.live_url and _lower(entity.live_url).startswith("rtsp://"):
        method, status, reason = "rtsp_proxy_required", "unavailable", "RTSP requires a configured local proxy."
    elif entity.source_type == "audio" and entity.live_url:
        method, status, reason = "audio_stream", "playable", None
    elif _is_hls(entity.live_url):
        method, status, reason = "hls_video", "playable", None
    elif _is_mjpeg(entity.live_url):
        method, status, reason = "mjpeg_video", "playable", None
    elif _is_snapshot(entity.live_url) or entity.thumbnail_url:
        method, status, reason = "snapshot_only", "playable", None
    elif entity.legal_status == "api_required":
        method, status, reason = "source_page_only", "api-required", "Provider requires API approval or credentials."
    elif entity.source_page_url:
        method, status, reason = "source_page_only", "source-page-only", "No direct playable URL is available; use source page."

    snapshot_url = entity.thumbnail_url or (entity.live_url if method == "snapshot_only" else None)
    diagnostics = {
        "has_live_url": bool(entity.live_url),
        "has_embed_url": bool(entity.embed_url),
        "has_thumbnail": bool(snapshot_url),
        "can_iframe": method == "iframe_embed",
        "can_play_hls": method == "hls_video",
        "can_play_mjpeg": method == "mjpeg_video",
        "audio_playable": method == "audio_stream",
        "source_page_available": bool(entity.source_page_url),
        "last_tested": datetime.now(timezone.utc).isoformat(),
        "test_result": status,
        "failure_reason": reason,
    }
    return FeedResolution(
        entity_id=entity.id,
        provider=entity.provider,
        source_type=entity.source_type,
        title=entity.title,
        method=method,
        status=status,
        playable=status == "playable",
        viewable=status in ["playable", "source-page-only", "api-required"],
        live_url=entity.live_url,
        embed_url=entity.embed_url,
        thumbnail_url=entity.thumbnail_url,
        snapshot_url=snapshot_url,
        source_page_url=entity.source_page_url,
        failure_reason=reason,
        diagnostics=diagnostics,
    )
