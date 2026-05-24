from __future__ import annotations

import secrets

from .stream_schema import EvidenceEntity, SensorEvent, utc_now


def make_id(prefix: str) -> str:
    return f"{prefix}:{secrets.token_hex(6)}"


def location_label(entity: EvidenceEntity) -> str | None:
    if entity.lat is not None and entity.lon is not None:
        return f"{entity.lat:.3f}, {entity.lon:.3f}"
    return None


def event_from_entity(event_type: str, entity: EvidenceEntity, summary: str) -> SensorEvent:
    return SensorEvent(
        id=make_id(event_type),
        type=event_type,
        entity_id=entity.id,
        provider=entity.provider,
        title=entity.title,
        summary=summary,
        severity=entity.severity or "info",
        confidence=entity.confidence,
        created_at=utc_now(),
        location=location_label(entity),
        payload={"entity": entity.__dict__},
    )
